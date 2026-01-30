import { createContext, useContext } from 'react';
import { supabase } from './supabase';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';

// Types
export interface AuthState {
    user: User | null;
    session: Session | null;
    loading: boolean;
}

export interface AuthContextType extends AuthState {
    signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
    signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
    signOut: () => Promise<void>;
}

// Auth functions
export async function signUp(email: string, password: string): Promise<{ error: Error | null; user: User | null }> {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    });

    if (error) {
        return { error, user: null };
    }

    return { error: null, user: data.user };
}

export async function signIn(email: string, password: string): Promise<{ error: Error | null; user: User | null }> {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        return { error, user: null };
    }

    return { error: null, user: data.user };
}

export async function signOut(): Promise<void> {
    await supabase.auth.signOut();
}

export async function getUser(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

export async function getSession(): Promise<Session | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
}

export function onAuthStateChange(
    callback: (event: AuthChangeEvent, session: Session | null) => void
): { unsubscribe: () => void } {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
    return { unsubscribe: () => subscription.unsubscribe() };
}

// Context (will be used by AuthProvider)
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
