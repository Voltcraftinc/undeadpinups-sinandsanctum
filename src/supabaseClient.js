// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

// 1) Copy/paste your values here:
const SUPABASE_URL = 'https://oksblwtanwhlkyqjomqy.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rc2Jsd3RhbndobGt5cWpvbXF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE2NDA0NzEsImV4cCI6MjA1NzIxNjQ3MX0.pQfHol0tC7xgEatV6j3d0aBzisHEHqwvmPKcNUWl17g'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
