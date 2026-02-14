'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

interface WhatsAppTemplate {
  name: string;
  category: string;
  language: string;
  components: Array<{
    type: string;
    parameters: Array<{
      type: string;
      text?: string;
    }>;
  }>;
  variables: string[];
  description: string;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    category: 'ACCOUNT_UPDATE',
    language: 'ar',
    description: '',
    bodyText: ''
  });
  const [isEditing, setIsEditing] = useState(false);

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
      console.error('Error fetching templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // In a real implementation, this would be an API call to create/update templates
    // For now, we'll just show an alert
    alert('Template saved successfully!');
    setFormData({
      name: '',
      category: 'ACCOUNT_UPDATE',
      language: 'ar',
      description: '',
      bodyText: ''
    });
    setIsEditing(false);
    fetchTemplates();
  };

  const handleEdit = (template: WhatsAppTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      category: template.category,
      language: template.language,
      description: template.description,
      bodyText: template.components[0]?.parameters[0]?.text || ''
    });
    setIsEditing(true);
  };

  const handleDelete = async (name: string) => {
    if (confirm(`Are you sure you want to delete the template "${name}"?`)) {
      // In a real implementation, this would be an API call to delete the template
      alert(`Template "${name}" deleted!`);
      fetchTemplates();
    }
  };

  const handleTestTemplate = async (templateName: string) => {
    try {
      const response = await fetch('/api/whatsapp-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateName,
          variables: {} // Add default variables for testing
        })
      });
      
      const data = await response.json();
      if (data.success) {
        console.log('Rendered template:', data.data);
        alert(`Template "${templateName}" tested successfully!`);
      }
    } catch (error) {
      console.error('Error testing template:', error);
      alert('Error testing template');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">WhatsApp Templates</h1>
        <p className="text-muted-foreground mt-2">
          Manage your Arabic WhatsApp templates for banking notifications
        </p>
      </div>

      <Tabs defaultValue="manage" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manage">Manage Templates</TabsTrigger>
          <TabsTrigger value="create">Create Template</TabsTrigger>
        </TabsList>

        <TabsContent value="manage" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Card key={template.name}>
                <CardHeader>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    <Badge variant="secondary">{template.language.toUpperCase()}</Badge>
                    <Badge variant="outline">{template.category}</Badge>
                  </div>
                  
                  <div className="mt-4 flex space-x-2">
                    <Button 
                      size="sm" 
                      onClick={() => handleEdit(template)}
                    >
                      Edit
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleTestTemplate(template.name)}
                    >
                      Test
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      onClick={() => handleDelete(template.name)}
                    >
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="create" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{isEditing ? 'Edit Template' : 'Create New Template'}</CardTitle>
              <CardDescription>
                {isEditing 
                  ? `Editing template: ${formData.name}` 
                  : 'Create a new Arabic WhatsApp template for banking notifications'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Template Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Enter template name"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select 
                      value={formData.category} 
                      onValueChange={(value) => setFormData({...formData, category: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACCOUNT_UPDATE">Account Update</SelectItem>
                        <SelectItem value="PAYMENT_UPDATE">Payment Update</SelectItem>
                        <SelectItem value="MONEY_TRANSFER">Money Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <Select 
                      value={formData.language} 
                      onValueChange={(value) => setFormData({...formData, language: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ar">Arabic</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Brief description of the template"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bodyText">Template Body</Label>
                  <Textarea
                    id="bodyText"
                    value={formData.bodyText}
                    onChange={(e) => setFormData({...formData, bodyText: e.target.value})}
                    placeholder="Enter template body with variables like {variable_name}"
                    rows={4}
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    Use curly braces for variables: {'{variable_name}'}
                  </p>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  {isEditing && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false);
                        setSelectedTemplate(null);
                        setFormData({
                          name: '',
                          category: 'ACCOUNT_UPDATE',
                          language: 'ar',
                          description: '',
                          bodyText: ''
                        });
                      }}
                    >
                      Cancel Edit
                    </Button>
                  )}
                  <Button type="submit">
                    {isEditing ? 'Update Template' : 'Create Template'}
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