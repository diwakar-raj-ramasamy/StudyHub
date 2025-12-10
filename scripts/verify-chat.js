
// Usage: node --env-file=.env scripts/verify-chat.js
// const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing environment variables.');
    process.exit(1);
}

const functionUrl = `${supabaseUrl}/functions/v1/chat`;

console.log(`Testing Edge Function: ${functionUrl}`);

async function testFunction() {
    try {
        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: 'Hello',
                sessionId: 'test-session'
            })
        });

        console.log(`Status: ${response.status} ${response.statusText}`);

        const text = await response.text();
        console.log('Response Body:', text);

        if (!response.ok) {
            console.error('Function call failed.');
        } else {
            console.log('Function call SUCCESS!');
        }

    } catch (err) {
        console.error('Network Error:', err.message);
        if (err.cause) console.error('Cause:', err.cause);
    }
}

testFunction();
