/// <reference types="vite/client" />

import { createClient } from '@supabase/supabase-js';

// Supabase configuration using environment variables
// Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env file
// The .env file is intentionally ignored by Git for security.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
