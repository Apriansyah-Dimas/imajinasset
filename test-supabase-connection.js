const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://yqxfxchlfuzzgwdcldfy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxeGZ4Y2hsZnV6emd3ZGNsZGZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NjkzMTgsImV4cCI6MjA3NzE0NTMxOH0.0Sj2h97hKmsli_IzxxYKmWzHecMNGsvhWpivgCXrhh4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('🔄 Testing Supabase connection...');

    // Test basic connection
    const { data, error } = await supabase.from('_test_connection').select('*').limit(1);

    if (error && error.code !== 'PGRST116') {
      console.error('❌ Connection failed:', error.message);
      console.log('\n💡 This might be due to:');
      console.log('1. Wrong database password');
      console.log('2. Database not ready yet');
      console.log('3. Wrong connection string format');

      console.log('\n📋 Please check your Supabase dashboard:');
      console.log('1. Go to Settings → Database');
      console.log('2. Find "Connection string" with "Connection pooling"');
      console.log('3. Copy the full connection string');
      console.log('4. Replace the password in DATABASE_URL');

    } else {
      console.log('✅ Supabase connection successful!');
    }

  } catch (err) {
    console.error('❌ Error testing connection:', err.message);
  }
}

testConnection();