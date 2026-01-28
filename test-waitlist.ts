
// Mocking window context for supabase-js which expects browser env
// @ts-ignore
if (typeof window === 'undefined') { (global as any).window = {}; }

import { addToWaitlist } from './src/lib/supabase';

async function testWaitlist() {
    console.log("Testing Waitlist Connection...");
    const testEmail = `test.verification.${Date.now()}@example.com`;

    try {
        const result = await addToWaitlist(testEmail);
        console.log("✅ SUCCESS: Added email to waitlist:", testEmail);
        console.log("Result:", result);
    } catch (error) {
        console.error("❌ FAILED: Could not add email to waitlist");
        console.error(error);
    }
}

testWaitlist();
