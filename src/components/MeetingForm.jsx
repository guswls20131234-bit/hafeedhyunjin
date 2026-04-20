import { useState } from 'react'

const SECTIONS = [
  {
    id: 'basic', title: '🏢 거래처 기본 정보', color: '#1a4a2e',
    questions: [
      { id: 'b1', label: '농장명 / 사업체명', type: 'text', placeholder: '예) ○○축산, ○○농장' },
      { id: 'b2', label: '대표자명', type: 'text', placeholder: '성함' },
      { id: 'b3', label: '소재지 (도/시/군)', type: 'text', placeholder: '예) 경기도 안성시' },
      { id: 'b4', label: '농장 운영 형태', type: 'select', options: ['일관경영(모돈+비육)', '번식 전문(모돈)', '비육 전문', '위탁사육', '기타'] },
      { id: 'b5', label: '농장 규모', type: 'text', placeholder: '예) 모돈 200두, 비육 2,000두' },
      { id: 'b6', label: '농장 운영 연수', type: 'text', placeholder: '예) 15년' },
      { id: 'b7', label: '담당자 연락처', type: 'text', placeholder: '전화번호' },
    ],
  },
  {
    id: 'current', title: '🐖 현재 사육 및 생산 현황', color: '#2a3a5e',
    questions: [
      { id: 'c1', label: '현재 사용 중인 사료 브랜드', type: 'text', placeholder: '예) A사, B사' },
      { id: 'c2', label: '월 사료 사용량 (톤)', type: 'text', placeholder: '예) 약 50톤/월' },
      { id: 'c3', label: '현재 PSY', type: 'text', placeholder: '예) 22두' },
      { id: 'c4', label: '현재 FCR', type: 'text', placeholder: '예) 2.8' },
      { id: 'c5', label: '출하일령 / 출하체중', type: 'text', placeholder: '예) 180일 / 115kg' },
      { id: 'c6', label: '주요 출하처', type: 'text', placeholder: '예) 도드람, 선진, 직거래' },
      { id: 'c7', label: '연간 출하 두수 (추정)', type: 'text', placeholder: '예) 약 5,000두/년' },
    ],
  },
  {
    id: 'pain', title: '⚠️ 현재 애로사항 및 불만사항', color: '#4a2a1a',
    questions: [
      { id: 'p1', label: '현재 사료/거래처에서 가장 불만스러운 점', type: 'textarea', placeholder: '납기, 품질, 가격, 서비스 등' },
      { id: 'p2', label: '생산성 관련 주요 문제점', type: 'checkboxes', options: ['PSY 낮음', 'FCR 불량', '폐사율 높음', '성장 불균일', '번식성적 불량', '면역 문제'] },
      { id: 'p3', label: '질병·방역 관련 현안', type: 'textarea', placeholder: '예) PED 상재화, PRRS 문제 등' },
      { id: 'p4', label: '노동력 부족 여부', type: 'select', options: ['심각한 문제', '다소 어려움', '보통', '여유 있음'] },
      { id: 'p5', label: '자금·경영 측면 현안', type: 'textarea', placeholder: '예) 원가 상승 부담 등' },
    ],
  },
  {
    id: 'needs', title: '🎯 거래 니즈 및 요구사항', color: '#1a3a4a',
    questions: [
      { id: 'n1', label: '사료 변경 의향 여부', type: 'select', options: ['적극 검토 중', '긍정적으로 검토', '조건부 검토', '현재는 미검토', '기존 거래처 유지 예정'] },
      { id: 'n2', label: '사료 변경 시 가장 중요하게 보는 조건', type: 'checkboxes', options: ['가격 경쟁력', '생산성 향상', '납기/배송 안정성', '기술 지원', '결제 조건', '브랜드 신뢰도'] },
      { id: 'n3', label: '원하는 결제 조건', type: 'select', options: ['현금', '30일 외상', '60일 외상', '90일 외상', '협의 필요'] },
      { id: 'n4', label: '기술 지원 서비스 요구도', type: 'select', options: ['매우 필요', '필요', '보통', '불필요'] },
      { id: 'n5', label: '시제품 테스트 의향', type: 'select', options: ['즉시 가능', '2~4주 내 가능', '1~2개월 후 가능', '어려움'] },
      { id: 'n6', label: '연간 예상 거래 규모', type: 'text', placeholder: '예) 약 600톤/년, 약 3억원/년' },
    ],
  },
  {
    id: 'decision', title: '👤 의사결정 구조', color: '#3a1a4a',
    questions: [
      { id: 'd1', label: '구매 의사결정권자', type: 'text', placeholder: '예) 대표, 부장, 농장장' },
      { id: 'd2', label: '의사결정 프로세스', type: 'textarea', placeholder: '예) 농장장 검토 → 대표 최종 결정' },
      { id: 'd3', label: '경쟁사 제안 여부', type: 'select', options: ['복수 업체 비교 중', '단독 검토', '미확인'] },
      { id: 'd4', label: '거래 전환 시 예상 소요기간', type: 'select', options: ['1개월 이내', '1~3개월', '3~6개월', '6개월 이상', '미정'] },
    ],
  },
  {
    id: 'memo', title: '📝 미팅 총평 및 메모', color: '#2a2a2a',
    questions: [
      { id: 'm1', label: '미팅 일시', type: 'text', placeholder: '예) 2026년 4월 20일 오전 10시' },
      { id: 'm2', label: '미팅 참석자 (우리 측)', type: 'text', placeholder: '예) 홍길동 과장, 이철수 대리' },
      { id: 'm3', label: '전체 미팅 분위기 평가', type: 'select', options: ['매우 우호적', '우호적', '보통', '소극적', '부정적'] },
      { id: 'm4', label: '거래 성사 가능성 (자체 평가)', type: 'select', options: ['90% 이상 (High)', '60~90% (Medium-High)', '30~60% (Medium)', '30% 미만 (Low)'] },
      { id: 'm5', label: '차기 액션플랜 및 팔로업 사항', type: 'textarea', placeholder: '예) 다음 주 견적서 발송, 샘플 사료 2톤 지원 검토' },
      { id: 'm6', label: '특이사항 / 추가 메모', type: 'textarea', placeholder: '농장 상황, 특이 요청, 경쟁 정보 등' },
    ],
  },
]

