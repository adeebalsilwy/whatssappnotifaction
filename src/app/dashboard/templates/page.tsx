'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Edit,
  Trash2,
  MessageSquare,
  Languages,
  Tag,
  Search,
  CheckCircle2,
  RefreshCcw,
  FileText
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface WhatsAppTemplate {
  name: string;
  category: string;
  language: string;
  components: any;
  variables: string[];
  description: string;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('manage');
  const [formData, setFormData] = useState({
    name: '',
    category: 'UTILITY',
    language: 'ar',
    description: '',
    bodyText: ''
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/whatsapp-templates');
      const data = await response.json();
      
      if (data.success) {
        setTemplates(data.data);
      }
    } catch (error) {
      toast({ title: 'خطأ', description: 'فشل في جلب القوالب', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const templateData = {
      name: formData.name,
      category: formData.category,
      language: formData.language,
      description: formData.description,
      components: [
        {
          type: 'BODY',
          text: formData.bodyText
        }
      ],
      variables: [] // Variables are extracted on server or can be defined here
    };

    try {
      const method = isEditing ? 'PUT' : 'POST';
      const response = await fetch('/api/whatsapp-templates', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData)
      });

      const result = await response.json();

      if (result.success) {
        toast({ title: isEditing ? 'تم التحديث' : 'تم الإنشاء', description: result.message });
        resetForm();
        fetchTemplates();
        setActiveTab('manage');
      } else {
        toast({ title: 'خطأ', description: result.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'خطأ', description: 'فشل الاتصال بالخادم', variant: 'destructive' });
    }
  };

  const handleEdit = (template: WhatsAppTemplate) => {
    const components = typeof template.components === 'string' ? JSON.parse(template.components) : template.components;
    const bodyComp = components.find((c: any) => c.type.toUpperCase() === 'BODY');

    setFormData({
      name: template.name,
      category: template.category,
      language: template.language,
      description: template.description || '',
      bodyText: bodyComp?.text || ''
    });
    setIsEditing(true);
    setActiveTab('create');
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`هل أنت متأكد من حذف القالب "${name}"؟`)) return;

    try {
      const response = await fetch(`/api/whatsapp-templates?name=${name}`, {
        method: 'DELETE'
      });
      const result = await response.json();
      
      if (result.success) {
        toast({ title: 'تم الحذف', description: result.message });
        fetchTemplates();
      } else {
        toast({ title: 'خطأ', description: result.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'خطأ', description: 'فشل الاتصال بالخادم', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'UTILITY',
      language: 'ar',
      description: '',
      bodyText: ''
    });
    setIsEditing(false);
  };

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">قوالب الواتساب</h1>
          <p className="text-muted-foreground mt-1">
            إدارة وتخصيص قوالب الرسائل المعتمدة من ميتا (MTM)
          </p>
        </div>
        <Button onClick={() => { resetForm(); setActiveTab('create'); }}>
          <Plus className="ml-2 h-4 w-4" />
          إنشاء قالب جديد
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 h-12 bg-muted/50 p-1">
          <TabsTrigger value="manage" className="text-base">إدارة القوالب</TabsTrigger>
          <TabsTrigger value="create" className="text-base">{isEditing ? 'تعديل قالب' : 'إنشاء قالب'}</TabsTrigger>
        </TabsList>

        <TabsContent value="manage" className="space-y-6 animate-in fade-in duration-300">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  القوالب المسجلة
                </CardTitle>
                <div className="relative w-64">
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="بحث في القوالب..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pr-10"
                    />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-12">
                   <RefreshCcw className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground opacity-20" />
                    <p className="mt-2 text-muted-foreground">لا توجد قوالب مطابقة للبحث</p>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredTemplates.map((template) => (
                    <Card key={template.name} className="overflow-hidden border-primary/10 hover:border-primary/30 transition-all hover:shadow-md">
                        <CardHeader className="bg-muted/30 pb-3">
                            <div className="flex justify-between items-start">
                                <CardTitle className="text-lg font-bold text-primary truncate max-w-[180px]">
                                    {template.name}
                                </CardTitle>
                                <Badge variant="secondary" className="text-[10px] uppercase">
                                    {template.language}
                                </Badge>
                            </div>
                            <CardDescription className="line-clamp-1 h-5">
                                {template.description || 'لا يوجد وصف'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-4 pb-2">
                            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                                <div className="flex items-center gap-1">
                                    <Tag className="h-3 w-3" />
                                    {template.category}
                                </div>
                                <div className="flex items-center gap-1">
                                    <Languages className="h-3 w-3" />
                                    {template.language === 'ar' ? 'عربي' : 'إنجليزي'}
                                </div>
                            </div>
                            <div className="bg-muted/50 p-3 rounded-md text-sm min-h-[80px] line-clamp-4 relative group">
                                {(() => {
                                    const components = typeof template.components === 'string' ? JSON.parse(template.components) : template.components;
                                    const body = components.find((c: any) => c.type.toUpperCase() === 'BODY');
                                    return body?.text || 'لا يوجد نص محتوى';
                                })()}
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-end gap-2 bg-muted/20 border-t pt-3 pb-3">
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(template)}>
                                <Edit className="h-4 w-4 ml-1" />
                                تعديل
                            </Button>
                            <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(template.name)}>
                                <Trash2 className="h-4 w-4 ml-1" />
                                حذف
                            </Button>
                        </CardFooter>
                    </Card>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create" className="animate-in fade-in duration-300">
          <Card className="max-w-3xl mx-auto">
            <CardHeader className="bg-primary/5 border-b mb-6">
              <CardTitle className="flex items-center gap-2">
                {isEditing ? <Edit className="h-5 w-5 text-primary" /> : <Plus className="h-5 w-5 text-primary" />}
                {isEditing ? 'تعديل قالب رسالة' : 'إنشاء قالب رسالة جديد'}
              </CardTitle>
              <CardDescription>
                تأكد من اتباع معايير ميتا عند كتابة نص القالب لضمان الموافقة عليه بسرعة.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">اسم القالب (ID)</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="e.g. withdrawal_alert"
                      required
                      disabled={isEditing}
                      dir="ltr"
                    />
                    <p className="text-[10px] text-muted-foreground">استخدم الأحرف الإنجليزية والشرطة السفلية فقط.</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="category">الفئة (Category)</Label>
                    <Select 
                      value={formData.category} 
                      onValueChange={(value) => setFormData({...formData, category: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTILITY">إشعارات خدمات (Utility)</SelectItem>
                        <SelectItem value="MARKETING">تسويق (Marketing)</SelectItem>
                        <SelectItem value="AUTHENTICATION">توثيق (OTP)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="language">اللغة</Label>
                    <Select 
                      value={formData.language} 
                      onValueChange={(value) => setFormData({...formData, language: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ar">العربية (ar)</SelectItem>
                        <SelectItem value="en_US">الإنجليزية (en_US)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">الوصف الوظيفي</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="ما هو الغرض من هذا القالب؟"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bodyText" className="flex justify-between">
                    نص القالب (Body Text)
                    <Badge variant="outline" className="text-[10px]">استخدم {'{{1}}'} للمتغيرات</Badge>
                  </Label>
                  <Textarea
                    id="bodyText"
                    value={formData.bodyText}
                    onChange={(e) => setFormData({...formData, bodyText: e.target.value})}
                    placeholder="اكتب نص الرسالة هنا، مثال: عميلنا العزيز {{1}}، رصيدك هو {{2}}..."
                    rows={6}
                    className="text-lg leading-relaxed"
                    required
                  />
                  <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-md border border-blue-100 dark:border-blue-900/30">
                    <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5" />
                    <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
                        نصيحة: ابدأ القالب بـ "إشعار من البنك:" أو "عميلنا العزيز:" لزيادة فرصة القبول من قبل ميتا.
                        تأكد أن نسبة المتغيرات للنص الثابت معقولة.
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 pt-6 border-t">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => { resetForm(); setActiveTab('manage'); }}
                  >
                    إلغاء
                  </Button>
                  <Button type="submit" className="px-8 font-bold">
                    {isEditing ? 'حفظ التعديلات' : 'إنشاء القالب وحفظه'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
