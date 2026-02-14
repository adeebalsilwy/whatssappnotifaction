'use client';

import type { AppConfig, Provider } from '@/lib/types';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ProviderSettingsSchema } from '@/lib/validation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { providers } from '@/lib/types';
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export function SettingsClient({ initialSettings }: { initialSettings: AppConfig }) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showMetaToken, setShowMetaToken] = useState(false);
  const [showVonageSecret, setShowVonageSecret] = useState(false);
  const [showGenericToken, setShowGenericToken] = useState(false);
  const [showDirectToken, setShowDirectToken] = useState(false);

  const form = useForm<any>({
    resolver: zodResolver(ProviderSettingsSchema),
    defaultValues: {
      defaultProvider: initialSettings.defaultProvider,
      providers: {
        meta: initialSettings.providers.meta || {},
        vonage: initialSettings.providers.vonage || {},
        generic: initialSettings.providers.generic || {},
        direct: initialSettings.providers.direct || {},
      }
    },
  });

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings.');
      }

      toast({
        title: 'تم الحفظ بنجاح',
        description: 'تم تحديث إعدادات مزودي الخدمة.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'حدث خطأ',
        description: error instanceof Error ? error.message : 'Could not save settings.',
      });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>الإعدادات العامة</CardTitle>
            <CardDescription>
              حدد مزود الخدمة الافتراضي الذي سيتم استخدامه إذا لم يتم تحديد مزود في الطلب.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="defaultProvider"
              render={({ field }) => (
                <FormItem className="max-w-sm">
                  <FormLabel>المزود الافتراضي</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر مزودًا افتراضيًا" />
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
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Meta (فيسبوك)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="providers.meta.url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://graph.facebook.com/v20.0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="providers.meta.token"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Token</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input type={showMetaToken ? 'text' : 'password'} placeholder="Your Meta API Token" {...field} />
                        </FormControl>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute top-1/2 right-2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                          onClick={() => setShowMetaToken(!showMetaToken)}
                        >
                          {showMetaToken ? <EyeOff /> : <Eye />}
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="providers.meta.numberId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number ID</FormLabel>
                      <FormControl>
                        <Input placeholder="Your WhatsApp Business Phone Number ID" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Vonage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="providers.vonage.url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://messages-sandbox.nexmo.com/v1/messages" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="providers.vonage.from"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>From Number (Sandbox)</FormLabel>
                      <FormControl>
                        <Input placeholder="14157386102" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="providers.vonage.apiKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Key</FormLabel>
                      <FormControl>
                        <Input placeholder="Your Vonage API Key" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="providers.vonage.apiSecret"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Secret</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input type={showVonageSecret ? 'text' : 'password'} placeholder="Your Vonage API Secret" {...field} />
                        </FormControl>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute top-1/2 right-2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                          onClick={() => setShowVonageSecret(!showVonageSecret)}
                        >
                          {showVonageSecret ? <EyeOff /> : <Eye />}
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Generic Provider</CardTitle>
                <CardDescription>For custom HTTP-based gateways.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="providers.generic.url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API URL</FormLabel>
                      <FormControl>
                        <Input placeholder="http://localhost:3000/send" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="providers.generic.token"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Auth Token</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input type={showGenericToken ? 'text' : 'password'} placeholder="Optional Auth Token" {...field} />
                        </FormControl>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute top-1/2 right-2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                          onClick={() => setShowGenericToken(!showGenericToken)}
                        >
                          {showGenericToken ? <EyeOff /> : <Eye />}
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Direct Provider</CardTitle>
                <CardDescription>For your own phone number service.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="providers.direct.url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API URL</FormLabel>
                      <FormControl>
                        <Input placeholder="http://your-service.com/api/send" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="providers.direct.from"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>From Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="+967774577134" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="providers.direct.token"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Auth Token</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input type={showDirectToken ? 'text' : 'password'} placeholder="Optional Auth Token" {...field} />
                        </FormControl>
                         <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute top-1/2 right-2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                          onClick={() => setShowDirectToken(!showDirectToken)}
                        >
                          {showDirectToken ? <EyeOff /> : <Eye />}
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
        </div>
        
        <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
            </Button>
        </div>

      </form>
    </FormProvider>
  );
}