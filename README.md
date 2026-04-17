# 양돈 출하 성적 대시보드 — 설치 & 배포 가이드

## 1단계. Supabase 설정 (DB + 저장소)

1. https://supabase.com 가입 → 새 프로젝트 생성
2. 좌측 메뉴 **SQL Editor** → `SUPABASE_SETUP.sql` 내용 붙여넣기 → 실행
3. 좌측 메뉴 **Settings → API** 에서 두 값 복사:
   - Project URL  (예: https://abcxyz.supabase.co)
   - anon public key

4. `src/lib/supabase.js` 파일 열어서 두 값 교체:
   ```js
   const SUPABASE_URL  = 'https://YOUR_PROJECT.supabase.co'  // ← 여기
   const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY'                 // ← 여기
   ```

---

## 2단계. 거래처 추가

`src/pages/AdminPage.jsx` 파일의 FARMS 배열에 추가:
```js
const FARMS = [
  { name: '선경농장', owner: '염철근', slug: 'sunkyung' },
  { name: '행복농장', owner: '홍길동', slug: 'haengbok' }, // ← 추가
]
```

`src/pages/FarmPage.jsx` 파일의 FARM_MAP에도 동일하게 추가:
```js
const FARM_MAP = {
  sunkyung: { name: '선경농장', owner: '염철근', initial: '염' },
  haengbok: { name: '행복농장', owner: '홍길동', initial: '홍' }, // ← 추가
}
```

---

## 3단계. 로컬에서 실행 (테스트)

Node.js가 설치되어 있어야 합니다. (https://nodejs.org)

```bash
cd pig-dashboard
npm install
npm run dev
```

브라우저에서 http://localhost:5173 접속

---

## 4단계. Vercel 배포 (무료 도메인)

1. https://github.com 가입 → 새 저장소 생성 (예: pig-dashboard)
2. 이 폴더 전체를 GitHub에 업로드
3. https://vercel.com 가입 → Import Project → GitHub 저장소 선택
4. 배포 클릭! (자동으로 https://pig-dashboard.vercel.app 같은 주소 생성)

---

## 접속 주소 정리

| 대상 | 주소 |
|------|------|
| 관리자 (나) | https://pig-dashboard.vercel.app/admin |
| 선경농장 | https://pig-dashboard.vercel.app/farm/sunkyung |
| 행복농장 | https://pig-dashboard.vercel.app/farm/haengbok |

---

## 관리자 비밀번호 변경

`src/pages/AdminPage.jsx` 파일 상단:
```js
const ADMIN_PASSWORD = '1234'  // ← 원하는 것으로 변경
```
