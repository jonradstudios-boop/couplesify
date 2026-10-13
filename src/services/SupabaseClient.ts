import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Default Supabase project endpoints - can be updated or overridden in app settings
export const DEFAULT_SUPABASE_URL = 'https://couplesify-demo.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.demo-couplesify-token';

let supabaseInstance: ReturnType<typeof createClient> | null = null;

export const getSupabaseClient = (customUrl?: string, customKey?: string) => {
  const url = customUrl || DEFAULT_SUPABASE_URL;
  const key = customKey || DEFAULT_SUPABASE_ANON_KEY;

  if (!supabaseInstance || customUrl || customKey) {
    supabaseInstance = createClient(url, key, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }

  return supabaseInstance;
};

export const supabase = getSupabaseClient();
export default supabase;
