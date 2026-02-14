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
import { Send, MessageSquare, FileText, Sparkles, RefreshCcw, CheckCircle2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const TestMessageSchema = z.object({
  provider: z.enum(providers, {
    required_error: 'الرجاء اختيار مزود خدمة.',
  }),
  to: z.string().min(1, 'رقم المستلم مطلوب.'),
  body: z.string().optional(),
  messageType: z.enum(['TEXT', 'TEMPLATE']),
  templateId: z.string().optional(),
  variables: z.record(z.string()).optional(),
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

export function TestingClient() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [request, setRequest] = useState<string | null>(null);
  const [response, setResponse] = useState<string | null>(null);
  const [history, setHistory] = useState<TestRun[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const [messageType, setMessageType] = useState<'TEXT' | 'TEMPLATE'>('TEXT');

  const form = useForm<TestMessageForm>({
    resolver: zodResolver(TestMessageSchema),
    defaultValues: {
      provider: 'meta',
      to: '967774577134',
      body: 'رسالة اختبار من بنك عدن الأول',
      messageType: 'TEXT',
      variables: {},
    },
  });

  const loadTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/templates');
      const data = await res.json();
      setTemplates(data);
    } catch (err) {
      console.error('Failed to load templates', err);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleTemplateChange = (templateId: string) => {
    const template = templates.find(t => t.name === templateId);
    setSelectedTemplate(template);

    // Initialize variables
    const vars: Record<string, string> = {};
    if (template) {
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

        // Also add variables from variables array if defined
        if (template.variables) {
            template.variables.forEach((v: string) => {
                vars[v] = vars[v] || '';
            });
        }
    }
    form.setValue('variables', vars);
  };

  const prefillExample = () => {
    if (!selectedTemplate) return;

    const components = typeof selectedTemplate.components === 'string' ? JSON.parse(selectedTemplate.components) : selectedTemplate.components;
    const bodyComponent = components.find((c: any) => c.type.toUpperCase() === 'BODY');

    if (bodyComponent && bodyComponent.example && bodyComponent.example.body_text && bodyComponent.example.body_text[0]) {
      const examples = bodyComponent.example.body_text[0];
      const vars = { ...form.getValues('variables') };

      // Map examples to placeholders {{1}}, {{2}}... or named placeholders
      const text = bodyComponent.text || '';
      const placeholders = text.match(/{{(\w+)}}/g) || [];

      placeholders.forEach((p: string, i: number) => {
        const name = p.replace(/{{|}}/g, '');
        if (examples[i]) {
          vars[name] = examples[i];
        }
      });

      // Also handle positional parameters if they are not in the text but in metadata
      if (placeholders.length === 0 && Array.isArray(examples)) {
          examples.forEach((ex, i) => {
              vars[(i + 1).toString()] = ex;
          });
      }

      form.setValue('variables', vars);
      toast({ title: 'تم الملء التلقائي', description: 'تم تعبئة المتغيرات ببيانات مثال من القالب.' });
    } else {
        toast({ title: 'عذراً', description: 'لا يوجد مثال متاح لهذا القالب.', variant: 'outline' });
    }
  };

  const generateCurl = (data: TestMessageForm) => {
    const payload: any = {
      provider: data.provider,
      messageType: data.messageType,
      to: data.to,
      meta: {
        sourceSystem: 'DashboardTester',
        companyId: 'FAB',
        txnId: `TEST-${Date.now()}`,
        accountNo: 'ADMIN-TEST',
        eventType: 'OTHER',
        timestamp: new Date().toISOString(),
      },
    };

    if (data.messageType === 'TEXT') {
      payload.body = data.body;
    } else {
      payload.templateId = data.templateId;
      payload.variables = data.variables;
    }

    const curl = `curl -X POST ${typeof window !== 'undefined' ? window.location.origin : ''}/api/whatsapp/send \\
-H "Content-Type: application/json" \\
-d '${JSON.stringify(payload, null, 2)}'`;
    return { curl, payload };
  };

  const onSubmit = async (data: TestMessageForm) => {
    setIsSubmitting(true);
    const { curl, payload } = generateCurl(data);
    setRequest(curl);
    setResponse(null);

    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      setResponse(JSON.stringify(result, null, 2));

      const newTestRun: TestRun = {
        id: payload.meta.txnId,
        provider: data.provider,
        to: data.to,
        request: payload,
        response: result,
        status: result.success ? 'success' : 'failed',
        timestamp: new Date().toISOString(),
      };
      setHistory([newTestRun, ...history.slice(0, 4)]);

      toast({
        title: result.success ? 'تم الإرسال بنجاح' : 'فشل الإرسال',
        description: result.success ? 'تم إرسال رسالة الاختبار بنجاح.' : result.errorMessage || 'حدث خطأ في مزود الخدمة.',
        variant: result.success ? 'default' : 'destructive',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Could not send test message.';
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
              منصة الاختبار الاحترافية
            </CardTitle>
            <CardDescription>
              قم بتجربة إرسال الرسائل عبر قوالب ميتا أو رسائل نصية مباشرة بكل سهولة.
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
                      قالب (MTM)
                    </TabsTrigger>
                  </TabsList>

                  <div className="mt-6 space-y-5">
                    <div className="grid grid-cols-2 gap-4">
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
                            <FormLabel className="font-bold">رقم المستلم</FormLabel>
                            <FormControl>
                              <Input dir="ltr" className="h-11" placeholder="967774577134" {...field} />
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
                        <FormField
                          control={form.control}
                          name="templateId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-bold flex items-center justify-between">
                                القالب المعتمد
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  type="button"
                                  onClick={loadTemplates}
                                  className="h-6 text-xs text-primary"
                                >
                                  <RefreshCcw className="w-3 h-3 ml-1" />
                                  تحديث
                                </Button>
                              </FormLabel>
                              <Select onValueChange={(val) => {
                                  field.onChange(val);
                                  handleTemplateChange(val);
                              }} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-11 border-primary/30 focus:ring-primary">
                                    <SelectValue placeholder="اختر من القوالب المسجلة" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {templates.map((t, idx) => (
                                  <SelectItem key={`template-${t.id || t.name || idx}`} value={t.name}>
                                      <div className="flex items-center justify-between w-full gap-8">
                                        <span>{t.name}</span>
                                        <Badge variant="outline" className="text-[10px] uppercase">{t.language}</Badge>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {selectedTemplate && (
                          <div className="space-y-4 p-5 border rounded-xl bg-primary/5 border-primary/20 shadow-inner">
                            <div className="flex items-center justify-between border-b border-primary/10 pb-2 mb-3">
                                <h4 className="text-sm font-bold flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-primary" />
                                    تعبئة متغيرات القالب
                                </h4>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={prefillExample}
                                    className="h-8 text-xs font-bold"
                                >
                                    <Sparkles className="w-3 h-3 ml-1" />
                                    تعبئة بمثال
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {Object.keys(form.getValues('variables') || {}).map((varName) => (
                                    <div key={varName} className="space-y-1.5">
                                        <label className="text-xs font-semibold text-muted-foreground mr-1">
                                            {varName}
                                        </label>
                                        <Input
                                            placeholder={`أدخل قيمة...`}
                                            className="h-9 bg-background focus:border-primary"
                                            value={(form.getValues('variables') as any)?.[varName] || ''}
                                            onChange={(e) => {
                                                const vars = { ...form.getValues('variables') };
                                                vars[varName] = e.target.value;
                                                form.setValue('variables', vars);
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>

                            {Object.keys(form.getValues('variables') || {}).length === 0 && (
                                <p className="text-xs text-muted-foreground text-center italic py-2">
                                    هذا القالب لا يحتوي على متغيرات.
                                </p>
                            )}
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </div>
                </Tabs>
              </CardContent>
              <CardFooter className="bg-muted/30 border-t p-6">
                <Button type="submit" disabled={isSubmitting} className="w-full h-12 text-lg font-bold shadow-md hover:shadow-lg transition-all">
                  <Send className={cn("ml-2 w-5 h-5", isSubmitting && "animate-pulse")} />
                  {isSubmitting ? 'جاري معالجة الإرسال...' : 'إرسال الاختبار الآن'}
                </Button>
              </CardFooter>
            </form>
          </FormProvider>
        </Card>
        <TestHistory history={history} />
      </div>

      <div className="space-y-6">
        <CodeBlock
            title="طلب الـ API (cURL)"
            code={request}
            placeholder="سيظهر هيكل طلب الـ API هنا بصيغة cURL بعد الإرسال."
        />
        <CodeBlock
            title="استجابة المزود (JSON)"
            code={response}
            placeholder="ستظهر استجابة مزود الخدمة هنا لتحليل أي أخطاء."
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
                <p className="text-xs text-yellow-700 dark:text-yellow-500 leading-relaxed">
                    يتم تحويل الرسائل النصية تلقائياً إلى قوالب إشعارات عند استخدام مزود Meta لضمان الوصول للمستلمين خارج نافذة الـ 24 ساعة. يمكنك رؤية هذا التحويل في قسم "الطلب" أعلاه.
                </p>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
