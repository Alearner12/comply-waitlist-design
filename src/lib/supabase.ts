import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Waitlist functions
export async function addToWaitlist(email: string) {
    const { data, error } = await supabase
        .from('waitlist')
        .insert([{ email }]);

    if (error) {
        if (error.code === '23505') {
            // Unique constraint violation - email already exists
            throw new Error('This email is already on the waitlist!');
        }
        throw error;
    }

    return data;
}
