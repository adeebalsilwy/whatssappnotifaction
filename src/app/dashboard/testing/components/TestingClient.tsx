'use client';

import { useState } from 'react';
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
import { Send } from 'lucide-react';

const TestMessageSchema = z.object({
  provider: z.enum(providers, {
    required_error: 'الرجاء اختيار مزود خدمة.',
  }),
  to: z.string().min(1, 'رقم المستلم مطلوب.'),
  body: z.string().min(1, 'محتوى الرسالة مطلوب.'),
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

  const form = useForm<TestMessageForm>({
    resolver: zodResolver(TestMessageSchema),
    defaultValues: {
      provider: 'vonage',
      to: '967774577134',
      body: 'اختباريه من بنك عدن الاول',
    },
  });

  const generateCurl = (data: TestMessageForm) => {
    // A simplified payload for the curl command example
    const payload = {
      provider: data.provider,
      messageType: 'TEXT',
      to: data.to,
      body: data.body,
      meta: {
        sourceSystem: 'GatewayTester',
        companyId: 'KSA',
        txnId: `TEST-${Date.now()}`,
        accountNo: '123456789',
        eventType: 'OTHER',
        timestamp: new Date().toISOString(),
      },
    };

    const curl = `curl -X POST ${window.location.origin}/api/whatsapp/send \\
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
      setHistory([newTestRun, ...history.slice(0, 4)]); // Keep last 5 tests

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
            <CardTitle>نموذج الاختبار</CardTitle>
            <CardDescription>أرسل رسالة اختبار عبر أحد مزودي الخدمة المتاحين.</CardDescription>
          </CardHeader>
          <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-4">
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
                        <Input dir="ltr" placeholder="9665XXXXXXXX" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isSubmitting} className="w-full">
                  <Send className="ml-2" />
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
