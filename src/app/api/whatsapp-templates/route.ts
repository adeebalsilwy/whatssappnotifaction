import { NextRequest, NextResponse } from 'next/server';
import { TemplateService, WhatsAppTemplate } from '../../../services/TemplateService';
import { validateSession } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const templateService = new TemplateService();
    const templates = templateService.getAllTemplates();
    
    return NextResponse.json({ 
      success: true, 
      data: templates 
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch templates' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token')?.value;
    const user = sessionToken ? await validateSession(sessionToken) : null;
    
    if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
        return NextResponse.json({ success: false, error: 'غير مصرح لك بإدارة القوالب' }, { status: 403 });
    }

    const body = await request.json();
    
    // If it's a test request (has templateName and variables but not full template object)
    if (body.templateName && body.variables && !body.components) {
        const templateService = new TemplateService();
        const renderedTemplate = templateService.renderTemplate(body.templateName, body.variables);
        return NextResponse.json({ success: true, data: renderedTemplate });
    }

    // Otherwise it's a creation request
    const templateService = new TemplateService();
    templateService.createTemplate(body as WhatsAppTemplate);

    return NextResponse.json({ 
      success: true, 
      message: 'تم إنشاء القالب بنجاح' 
    });
  } catch (error: any) {
    console.error('Error in templates POST:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to process request' 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const sessionToken = cookieStore.get('session_token')?.value;
        const user = sessionToken ? await validateSession(sessionToken) : null;
        
        if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
            return NextResponse.json({ success: false, error: 'غير مصرح لك بتعديل القوالب' }, { status: 403 });
        }

        const body = await request.json();
        const { name, ...updates } = body;

        if (!name) {
            return NextResponse.json({ success: false, error: 'اسم القالب مطلوب' }, { status: 400 });
        }

        const templateService = new TemplateService();
        templateService.updateTemplate(name, updates);

        return NextResponse.json({ success: true, message: 'تم تحديث القالب بنجاح' });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const sessionToken = cookieStore.get('session_token')?.value;
        const user = sessionToken ? await validateSession(sessionToken) : null;
        
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ success: false, error: 'فقط المسؤول يمكنه حذف القوالب' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const name = searchParams.get('name');

        if (!name) {
            return NextResponse.json({ success: false, error: 'اسم القالب مطلوب' }, { status: 400 });
        }

        const templateService = new TemplateService();
        templateService.deleteTemplate(name);

        return NextResponse.json({ success: true, message: 'تم حذف القالب بنجاح' });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
