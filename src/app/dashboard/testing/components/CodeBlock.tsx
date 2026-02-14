'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ClipboardCopy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface CodeBlockProps {
  title: string;
  code: string | null;
  placeholder: string;
  isLoading?: boolean;
}

export function CodeBlock({ title, code, placeholder, isLoading = false }: CodeBlockProps) {
  const { toast } = useToast();

  const handleCopy = () => {
    if (code) {
      navigator.clipboard.writeText(code);
      toast({
        title: 'تم النسخ',
        description: 'تم نسخ المحتوى إلى الحافظة.',
      });
    }
  };

  return (
    <Card className="relative">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {code && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 h-8 w-8"
            onClick={handleCopy}
            aria-label="نسخ الكود"
          >
            <ClipboardCopy className="h-4 w-4" />
          </Button>
        )}
        <ScrollArea className="h-64 w-full">
          {isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : code ? (
            <pre className="text-sm p-4 bg-muted rounded-md" dir="ltr">
              <code>{code}</code>
            </pre>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              {placeholder}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
