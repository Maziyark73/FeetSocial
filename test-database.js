#!/usr/bin/env node

/**
 * Test Database Setup
 * This script helps you set up the Supabase database
 */

console.log('🗄️  Testing Database Setup...\n');

// Load environment variables
require('dotenv').config({ path: '.env' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabase() {
  console.log('🔗 Connecting to Supabase...');
  console.log(`   URL: ${supabaseUrl}`);
  console.log(`   Key: ${supabaseKey.substring(0, 20)}...`);
  
  try {
    // Test basic connection
    console.log('\n📋 Testing database tables...');
    
    const tables = ['users', 'posts', 'payments', 'follows', 'likes', 'comments', 'vault_access'];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          if (error.message.includes('relation') && error.message.includes('does not exist')) {
            console.log(`   ❌ Table '${table}' does not exist`);
          } else {
            console.log(`   ⚠️  Table '${table}' error: ${error.message}`);
          }
        } else {
          console.log(`   ✅ Table '${table}' exists`);
        }
      } catch (err) {
        console.log(`   ❌ Table '${table}' failed: ${err.message}`);
      }
    }
    
    // Test functions
    console.log('\n🔧 Testing database functions...');
    
    try {
      const { data, error } = await supabase.rpc('get_user_profile', { user_uuid: 'test' });
      if (error && error.message.includes('function') && error.message.includes('does not exist')) {
        console.log('   ❌ Database functions not found');
      } else {
        console.log('   ✅ Database functions exist');
      }
    } catch (err) {
      console.log('   ❌ Database functions test failed');
    }
    
    console.log('\n📝 Next Steps:');
    console.log('   1. Go to your Supabase dashboard');
    console.log('   2. Open the SQL Editor');
    console.log('   3. Copy and paste the contents of database-schema.sql');
    console.log('   4. Click "Run" to create all tables and functions');
    console.log('   5. Come back and test again');
    
  } catch (error) {
    console.log(`❌ Database connection failed: ${error.message}`);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Check your Supabase URL and API key');
    console.log('   2. Make sure your Supabase project is active');
    console.log('   3. Verify your API keys are correct');
  }
}

testDatabase();

