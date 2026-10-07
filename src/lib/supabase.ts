import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// Fail loudly at startup instead of with confusing network errors later.
if (!url || !publishableKey) {
  throw new Error('Missing Supabase settings. Copy .env.example to .env.local and fill it in.')
}

export const supabaseUrl: string = url
export const supabasePublishableKey: string = publishableKey

// One shared client for the whole app.
export const supabase = createClient(supabaseUrl, supabasePublishableKey)
