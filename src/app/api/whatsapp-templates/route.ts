import { NextRequest } from 'next/server';
import { TemplateService } from '../../../services/TemplateService';

export async function GET(request: NextRequest) {
  try {
    const templateService = new TemplateService();
    const templates = templateService.getAllTemplates();
    
    return new Response(JSON.stringify({ 
      success: true, 
      data: templates 
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Failed to fetch templates' 
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateName, variables } = body;

    if (!templateName) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Template name is required' 
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    const templateService = new TemplateService();
    const renderedTemplate = templateService.renderTemplate(templateName, variables);

    return new Response(JSON.stringify({ 
      success: true, 
      data: renderedTemplate 
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error: any) {
    console.error('Error rendering template:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || 'Failed to render template' 
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}