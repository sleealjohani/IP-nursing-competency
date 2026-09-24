import { createClient } from '@supabase/supabase-js'

const fallbackUrl = 'https://cjjqwtujaakzqydfbygh.supabase.co'
const fallbackKey = 'sb_publishable_XSWNboyY0XHheFh5_MTEJA_fqz0GheD'

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || fallbackUrl
export const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || fallbackKey

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
