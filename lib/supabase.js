import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://piayfwaqtgyddgpsejdh.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpYXlmd2FxdGd5ZGRncHNlamRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0OTc3MTksImV4cCI6MjA2MjA3MzcxOX0.isoV4Pl59Xi1ziErSNEK7dTVVQvwG7NjIblbCGll7Kw'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)