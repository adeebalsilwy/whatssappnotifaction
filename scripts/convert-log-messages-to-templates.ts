const fs = require('fs');

/**
 * Converts raw log messages to template parameters
 * This script analyzes the log file and extracts parameters that can be used with templates
 */

interface ParsedMessage {
  timestamp: string;
  provider: string;
  to: string;
  body: string;
  isAccountOpening: boolean;
  isDeposit: boolean;
  isWithdrawal: boolean;
  parameters: Record<string, string>;
}

/**
 * Parses a single log message and extracts template parameters
 */
function parseLogMessage(logLine: string): ParsedMessage | null {
  try {
    // Extract JSON part from the log line
    const jsonStartIndex = logLine.indexOf('{');
    if (jsonStartIndex === -1) {
      return null;
    }

    const jsonString = logLine.substring(jsonStartIndex);
    const logEntry = JSON.parse(jsonString);

    const body = logEntry.body;
    const parsed: ParsedMessage = {
      timestamp: logEntry.timestamp,
      provider: logEntry.provider,
      to: logEntry.to,
      body: body,
      isAccountOpening: false,
      isDeposit: false,
      isWithdrawal: false,
      parameters: {}
    };

    // Check for account opening message pattern
    if (body.includes('عميلنا العزيز') && body.includes('نود اعلامكم بانه تم فتح حسابكم')) {
      parsed.isAccountOpening = true;
      
      // Extract customer ID
      const customerMatch = body.match(/عميلنا العزيز\s+(\d+)/);
      if (customerMatch) {
        parsed.parameters.customer_id = customerMatch[1];
      }
      
      // Extract account type
      const accountTypeMatch = body.match(/نود اعلامكم بانه تم فتح حسابكم\s+(.*?)\s+حسابات/);
      if (accountTypeMatch) {
        parsed.parameters.account_type = accountTypeMatch[1].trim();
      }
      
      // Extract product ID
      const productMatch = body.match(/Product\s*:\s*(\d+)/);
      if (productMatch) {
        parsed.parameters.product_id = productMatch[1];
      }
    }
    // Check for deposit message pattern
    else if (body.includes('تم ايداع')) {
      parsed.isDeposit = true;
      
      // Extract amount
      const amountMatch = body.match(/مبلغ وقدره\s+([0-9,]+\.?\d*)/);
      if (amountMatch) {
        parsed.parameters.amount = amountMatch[1];
      }
      
      // Extract last digits
      const digitsMatch = body.match(/ينتهي ب\s+(\*+\d+)/);
      if (digitsMatch) {
        parsed.parameters.last_digits = digitsMatch[1];
      }
      
      // Extract date
      const dateMatch = body.match(/بتاريخ\s+([A-Z\s\d]+)/);
      if (dateMatch) {
        parsed.parameters.date = dateMatch[1].trim();
      }
      
      // Extract currency and balance
      const currencyBalanceMatch = body.match(/رصيد الحساب\s+(\w+)\s+([\d,]+\.?\d*)/);
      if (currencyBalanceMatch) {
        parsed.parameters.currency = currencyBalanceMatch[1];
        parsed.parameters.balance = currencyBalanceMatch[2];
      }
    }
    // Check for withdrawal/deduction message pattern
    else if (body.includes('تم خصم')) {
      parsed.isWithdrawal = true;
      
      // Extract amount
      const amountMatch = body.match(/مبلغ وقدره\s+([0-9,]+\.?\d*)DR/);
      if (amountMatch) {
        parsed.parameters.amount = amountMatch[1];
      }
      
      // Extract last digits
      const digitsMatch = body.match(/ينتهي ب\s+(\*+\d+)/);
      if (digitsMatch) {
        parsed.parameters.last_digits = digitsMatch[1];
      }
      
      // Extract date
      const dateMatch = body.match(/بتاريخ\s+([A-Z\s\d]+)/);
      if (dateMatch) {
        parsed.parameters.date = dateMatch[1].trim();
      }
      
      // Extract currency and balance
      const currencyBalanceMatch = body.match(/رصيد الحساب\s+(\w+)\s+([\d,]+\.?\d*)/);
      if (currencyBalanceMatch) {
        parsed.parameters.currency = currencyBalanceMatch[1];
        parsed.parameters.balance = currencyBalanceMatch[2];
      }
    }

    return parsed;
  } catch (error) {
    console.error('Error parsing log line:', logLine, error);
    return null;
  }
}

/**
 * Reads and parses the entire log file
 */
