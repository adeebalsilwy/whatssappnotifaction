'use client';

import { useState, useEffect } from 'react';
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
import { Send, MessageSquare, FileText } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
      body: 'اختباريه من بنك عدن الاول',
      messageType: 'TEXT',
      variables: {},
    },
  });

  useEffect(() => {
    fetch('/api/templates')
      .then(res => res.json())
      .then(data => setTemplates(data))
      .catch(err => console.error('Failed to load templates', err));
  }, []);

  const handleTemplateChange = (templateId: string) => {
    const template = templates.find(t => t.name === templateId);
    setSelectedTemplate(template);

    // Initialize variables
    if (template && template.variables) {
      const vars: Record<string, string> = {};
      template.variables.forEach((v: string) => {
        vars[v] = '';
      });
      form.setValue('variables', vars);
    } else if (template) {
        // Try to find variables from components if not defined
        const components = JSON.parse(typeof template.components === 'string' ? template.components : JSON.stringify(template.components));
        const vars: Record<string, string> = {};
        components.forEach((c: any) => {
            if (c.text) {
                const matches = c.text.match(/{{(\w+)}}/g);
                if (matches) {
                    matches.forEach((m: string) => {
                        vars[m.replace(/{{|}}/g, '')] = '';
                    });
                }
            }
        });
        form.setValue('variables', vars);
    }
  };

  const generateCurl = (data: TestMessageForm) => {
    const payload: any = {
      provider: data.provider,
      messageType: data.messageType,
      to: data.to,
      meta: {
        sourceSystem: 'GatewayTester',
        companyId: 'KSA',
        txnId: `TEST-${Date.now()}`,
        accountNo: '123456789',
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

    const curl = `curl -X POST ${window.location.origin}/api/whatsapp/send \\
-H "Content-Type: application/json" \\
-H "Authorization: Bearer YOUR_TOKEN" \\
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
        description: result.success ? 'تم إرسال رسالة الاختبار.' : result.errorMessage || 'حدث خطأ غير متوقع.',
        variant: result.success ? 'default' : 'destructive',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Could not send test message.';
      setResponse(JSON.stringify({ error: errorMessage }, null, 2));
      toast({
        variant: 'destructive',
        title: 'حدث خطأ في الشبكة',
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>نموذج الاختبار المتقدم</CardTitle>
            <CardDescription>أرسل رسالة نصية أو باستخدام قالب عبر أحد مزودي الخدمة.</CardDescription>
          </CardHeader>
          <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-4">
                <Tabs defaultValue="TEXT" onValueChange={(v) => {
                    setMessageType(v as 'TEXT' | 'TEMPLATE');
                    form.setValue('messageType', v as 'TEXT' | 'TEMPLATE');
                }}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="TEXT">
                      <MessageSquare className="w-4 h-4 ml-2" />
                      رسالة نصية
                    </TabsTrigger>
                    <TabsTrigger value="TEMPLATE">
                      <FileText className="w-4 h-4 ml-2" />
                      قالب (Template)
                    </TabsTrigger>
                  </TabsList>

                  <div className="mt-4 space-y-4">
                    <FormField
                      control={form.control}
                      name="provider"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>مزود الخدمة</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
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
                          <FormLabel>إلى (رقم المستلم)</FormLabel>
                          <FormControl>
                            <Input dir="ltr" placeholder="967774577134" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <TabsContent value="TEXT" className="mt-0 space-y-4">
                      <FormField
                        control={form.control}
                        name="body"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>محتوى الرسالة</FormLabel>
                            <FormControl>
                              <Textarea placeholder="اكتب رسالتك هنا..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>

                    <TabsContent value="TEMPLATE" className="mt-0 space-y-4">
                      <FormField
                        control={form.control}
                        name="templateId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>القالب</FormLabel>
                            <Select onValueChange={(val) => {
                                field.onChange(val);
                                handleTemplateChange(val);
                            }} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="اختر قالبًا" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {templates.map((t) => (
                                  <SelectItem key={t.id} value={t.name}>
                                    {t.name} ({t.language})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {selectedTemplate && (
                        <div className="space-y-3 p-3 border rounded-md bg-muted/30">
                          <p className="text-sm font-medium mb-2">متغيرات القالب:</p>
                          {Object.keys(form.getValues('variables') || {}).map((varName) => (
                            <div key={varName} className="flex flex-col space-y-1">
                              <label className="text-xs text-muted-foreground">{varName}</label>
                              <Input
                                placeholder={`قيمة لـ ${varName}`}
                                onChange={(e) => {
                                  const vars = form.getValues('variables') || {};
                                  vars[varName] = e.target.value;
                                  form.setValue('variables', vars);
                                }}
                              />
                            </div>
                          ))}
                          {Object.keys(form.getValues('variables') || {}).length === 0 && (
                            <p className="text-xs text-muted-foreground italic">لا يوجد متغيرات في هذا القالب.</p>
                          )}
                        </div>
                      )}
                    </TabsContent>
                  </div>
                </Tabs>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isSubmitting} className="w-full">
                  <Send className="ml-2 w-4 h-4" />
                  {isSubmitting ? 'جاري الإرسال...' : 'إرسال رسالة اختبار'}
                </Button>
              </CardFooter>
            </form>
          </FormProvider>
        </Card>
        <TestHistory history={history} />
      </div>

      <div className="space-y-6">
        <CodeBlock title="الطلب (cURL)" code={request} placeholder="سيظهر طلب cURL هنا بعد إرسال الاختبار." />
        <CodeBlock title="الاستجابة (Response)" code={response} placeholder="ستظهر استجابة الـ API هنا." isLoading={isSubmitting} />
      </div>
    </div>
  );
}
