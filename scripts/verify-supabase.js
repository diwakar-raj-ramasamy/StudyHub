
// Usage: node --env-file=.env scripts/verify-supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('Checking Supabase Connection...');
console.log('URL:', supabaseUrl); // Logging URL to check for format issues (e.g. missing https://)
console.log('Key:', supabaseKey ? 'Found' : 'Missing');

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing environment variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    try {
        // Try to fetch something simple.
        // 'chat_sessions' is a table we know exists.
        const { data, error } = await supabase.from('chat_sessions').select('count', { count: 'exact', head: true });

        if (error) {
            console.error('Connection failed with Supabase error:', error.message);
            console.error('Details:', JSON.stringify(error, null, 2));
        } else {
            console.log('Successfully connected to Supabase!');
            console.log('Query result:', data);
        }
    } catch (err) {
        console.error('Network or Client error:', err.message);
        if (err.cause) {
            console.error('Cause:', err.cause);
        }
    }
}

testConnection();
