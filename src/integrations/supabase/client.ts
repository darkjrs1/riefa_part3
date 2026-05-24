import { createClient } from '@supabase/supabase-js'

// Ambil dari tab API Keys Supabase kamu
const supabaseUrl = 'https://ptcefkerjmvcdueliywh.supabase.co'
const supabaseAnonKey = 'sb_publishable_BZCtVfLsCp2AtEaYl3Z8Pg_TesTLiWS'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)