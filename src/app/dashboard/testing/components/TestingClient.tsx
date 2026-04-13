'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { providers, type Provider, type ProviderResult } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { CodeBlock } from './CodeBlock';
import { TestHistory } from './TestHistory';
import { Send, MessageSquare, FileText, Sparkles, RefreshCcw, CheckCircle2, Lock, Plus, Trash2, Users } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const TestMessageSchema = z.object({
  provider: z.enum(providers, {
    required_error: 'الرجاء اختيار مزود خدمة.',
  }),
  to: z.string().min(1, 'رقم المستلم مطلوب. يمكنك إدخال أرقام متعددة مفصولة بفاصلة.'),
  body: z.string().optional(),
  messageType: z.enum(['TEXT', 'TEMPLATE']),
});

type TestMessageForm = z.infer<typeof TestMessageSchema>;

export type TestRun = {
  id: string;
  provider: Provider;
  to: string;
  request: any;
  response: any;
  status: 'success' | 'failed';
  timestamp: string;
};

type SelectedTemplate = {
    id: string;
    name: string;
    variables: Record<string, string>;
    language: string;
};

export function TestingClient() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [request, setRequest] = useState<string | null>(null);
  const [response, setResponse] = useState<string | null>(null);
  const [history, setHistory] = useState<TestRun[]>([]);
  const [availableTemplates, setAvailableTemplates] = useState<any[]>([]);
  const [selectedTemplates, setSelectedTemplates] = useState<SelectedTemplate[]>([]);
  const [messageType, setMessageType] = useState<'TEXT' | 'TEMPLATE'>('TEXT');

  const form = useForm<TestMessageForm>({
    resolver: zodResolver(TestMessageSchema),
    defaultValues: {
      provider: 'meta',
      to: '967774577134',
      body: 'رسالة اختبار من بنك عدن الأول',
      messageType: 'TEXT',
    },
  });

  const loadTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/templates');
      const data = await res.json();
      setAvailableTemplates(data);
    } catch (err) {
      console.error('Failed to load templates', err);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const addTemplateToBatch = (templateName: string) => {
    const template = availableTemplates.find(t => t.name === templateName);
    if (!template) return;

    const vars: Record<string, string> = {};
    const components = typeof template.components === 'string' ? JSON.parse(template.components) : template.components;
    components.forEach((c: any) => {
        if (c.text) {
            const matches = c.text.match(/{{(\w+)}}/g);
            if (matches) {
                matches.forEach((m: string) => {
                    const vName = m.replace(/{{|}}/g, '');
                    vars[vName] = '';
                });
            }
        }
    });
    
    if (template.variables) {
        template.variables.forEach((v: string) => {
            vars[v] = vars[v] || '';
        });
    }

    const newSelected: SelectedTemplate = {
        id: crypto.randomUUID(),
        name: template.name,
        variables: vars,
        language: template.language
    };

    setSelectedTemplates([...selectedTemplates, newSelected]);
  };

  const removeTemplateFromBatch = (id: string) => {
    setSelectedTemplates(selectedTemplates.filter(t => t.id !== id));
  };

  const updateVariable = (templateId: string, varName: string, value: string) => {
    setSelectedTemplates(selectedTemplates.map(t => {
        if (t.id === templateId) {
            return { ...t, variables: { ...t.variables, [varName]: value } };
        }
        return t;
    }));
  };

  const prefillTemplateExample = (templateId: string) => {
    const selected = selectedTemplates.find(t => t.id === templateId);
    if (!selected) return;

    const template = availableTemplates.find(t => t.name === selected.name);
    if (!template) return;

    const components = typeof template.components === 'string' ? JSON.parse(template.components) : template.components;
    const bodyComponent = components.find((c: any) => c.type.toUpperCase() === 'BODY');
    
    if (bodyComponent && bodyComponent.example && bodyComponent.example.body_text && bodyComponent.example.body_text[0]) {
      const examples = bodyComponent.example.body_text[0];
      const vars = { ...selected.variables };
      
      const text = bodyComponent.text || '';
      const placeholders = text.match(/{{(\w+)}}/g) || [];
      
      placeholders.forEach((p: string, i: number) => {
        const name = p.replace(/{{|}}/g, '');
        if (examples[i]) {
          vars[name] = examples[i];
        }
      });

      if (placeholders.length === 0 && Array.isArray(examples)) {
          examples.forEach((ex, i) => {
              vars[(i + 1).toString()] = ex;
          });
      }
      
      setSelectedTemplates(selectedTemplates.map(t => t.id === templateId ? { ...t, variables: vars } : t));
      toast({ title: 'تم الملء التلقائي', description: `تم تعبئة متغيرات ${selected.name} ببيانات مثال.` });
    } else {
        toast({ title: 'عذراً', description: 'لا يوجد مثال متاح لهذا القالب.', variant: 'outline' });
    }
  };

  const onSubmit = async (data: TestMessageForm) => {
    setIsSubmitting(true);
    setRequest(null);
    setResponse(null);

    const recipients = data.to.split(/[,\s]+/).filter(r => r.trim().length > 0);
    const results: any[] = [];
    let lastRequest: any = null;

    try {
      if (data.messageType === 'TEXT') {
        for (const recipient of recipients) {
          const payload = {
            provider: data.provider,
            messageType: 'TEXT',
            to: recipient,
            body: data.body,
            meta: {
              sourceSystem: 'DashboardTester',
              companyId: 'FAB',
              txnId: `TEST-${Date.now()}-${recipient}`,
              accountNo: 'ADMIN-TEST',
              eventType: 'OTHER' as const,
              timestamp: new Date().toISOString(),
            },
          };
          lastRequest = payload;
          const res = await fetch('/api/whatsapp/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const result = await res.json();
          results.push({ recipient, result, payload });
        }
      } else {
        if (selectedTemplates.length === 0) {
            toast({ title: 'خطأ', description: 'الرجاء اختيار قالب واحد على الأقل للاختبار.', variant: 'destructive' });
            setIsSubmitting(false);
            return;
        }

        for (const recipient of recipients) {
            for (const st of selectedTemplates) {
                const payload = {
                    provider: data.provider,
                    messageType: 'TEMPLATE',
                    to: recipient,
                    templateId: st.name,
                    variables: st.variables,
                    meta: {
                        sourceSystem: 'DashboardTester',
                        companyId: 'FAB',
                        txnId: `TEST-${Date.now()}-${recipient}-${st.name}`,
                        accountNo: 'ADMIN-TEST',
                        eventType: 'OTHER' as const,
                        timestamp: new Date().toISOString(),
                    },
                };
                lastRequest = payload;
                const res = await fetch('/api/whatsapp/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                const result = await res.json();
                results.push({ recipient, template: st.name, result, payload });
            }
        }
      }

      setResponse(JSON.stringify(results, null, 2));
      
      const curl = `curl -X POST ${typeof window !== 'undefined' ? window.location.origin : ''}/api/whatsapp/send \\
-H "Content-Type: application/json" \\
-d '${JSON.stringify(lastRequest, null, 2)}'`;
      setRequest(curl);

      // Add last few runs to history
      const newHistoryEntries = results.map(r => ({
        id: r.payload.meta.txnId,
        provider: data.provider,
        to: r.recipient,
        request: r.payload,
        response: r.result,
        status: r.result.success ? 'success' as const : 'failed' as const,
        timestamp: new Date().toISOString(),
      }));
      setHistory([...newHistoryEntries, ...history].slice(0, 10));

      const successCount = results.filter(r => r.result.success).length;
      toast({
        title: successCount === results.length ? 'تم الإرسال بنجاح' : 'تم الإرسال جزئياً',
        description: `تم إرسال ${successCount} من أصل ${results.length} رسالة اختبار بنجاح.`,
        variant: successCount === results.length ? 'default' : 'destructive',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Could not send test messages.';
      setResponse(JSON.stringify({ error: errorMessage }, null, 2));
      toast({
        variant: 'destructive',
        title: 'خطأ في الاتصال',
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
      <div className="space-y-6">
        <Card className="shadow-lg border-primary/20">
          <CardHeader className="bg-primary/5 border-b pb-4">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Sparkles className="text-primary h-6 w-6" />
              منصة الاختبار المتقدمة
            </CardTitle>
            <CardDescription>
              أرسل رسائل اختبار إلى وجهات متعددة باستخدام قوالب متنوعة في عملية واحدة.
            </CardDescription>
          </CardHeader>
          <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-6 pt-6">
                <Tabs defaultValue="TEXT" className="w-full" onValueChange={(v) => {
                    setMessageType(v as 'TEXT' | 'TEMPLATE');
                    form.setValue('messageType', v as 'TEXT' | 'TEMPLATE');
                }}>
                  <TabsList className="grid w-full grid-cols-2 h-12">
                    <TabsTrigger value="TEXT" className="text-lg">
                      <MessageSquare className="w-5 h-5 ml-2" />
                      رسالة نصية
                    </TabsTrigger>
                    <TabsTrigger value="TEMPLATE" className="text-lg">
                      <FileText className="w-5 h-5 ml-2" />
                      قوالب (MTM)
                    </TabsTrigger>
                  </TabsList>

                  <div className="mt-6 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="provider"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-bold">مزود الخدمة</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-11">
                                  <SelectValue placeholder="اختر مزودًا" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {providers.map((p) => (
                                  <SelectItem key={p} value={p} className="capitalize">
                                    {p}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="to"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-bold flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                أرقام المستلمين (مفصولة بفاصلة)
                            </FormLabel>
                            <FormControl>
                              <Input dir="ltr" className="h-11" placeholder="967774577134, 967771234567" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <TabsContent value="TEXT" className="mt-0 space-y-4 animate-in fade-in duration-300">
                      <FormField
                        control={form.control}
                        name="body"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-bold">محتوى الرسالة النصية</FormLabel>
                            <FormControl>
                              <Textarea 
                                className="min-h-[120px] text-lg leading-relaxed" 
                                placeholder="اكتب الرسالة التي تريد اختبارها هنا..." 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>

                    <TabsContent value="TEMPLATE" className="mt-0 space-y-5 animate-in fade-in duration-300">
                      <div className="flex flex-col gap-4">
                        <div className="flex gap-2">
                            <Select onValueChange={addTemplateToBatch}>
                                <SelectTrigger className="h-11 flex-1">
                                    <SelectValue placeholder="اختر قالباً لإضافته للمجموعة" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableTemplates.map((t, idx) => (
                                        <SelectItem key={`avail-${t.id || t.name || idx}`} value={t.name}>
                                            <div className="flex items-center justify-between w-full gap-8">
                                                <span>{t.name}</span>
                                                <Badge variant="outline" className="text-[10px] uppercase">{t.language}</Badge>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button type="button" variant="outline" size="icon" className="h-11 w-11" onClick={loadTemplates}>
                                <RefreshCcw className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="space-y-4">
                            {selectedTemplates.map((st) => (
                                <Card key={st.id} className="border-primary/20 bg-primary/5">
                                    <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-primary/10">
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-primary">{st.name}</Badge>
                                            <Badge variant="outline" className="uppercase text-[10px]">{st.language}</Badge>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button 
                                                type="button" 
                                                variant="ghost" 
                                                size="sm" 
                                                className="h-7 text-[10px]" 
                                                onClick={() => prefillTemplateExample(st.id)}
                                            >
                                                <Sparkles className="w-3 h-3 ml-1" />
                                                تعبئة مثال
                                            </Button>
                                            <Button 
                                                type="button" 
                                                variant="ghost" 
                                                size="sm" 
                                                className="h-7 text-destructive" 
                                                onClick={() => removeTemplateFromBatch(st.id)}
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {Object.keys(st.variables).map(v => (
                                                <div key={v} className="space-y-1">
                                                    <label className="text-[10px] font-bold text-muted-foreground">{v}</label>
                                                    <Input 
                                                        className="h-8 text-sm"
                                                        value={st.variables[v]}
                                                        onChange={(e) => updateVariable(st.id, v, e.target.value)}
                                                        placeholder="أدخل قيمة..."
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                            {selectedTemplates.length === 0 && (
                                <div className="text-center py-8 border-2 border-dashed rounded-xl opacity-40">
                                    <Plus className="mx-auto h-8 w-8 mb-2" />
                                    <p className="text-sm">لم يتم اختيار أي قوالب بعد.</p>
                                </div>
                            )}
                        </div>
                      </div>
                    </TabsContent>
                  </div>
                </Tabs>
              </CardContent>
              <CardFooter className="bg-muted/30 border-t p-6">
                <Button type="submit" disabled={isSubmitting} className="w-full h-12 text-lg font-bold shadow-md hover:shadow-lg transition-all">
                  <Send className={cn("ml-2 w-5 h-5", isSubmitting && "animate-pulse")} />
                  {isSubmitting ? 'جاري معالجة الإرسال الجماعي...' : 'إرسال مجموعة الاختبار'}
                </Button>
              </CardFooter>
            </form>
          </FormProvider>
        </Card>
        <TestHistory history={history} />
      </div>

      <div className="space-y-6">
        <CodeBlock 
            title="هيكل الطلب الأخير" 
            code={request} 
            placeholder="سيظهر هيكل الطلب هنا بعد الإرسال." 
        />
        <CodeBlock 
            title="نتائج الإرسال الجماعي" 
            code={response} 
            placeholder="ستظهر نتائج الإرسال لكافة الوجهات هنا." 
            isLoading={isSubmitting} 
        />
        
        <Card className="bg-yellow-50 border-yellow-200 dark:bg-yellow-900/10 dark:border-yellow-900/30">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-yellow-800 dark:text-yellow-400">
                    <Lock className="w-4 h-4" />
                    ملاحظة هامة للمبرمجين
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-xs text-yellow-700 dark:text-yellow-500 leading-relaxed font-medium">
                    عند إرسال رسائل اختبار متعددة، سيقوم النظام بإنشاء طلب منفصل لكل رقم ولكل قالب. يمكنك تتبع حالة كل رسالة في شاشة السجلات الرئيسية.
                </p>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
