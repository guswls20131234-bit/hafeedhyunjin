import { createClient } from '@supabase/supabase-js'

// ✅ Supabase 프로젝트 생성 후 아래 두 값을 교체하세요
// supabase.com → 프로젝트 → Settings → API
const SUPABASE_URL = 'https://vsljsjqxcmielpxckjrn.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzbGpzanF4Y21pZWxweGNranJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNjE0NzgsImV4cCI6MjA5MTkzNzQ3OH0.K8-tfAuMt_7gWQ7vyZwgeZ6LQiOf7B9V1qwSYbu2eY4'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
