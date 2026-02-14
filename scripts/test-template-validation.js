const fs = require('fs');

/**
 * Simple template validation script
 */
function validateTemplateStructure() {
  console.log('Validating template structure...');
  
  try {
    const templateContent = fs.readFileSync('./src/config/whatsapp-professional-templates.json', 'utf-8');
    const templateConfig = JSON.parse(templateContent);
    
    if (!templateConfig.whatsapp_templates || !Array.isArray(templateConfig.whatsapp_templates)) {
      console.error('Invalid template structure: Missing or invalid whatsapp_templates array');
      return false;
    }
    
    const templates = templateConfig.whatsapp_templates;
    console.log(`Found ${templates.length} templates to validate`);
    
    let allValid = true;
    
    for (const template of templates) {
      // Check required fields
      const requiredFields = ['name', 'category', 'language', 'components', 'variables', 'description'];
      
      for (const field of requiredFields) {
        if (!(field in template)) {
          console.error(`Template validation failed: Missing required field "${field}" in template "${template.name || 'unknown'}"`);
          allValid = false;
        }
      }
      
      // Validate name format
      if (template.name && !/^[a-zA-Z0-9_\-]+$/.test(template.name)) {
        console.error(`Template validation failed: Invalid name format "${template.name}"`);
        allValid = false;
      }
      
      // Validate category
      const validCategories = ['MARKETING', 'TRANSACTIONAL', 'AUTHENTICATION', 'UTILITY', 'OTP', 'ACCOUNT_UPDATE', 'PAYMENT_UPDATE', 'PERSONAL_FINANCE_UPDATE', 'RESERVATION_UPDATE', 'ISSUE_RESOLUTION', 'APPOINTMENT_UPDATE', 'TRANSPORTATION_UPDATE'];
      if (template.category && !validCategories.includes(template.category)) {
        console.error(`Template validation failed: Invalid category "${template.category}" in template "${template.name}"`);
        allValid = false;
      }
      
      // Validate language
      if (template.language && !/^[a-z]{2,3}(_[A-Z]{2})?$/.test(template.language)) {
        console.error(`Template validation failed: Invalid language code "${template.language}" in template "${template.name}"`);
        allValid = false;
      }
      
      // Validate components
      if (!Array.isArray(template.components) || template.components.length === 0) {
        console.error(`Template validation failed: Components must be a non-empty array in template "${template.name}"`);
        allValid = false;
      }
    }
    
    if (allValid) {
      console.log('✓ All templates passed structural validation');
    } else {
      console.log('✗ Some templates failed validation');
    }
    
    return allValid;
  } catch (error) {
    console.error('Error validating templates:', error.message);
    return false;
  }
}

// Run validation
const isValid = validateTemplateStructure();
console.log('Overall validation result:', isValid);