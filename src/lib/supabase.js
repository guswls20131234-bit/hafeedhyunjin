import { createClient } from '@supabase/supabase-js'

// ✅ Supabase 프로젝트 생성 후 아래 두 값을 교체하세요
// supabase.com → 프로젝트 → Settings → API
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co'
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
