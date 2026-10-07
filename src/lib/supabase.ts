import { createClient } from '@supabase/supabase-js'
import type { Database, Tables } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// Fail loudly at startup instead of with confusing network errors later.
if (!url || !publishableKey) {
  throw new Error('Missing Supabase settings. Copy .env.example to .env.local and fill it in.')
}

// Passing <Database> makes every query type-checked against the real tables.
export const supabase = createClient<Database>(url, publishableKey)

// Short names for the row shapes used throughout the app.
export type Player = Tables<'players'>
export type MetricType = Tables<'metric_types'>
export type Measurement = Tables<'measurements'>
