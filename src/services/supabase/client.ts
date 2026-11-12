import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { localCache } from '../storage/localCache';

let cachedClient: SupabaseClient | null = null;
let lastUsedConfig: { url: string; anonKey: string } | null = null;

/**
 * Checks whether Supabase credentials (URL and Anon Key) are present
 * either from environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
 * or configured in the local cache.
 */
export function isSupabaseConfigured(): boolean {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

  if (envUrl && envKey) {
    return true;
  }

  const stored = localCache.getSupabaseConfig();
  return Boolean(stored && stored.url && stored.anonKey);
}

/**
 * Retrieves the effective Supabase config (env vars take precedence, then local storage).
 */
export function getActiveSupabaseConfig(): { url: string; anonKey: string } | null {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

  if (envUrl && envKey) {
    return { url: envUrl, anonKey: envKey };
  }

  return localCache.getSupabaseConfig();
}

/**
 * Returns an active Supabase client instance, or null if credentials are not configured.
 */
export function getSupabaseClient(): SupabaseClient | null {
  const config = getActiveSupabaseConfig();
  if (!config) {
    cachedClient = null;
    lastUsedConfig = null;
    return null;
  }

  // Re-use existing client if config hasn't changed
  if (
    cachedClient &&
    lastUsedConfig &&
    lastUsedConfig.url === config.url &&
    lastUsedConfig.anonKey === config.anonKey
  ) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    lastUsedConfig = config;
    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    cachedClient = null;
    lastUsedConfig = null;
    return null;
  }
}

/**
 * Forces reinitialization of the Supabase client (e.g. after updating settings).
 */
export function reinitializeSupabase(): SupabaseClient | null {
  cachedClient = null;
  lastUsedConfig = null;
  return getSupabaseClient();
}
