const getPossibility = (val) => {
  if (!val) return { label: '-', color: '#999', bg: '#f5f5f5' }
  if (val.includes('90%')) return { label: 'HIGH', color: '#1a7a1a', bg: '#e8f5e8' }
  if (val.includes('60')) return { label: 'MED-HIGH', color: '#5a6a00', bg: '#f5f5e0' }
  if (val.includes('30~60')) return { label: 'MEDIUM', color: '#a06000', bg: '#fff3e0' }
  return { label: 'LOW', color: '#a01a1a', bg: '#fde8e8' }
}

function Sec({ title, color, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ background: color, color: '#fff', padding: '6px 14px', borderRadius: '6px 6px 0 0', fontWeight: 700, fontSize: 13 }}>{title}</div>
      <div style={{ border: `1px solid ${color}33`, borderTop: 'none', borderRadius: '0 0 6px 6px', display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  )
}
function R({ label, value }) {
  return (
    <div style={{ display: 'flex', borderBottom: '1px solid #f0f0f0' }}>
      <div style={{ minWidth: 110, background: '#f8f8f8', padding: '7px 12px', fontWeight: 600, fontSize: 12, color: '#444', borderRight: '1px solid #ebebeb' }}>{label}</div>
      <div style={{ padding: '7px 12px', fontSize: 13, color: '#222', flex: 1, wordBreak: 'break-all' }}>{value || '-'}</div>
    </div>
  )
}
function RW({ label, value }) {
  return (
    <div style={{ display: 'flex', borderBottom: '1px solid #f0f0f0', gridColumn: '1 / -1' }}>
      <div style={{ minWidth: 110, background: '#f8f8f8', padding: '7px 12px', fontWeight: 600, fontSize: 12, color: '#444', borderRight: '1px solid #ebebeb' }}>{label}</div>
      <div style={{ padding: '7px 12px', fontSize: 13, color: '#222', flex: 1, whiteSpace: 'pre-wrap' }}>{value || '-'}</div>
    </div>
  )
}

export default function ReportView({ data, onBack }) {
  const g = (k) => data[k] || '-'
  const pos = getPossibility(g('m4'))
  const arr = (k) => Array.isArray(data[k]) ? data[k].join(', ') : g(k)

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '18px 16px' }}>
      <div className="no-print" style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <button onClick={onBack} style={{ background: '#fff', border: '1.5px solid #ddd', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, color: '#555', fontWeight: 600 }}>← 뒤로</button>
        <button onClick={() => window.print()} style={{ background: '#1a4a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>🖨️ 인쇄 / PDF 저장</button>
      </div>

      <div style={{ background: '#fff', borderRadius: 16, padding: '36px 40px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        {/* 헤더 */}
        <div style={{ borderBottom: '3px solid #1a4a2e', paddingBottom: 16, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 11, color: '#888', letterSpacing: 2, fontWeight: 700 }}>영업팀 거래처 미팅 보고서</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#1a4a2e', marginTop: 4 }}>신규 거래처 미팅 결과 보고</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ background: pos.bg, color: pos.color, border: `2px solid ${pos.color}`, borderRadius: 8, padding: '5px 14px', fontWeight: 800, fontSize: 14 }}>성사 가능성: {pos.label}</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 6 }}>{g('m1')}</div>
            </div>
          </div>
        </div>

        <Sec title="1. 거래처 기본 정보" color="#1a4a2e">
          <R label="농장명" value={g('b1')} /><R label="대표자" value={g('b2')} />
          <R label="소재지" value={g('b3')} /><R label="운영 형태" value={g('b4')} />
          <R label="농장 규모" value={g('b5')} /><R label="운영 연수" value={g('b6')} />
        </Sec>
        <Sec title="2. 현재 생산 및 거래 현황" color="#2a3a5e">
          <R label="현 사용 사료" value={g('c1')} /><R label="월 사용량" value={g('c2')} />
          <R label="PSY" value={g('c3')} /><R label="FCR" value={g('c4')} />
          <R label="출하일령/체중" value={g('c5')} /><R label="주요 출하처" value={g('c6')} />
          <R label="연간 출하 두수" value={g('c7')} />
        </Sec>
        <Sec title="3. 주요 애로사항" color="#4a2a1a">
          <RW label="현 거래처 불만" value={g('p1')} />
          <R label="생산성 문제" value={arr('p2')} />
          <RW label="질병/방역 현안" value={g('p3')} />
          <R label="노동력 문제" value={g('p4')} /><RW label="경영 현안" value={g('p5')} />
        </Sec>
        <Sec title="4. 거래 니즈 및 영업 기회" color="#1a3a4a">
          <R label="변경 의향" value={g('n1')} />
          <R label="중요 조건" value={arr('n2')} />
          <R label="희망 결제조건" value={g('n3')} /><R label="기술지원 요구도" value={g('n4')} />
          <R label="시제품 테스트" value={g('n5')} /><R label="예상 거래 규모" value={g('n6')} />
        </Sec>
        <Sec title="5. 의사결정 구조" color="#3a1a4a">
          <R label="의사결정권자" value={g('d1')} />
          <RW label="결정 프로세스" value={g('d2')} />
          <R label="경쟁사 현황" value={g('d3')} /><R label="전환 기간" value={g('d4')} />
        </Sec>
        <Sec title="6. 후속 액션플랜" color="#1a3a1a">
          <R label="미팅 참석자" value={g('m2')} /><R label="미팅 분위기" value={g('m3')} />
          <RW label="차기 액션플랜" value={g('m5')} />
          <RW label="특이사항" value={g('m6')} />
        </Sec>

        <div style={{ borderTop: '1.5px solid #eee', marginTop: 20, paddingTop: 12, fontSize: 11, color: '#aaa', display: 'flex', justifyContent: 'space-between' }}>
          <span>양돈영업팀 내부 자료 (대외비)</span>
          <span>{g('m1')} 작성</span>
        </div>
      </div>
    </div>
  )
}