export function parseLogFile(logFilePath: string): ParsedMessage[] {
  console.log(`Parsing log file: ${logFilePath}`);
  
  const fileContent = fs.readFileSync(logFilePath, 'utf-8');
  const lines: string[] = fileContent.split('\n').filter((line: string) => line.trim() !== '');
  
  const parsedMessages: ParsedMessage[] = [];
  
  for (const line of lines) {
    const parsed = parseLogMessage(line);
    if (parsed) {
      parsedMessages.push(parsed);
    }
  }
  
  return parsedMessages;
}

/**
 * Generates statistics about the parsed messages
 */
export function generateStatistics(parsedMessages: ParsedMessage[]): void {
  const totalMessages = parsedMessages.length;
  const accountOpenings = parsedMessages.filter(msg => msg.isAccountOpening).length;
  const deposits = parsedMessages.filter(msg => msg.isDeposit).length;
  const withdrawals = parsedMessages.filter(msg => msg.isWithdrawal).length;
  
  console.log('\n=== Log File Analysis Statistics ===');
  console.log(`Total Messages: ${totalMessages}`);
  console.log(`Account Opening Notifications: ${accountOpenings}`);
  console.log(`Deposit Notifications: ${deposits}`);
  console.log(`Withdrawal Notifications: ${withdrawals}`);
  
  // Calculate percentages
  console.log(`Account Opening Percentage: ${(accountOpenings / totalMessages * 100).toFixed(2)}%`);
  console.log(`Deposit Percentage: ${(deposits / totalMessages * 100).toFixed(2)}%`);
  console.log(`Withdrawal Percentage: ${(withdrawals / totalMessages * 100).toFixed(2)}%`);
  
  // Unique customers
  const uniqueCustomers = new Set(parsedMessages.map(msg => msg.parameters.customer_id)).size;
  console.log(`Unique Customers: ${uniqueCustomers}`);
  
  // Unique currencies
  const uniqueCurrencies = new Set(parsedMessages.map(msg => msg.parameters.currency)).size;
  console.log(`Unique Currencies: ${uniqueCurrencies}`);
  
  console.log('====================================\n');
}

/**
 * Creates sample template usage examples based on parsed messages
 */
export function createTemplateUsageExamples(parsedMessages: ParsedMessage[]): void {
  console.log('=== Sample Template Usage Examples ===\n');
  
  // Example 1: Account Opening
  const accountOpeningExample = parsedMessages.find(msg => msg.isAccountOpening);
  if (accountOpeningExample) {
    console.log('Account Opening Template Example:');
    console.log('Template Name: account_opening_notification');
    console.log('Parameters:');
    Object.entries(accountOpeningExample.parameters).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
    console.log('');
  }
  
  // Example 2: Deposit
  const depositExample = parsedMessages.find(msg => msg.isDeposit);
  if (depositExample) {
    console.log('Deposit Template Example:');
    console.log('Template Name: deposit_notification');
    console.log('Parameters:');
    Object.entries(depositExample.parameters).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
    console.log('');
  }
  
  // Example 3: Withdrawal
  const withdrawalExample = parsedMessages.find(msg => msg.isWithdrawal);
  if (withdrawalExample) {
    console.log('Withdrawal Template Example:');
    console.log('Template Name: withdrawal_notification');
    console.log('Parameters:');
    Object.entries(withdrawalExample.parameters).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
    console.log('');
  }
  
  console.log('=====================================\n');
}

/**
 * Main function to process the log file and generate templates
 */
function main() {
  const LOG_FILE_PATH = process.env.LOG_FILE_PATH || './logs/messages-2026-01-31.log';
  const OUTPUT_FILE_PATH = process.env.OUTPUT_FILE_PATH || './logs/parsed-messages-output.json';

  if (!fs.existsSync(LOG_FILE_PATH)) {
    console.error(`Log file not found: ${LOG_FILE_PATH}`);
    return;
  }

  console.log('Starting log file to template conversion process...\n');

  try {
    // Parse the log file
    const parsedMessages = parseLogFile(LOG_FILE_PATH);
    
    // Generate statistics
    generateStatistics(parsedMessages);
    
    // Create template usage examples
    createTemplateUsageExamples(parsedMessages);
    
    // Save parsed messages to file
    fs.writeFileSync(OUTPUT_FILE_PATH, JSON.stringify(parsedMessages, null, 2));
    console.log(`Parsed messages saved to: ${OUTPUT_FILE_PATH}`);
    
    console.log('Log to template conversion completed successfully!');
  } catch (error) {
    console.error('Error processing log file:', error);
  }
}

// If this file is run directly, execute the main function
if (require.main === module) {
  main();
}

export default parseLogFile;