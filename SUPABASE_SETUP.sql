-- Supabase SQL Editor에 붙여넣고 실행하세요

create table if not exists shipments (
  id         bigserial primary key,
  farm_slug  text      not null,
  farm_name  text,
  owner      text,
  date       text      not null,
  pig_id     text,
  sex        text,
  lw         numeric,
  cw         numeric   not null,
  bf         numeric   not null,
  price      numeric,
  created_at timestamptz default now()
);

-- 누구나 읽기 가능 (거래처 조회용)
create policy "anyone can read" on shipments for select using (true);

-- 인증된 사용자만 삽입 가능 (관리자 업로드용)
-- 간단하게 하려면 아래 정책으로 모두 허용:
create policy "anyone can insert" on shipments for insert with check (true);

alter table shipments enable row level security;
