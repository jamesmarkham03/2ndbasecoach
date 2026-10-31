import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database, Tables } from './database.types'
import { createDemoClient } from './demoClient'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

/** Demo mode (?demo in the URL): fake sample data, no login, never touches the real database. */
export const isDemo = new URLSearchParams(window.location.search).has('demo')

// Fail loudly at startup instead of with confusing network errors later. Demo mode needs no settings.
if (!isDemo && (!url || !publishableKey)) {
  throw new Error('Missing Supabase settings. Copy .env.example to .env.local and fill it in, or open the app with ?demo.')
}

// Passing <Database> makes every query type-checked against the real tables.
// The demo client only implements the calls the app makes, hence the cast.
export const supabase: SupabaseClient<Database> = isDemo
  ? (createDemoClient() as unknown as SupabaseClient<Database>)
  : createClient<Database>(url, publishableKey)

// Short names for the row shapes used throughout the app.
export type Player = Tables<'players'>
export type Team = Tables<'teams'>
export type MetricType = Tables<'metric_types'>
export type Measurement = Tables<'measurements'>
export type LibraryItem = Tables<'library_items'>
export type LessonPlan = Tables<'lesson_plans'>
export type LessonPlanItem = Tables<'lesson_plan_items'>
export type Lesson = Tables<'lessons'>
export type LessonItem = Tables<'lesson_items'>
export type LessonNote = Tables<'lesson_notes'>
