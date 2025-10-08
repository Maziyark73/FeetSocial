#!/usr/bin/env node

/**
 * Test Environment Variables
 * This script checks if your .env file is properly configured
 */

console.log('🔍 Testing Environment Variables...\n');

// Check if .env.local exists
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const envExists = fs.existsSync(envPath);

console.log(`📁 .env exists: ${envExists ? '✅' : '❌'}`);

if (envExists) {
  // Load environment variables
  require('dotenv').config({ path: envPath });
  
  // Check required variables
  const requiredVars = {
    'NEXT_PUBLIC_SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL,
    'NEXT_PUBLIC_SUPABASE_ANON_KEY': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
  
  const optionalVars = {
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY': process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    'STRIPE_SECRET_KEY': process.env.STRIPE_SECRET_KEY,
    'UPLOADTHING_SECRET': process.env.UPLOADTHING_SECRET,
    'MUX_TOKEN': process.env.MUX_TOKEN,
    'MUX_SECRET': process.env.MUX_SECRET,
  };
  
  console.log('\n🔑 Required Environment Variables:');
  let allRequiredSet = true;
  
  Object.entries(requiredVars).forEach(([key, value]) => {
    const isSet = value && value.length > 10 && !value.includes('your_');
    console.log(`   ${key}: ${isSet ? '✅' : '❌'}`);
    if (value) {
      console.log(`      Value: ${value.substring(0, 20)}...`);
    }
    if (!isSet) allRequiredSet = false;
  });
  
  console.log('\n🔧 Optional Services:');
  Object.entries(optionalVars).forEach(([key, value]) => {
    const isSet = value && value.length > 10 && !value.includes('your_');
    console.log(`   ${key}: ${isSet ? '✅' : '⚪ (not configured)'}`);
  });
  
  console.log('\n🧪 Testing Supabase Connection...');
  
  if (allRequiredSet) {
    try {
      const { createClient } = require('@supabase/supabase-js');
      
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );
      
      // Test connection
      supabase.from('users').select('count').limit(1).then(({ data, error }) => {
        if (error) {
          if (error.message.includes('relation "users" does not exist')) {
            console.log('   ⚠️  Supabase connected but database schema not applied');
            console.log('      Run the SQL from database-schema.sql in your Supabase SQL editor');
          } else {
            console.log(`   ❌ Supabase connection failed: ${error.message}`);
          }
        } else {
          console.log('   ✅ Supabase connection successful!');
        }
      }).catch(err => {
        console.log(`   ❌ Supabase test failed: ${err.message}`);
      });
      
    } catch (error) {
      console.log(`   ❌ Error testing Supabase: ${error.message}`);
    }
  } else {
    console.log('   ⚠️  Cannot test Supabase - missing required variables');
  }
  
} else {
  console.log('\n❌ No .env file found!');
  console.log('   Please create .env with your environment variables');
}

console.log('\n🌐 Testing App URLs:');
console.log('   Main App: http://localhost:3001');
console.log('   Test Page: http://localhost:3001/test');
console.log('   Demo Page: http://localhost:3001/demo');

console.log('\n📋 Next Steps:');
if (envExists) {
  console.log('   ✅ Environment looks good! Try accessing the app');
  console.log('   🔗 Open: http://localhost:3001');
} else {
  console.log('   🔧 Configure your .env file');
  console.log('   📖 See: test-env-setup.md for instructions');
}
