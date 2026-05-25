import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Read .env file
const envFile = fs.readFileSync('.env', 'utf-8');
const envVars = {};
envFile.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value) {
        envVars[key.trim()] = value.join('=').trim().replace(/['"]/g, '');
    }
});

const supabaseUrl = envVars['VITE_SUPABASE_URL'];
const supabaseKey = envVars['VITE_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('localhost:54321') && supabaseKey.includes('your_anon_key_here')) {
    console.error('❌ Supabase URL or Anon Key is missing or using default placeholders in .env file.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    try {
        console.log(`Testing connection to: ${supabaseUrl}`);
        
        // Test 1: Try to fetch from restaurants table
        const { data, error } = await supabase.from('restaurants').select('*').limit(1);
        
        if (error) {
            console.error('❌ Database connection failed or schema issue:', error.message);
            process.exit(1);
        }
        
        console.log('✅ Successfully connected to Supabase!');
        console.log('✅ Schema is applied (restaurants table exists).');
        console.log('Data returned (should be empty array if fresh):', data);
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Unexpected error during testing:', err);
        process.exit(1);
    }
}

testConnection();
