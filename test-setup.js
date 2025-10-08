#!/usr/bin/env node

/**
 * FeetSocial Setup Test Script
 * This script helps you test if your environment is configured correctly
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 FeetSocial Setup Test\n');

// Check if .env.local exists
const envPath = path.join(__dirname, '.env.local');
const envExists = fs.existsSync(envPath);

console.log('📋 Environment Check:');
console.log(`   .env.local exists: ${envExists ? '✅' : '❌'}`);

if (envExists) {
  // Load environment variables
  require('dotenv').config({ path: envPath });
  
  // Check required environment variables
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  console.log('\n🔑 Environment Variables:');
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    const isSet = value && !value.includes('your_') && !value.includes('_here');
    console.log(`   ${varName}: ${isSet ? '✅' : '❌'}`);
    if (!isSet && value) {
      console.log(`      Current value: ${value.substring(0, 20)}...`);
    }
  });
  
  // Check optional variables
  const optionalVars = [
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    'STRIPE_SECRET_KEY',
    'UPLOADTHING_SECRET',
    'MUX_TOKEN',
    'MUX_SECRET'
  ];
  
  console.log('\n🔧 Optional Services:');
  optionalVars.forEach(varName => {
    const value = process.env[varName];
    const isSet = value && !value.includes('your_') && !value.includes('_here');
    console.log(`   ${varName}: ${isSet ? '✅' : '⚪ (not configured)'}`);
  });
} else {
  console.log('\n❌ No .env.local file found!');
  console.log('   Please create .env.local with your environment variables');
  console.log('   See test-env-setup.md for instructions');
}

// Check if dependencies are installed
console.log('\n📦 Dependencies Check:');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const nodeModulesExists = fs.existsSync('node_modules');

console.log(`   node_modules exists: ${nodeModulesExists ? '✅' : '❌'}`);
console.log(`   Next.js version: ${packageJson.dependencies.next || 'not found'}`);
console.log(`   React version: ${packageJson.dependencies.react || 'not found'}`);

// Check if key files exist
console.log('\n📁 Key Files Check:');
const keyFiles = [
  'pages/index.tsx',
  'pages/login.tsx',
  'pages/register.tsx',
  'pages/upload.tsx',
  'lib/supabase.ts',
  'lib/stripe.ts',
  'lib/mux.ts',
  'database-schema.sql'
];

keyFiles.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`   ${file}: ${exists ? '✅' : '❌'}`);
});

// Test Supabase connection if configured
if (envExists && process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your_')) {
  console.log('\n🔗 Testing Supabase Connection...');
  
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    // Test connection
    supabase.from('users').select('count').limit(1).then(({ error }) => {
      if (error && error.message.includes('relation "users" does not exist')) {
        console.log('   ⚠️  Supabase connected but database schema not applied');
        console.log('      Run the SQL from database-schema.sql in your Supabase SQL editor');
      } else if (error) {
        console.log(`   ❌ Supabase connection failed: ${error.message}`);
      } else {
        console.log('   ✅ Supabase connection successful');
      }
    });
  } catch (error) {
    console.log(`   ❌ Supabase test failed: ${error.message}`);
  }
}

console.log('\n🚀 Next Steps:');
console.log('   1. Configure your .env.local file (see test-env-setup.md)');
console.log('   2. Set up Supabase database (run database-schema.sql)');
console.log('   3. Start the dev server: npm run dev');
console.log('   4. Open http://localhost:3000');
console.log('   5. Test user registration and login');
console.log('\n📚 See TESTING.md for detailed testing instructions');

