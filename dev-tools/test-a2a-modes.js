/**
 * Test script for A2A mode switching functionality
 */

require('dotenv').config();

const { loadA2ALiveConfig, loadA2ATestConfig, loadA2AConfig } = require('../src/lib/a2a-config');

function testA2AModes() {
  console.log('🧪 Testing A2A Mode Switching...\n');
  
  try {
    // Test Live Configuration
    console.log('📡 Loading Live Configuration...');
    const liveConfig = loadA2ALiveConfig();
    console.log('✅ Live Configuration loaded:');
    console.log(`   Host: ${liveConfig.host}`);
    console.log(`   Port: ${liveConfig.port}`);
    console.log(`   Bank Code: ${liveConfig.bankCode}`);
    console.log('');
    
    // Test Test Configuration
    console.log('🔬 Loading Test Configuration...');
    const testConfig = loadA2ATestConfig();
    console.log('✅ Test Configuration loaded:');
    console.log(`   Host: ${testConfig.host}`);
    console.log(`   Port: ${testConfig.port}`);
    console.log(`   Bank Code: ${testConfig.bankCode}`);
    console.log('');
    
    // Test Mode-Based Loading (default to live)
    console.log('🔄 Loading Configuration (default mode)...');
    const defaultConfig = loadA2AConfig();
    console.log('✅ Default Configuration loaded:');
    console.log(`   Host: ${defaultConfig.host}`);
    console.log(`   Mode: Live (default)`);
    console.log('');
    
    // Test Mode-Based Loading (explicit live)
    console.log('🔄 Loading Configuration (explicit live)...');
    const liveModeConfig = loadA2AConfig('live');
    console.log('✅ Live Mode Configuration loaded:');
    console.log(`   Host: ${liveModeConfig.host}`);
    console.log(`   Mode: Live`);
    console.log('');
    
    // Test Mode-Based Loading (explicit test)
    console.log('🧪 Loading Configuration (explicit test)...');
    const testModeConfig = loadA2AConfig('test');
    console.log('✅ Test Mode Configuration loaded:');
    console.log(`   Host: ${testModeConfig.host}`);
    console.log(`   Mode: Test`);
    console.log('');
    
    // Compare configurations
    console.log('📋 Configuration Comparison:');
    console.log(`Live Host vs Test Host: ${liveConfig.host} vs ${testConfig.host}`);
    console.log(`Live Port vs Test Port: ${liveConfig.port} vs ${testConfig.port}`);
    console.log(`Live Bank Code vs Test Bank Code: ${liveConfig.bankCode} vs ${testConfig.bankCode}`);
    console.log('');
    
    // Test environment variable mode
    console.log('⚙️  Testing Environment Variable Mode...');
    const envMode = process.env.A2A_MODE || 'live';
    console.log(`Environment A2A_MODE: ${envMode}`);
    
    const envBasedConfig = loadA2AConfig(envMode === 'test' ? 'test' : 'live');
    console.log(`Loaded based on environment: ${envBasedConfig.host} (${envMode})`);
    console.log('');
    
    console.log('🎉 A2A mode switching test completed successfully!');
    console.log('\n💡 To switch between modes:');
    console.log('   - Set A2A_MODE environment variable to "live" or "test"');
    console.log('   - Pass mode parameter in API requests: {"mode": "test"}');
    console.log('   - Use the dashboard to switch modes');
    
  } catch (error) {
    console.error('❌ Error during A2A mode test:', error.message);
    console.error(error.stack);
  }
}

// Run the test
if (require.main === module) {
  testA2AModes();
}

module.exports = { testA2AModes };