export { SECTIONS }

function CheckboxGroup({ options, value = [], onChange }) {
  const toggle = (opt) =>
    value.includes(opt) ? onChange(value.filter((v) => v !== opt)) : onChange([...value, opt])
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
      {options.map((opt) => (
        <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', background: value.includes(opt) ? '#2d7a4f22' : '#f5f5f5', border: value.includes(opt) ? '1.5px solid #2d7a4f' : '1.5px solid #ddd', borderRadius: 6, padding: '4px 10px', fontSize: 13, color: value.includes(opt) ? '#1a4a2e' : '#555' }}>
          <input type="checkbox" checked={value.includes(opt)} onChange={() => toggle(opt)} style={{ accentColor: '#2d7a4f' }} />
          {opt}
        </label>
      ))}
    </div>
  )
}

function Field({ q, value, onChange }) {
  const base = { width: '100%', padding: '9px 12px', border: '1.5px solid #ddd', borderRadius: 8, fontSize: 14, outline: 'none', background: '#fafafa', boxSizing: 'border-box', fontFamily: 'inherit' }
  if (q.type === 'textarea') return <textarea style={{ ...base, minHeight: 80, resize: 'vertical' }} placeholder={q.placeholder} value={value || ''} onChange={(e) => onChange(e.target.value)} />
  if (q.type === 'select') return (
    <select style={{ ...base, cursor: 'pointer' }} value={value || ''} onChange={(e) => onChange(e.target.value)}>
      <option value=''>-- 선택 --</option>
      {q.options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  )
  if (q.type === 'checkboxes') return <CheckboxGroup options={q.options} value={value} onChange={onChange} />
  return <input style={base} type='text' placeholder={q.placeholder} value={value || ''} onChange={(e) => onChange(e.target.value)} />
}

function FormSection({ sec, data, onChange }) {
  const [open, setOpen] = useState(true)
  return (
    <div style={{ marginBottom: 18, borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.07)', border: '1px solid #eee' }}>
      <button onClick={() => setOpen(!open)} style={{ width: '100%', background: sec.color, color: '#fff', border: 'none', padding: '13px 20px', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 15, fontWeight: 700, fontFamily: 'inherit' }}>
        <span>{sec.title}</span>
        <span style={{ fontSize: 11, opacity: 0.7 }}>{open ? '▲ 접기' : '▼ 펼치기'}</span>
      </button>
      {open && (
        <div style={{ padding: '18px 22px', background: '#fff', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
          {sec.questions.map((q) => (
            <div key={q.id} style={{ gridColumn: (q.type === 'textarea' || q.type === 'checkboxes') ? '1 / -1' : 'auto' }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: sec.color, marginBottom: 5 }}>{q.label}</label>
              <Field q={q} value={data[q.id]} onChange={(v) => onChange(q.id, v)} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function MeetingForm({ formData, editingId, saving, saveStatus, onChange, onSave, onNew, onReport }) {
  const total = SECTIONS.flatMap((s) => s.questions).length
  const filled = Object.values(formData).filter((v) => Array.isArray(v) ? v.length > 0 : v && String(v).trim() !== '').length
  const progress = Math.round((filled / total) * 100)

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '18px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', borderRadius: 10, padding: '12px 18px', marginBottom: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.07)', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 11, color: '#999' }}>{editingId ? '수정 중 (Supabase 저장됨)' : '새 미팅 작성 중'}</div>
          <div style={{ fontWeight: 800, fontSize: 16, color: '#1a4a2e' }}>{formData.b1 || '농장명을 입력하세요'}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#999' }}>진행률</div>
            <div style={{ fontWeight: 900, fontSize: 22, color: '#1a4a2e', lineHeight: 1 }}>{progress}%</div>
          </div>
          <div style={{ width: 64, height: 7, background: '#eee', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: progress >= 80 ? '#2d7a4f' : '#f0c040', transition: 'width 0.3s' }} />
          </div>
        </div>
      </div>

      <div style={{ background: '#e8f5ee', border: '1.5px solid #2d7a4f', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#1a4a2e' }}>
        💾 <strong>Supabase 연동</strong> — 저장 버튼을 누르면 DB에 영구 저장됩니다.
      </div>

      {SECTIONS.map((sec) => (
        <FormSection key={sec.id} sec={sec} data={formData} onChange={onChange} />
      ))}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8, marginBottom: 40, flexWrap: 'wrap', alignItems: 'center' }}>
        {saveStatus && <span style={{ fontSize: 14, fontWeight: 700, color: saveStatus.includes('✅') ? '#1a7a1a' : '#cc4444' }}>{saveStatus}</span>}
        <button onClick={onNew} style={{ background: '#fff', color: '#888', border: '1.5px solid #ddd', borderRadius: 8, padding: '11px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>+ 새 미팅</button>
        <button onClick={onSave} disabled={saving} style={{ background: '#2d7a4f', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 22px', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14, opacity: saving ? 0.7 : 1 }}>
          {saving ? '저장 중...' : '💾 Supabase 저장'}
        </button>
        <button onClick={onReport} style={{ background: '#1a4a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 28px', cursor: 'pointer', fontWeight: 800, fontSize: 14, boxShadow: '0 4px 14px rgba(26,74,46,0.3)' }}>📋 보고서 생성</button>
      </div>
    </div>
  )
}
