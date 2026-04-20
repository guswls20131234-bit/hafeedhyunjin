const getPossibility = (val) => {
  if (!val) return { label: '-', color: '#999', bg: '#f5f5f5' }
  if (val.includes('90%')) return { label: 'HIGH', color: '#1a7a1a', bg: '#e8f5e8' }
  if (val.includes('60')) return { label: 'MED-HIGH', color: '#5a6a00', bg: '#f5f5e0' }
  if (val.includes('30~60')) return { label: 'MEDIUM', color: '#a06000', bg: '#fff3e0' }
  return { label: 'LOW', color: '#a01a1a', bg: '#fde8e8' }
}

function HistoryCard({ row, onLoad, onDelete, onReport }) {
  const pos = getPossibility(row.possibility)
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8e8e8', padding: '16px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16, color: '#1a4a2e' }}>{row.farm_name || '(농장명 미입력)'}</div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
            {[row.location, row.meeting_date].filter(Boolean).join(' · ')}
          </div>
        </div>
        <div style={{ background: pos.bg, color: pos.color, border: `1.5px solid ${pos.color}`, borderRadius: 6, padding: '3px 10px', fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap' }}>{pos.label}</div>
      </div>
      <div style={{ fontSize: 13, color: '#666' }}>
        {[row.farm_type, row.farm_scale, row.expected_volume ? `예상규모: ${row.expected_volume}` : ''].filter(Boolean).join(' · ')}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button onClick={() => onReport(row)} style={{ flex: 1, background: '#1a4a2e', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 0', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>📋 보고서</button>
        <button onClick={() => onLoad(row)} style={{ flex: 1, background: '#eaf3ee', color: '#1a4a2e', border: '1.5px solid #2d7a4f', borderRadius: 7, padding: '8px 0', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>✏️ 수정</button>
        <button onClick={() => onDelete(row.id)} style={{ background: '#fff5f5', color: '#cc4444', border: '1.5px solid #f5c0c0', borderRadius: 7, padding: '8px 14px', cursor: 'pointer', fontSize: 13 }}>🗑️</button>
      </div>
      <div style={{ fontSize: 11, color: '#ccc', textAlign: 'right' }}>
        저장: {new Date(row.created_at).toLocaleString('ko-KR')}
        {row.updated_at !== row.created_at && ` · 수정: ${new Date(row.updated_at).toLocaleString('ko-KR')}`}
      </div>
    </div>
  )
}

export default function HistoryList({ history, loading, onNew, onLoad, onDelete, onReport }) {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '18px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontWeight: 800, fontSize: 18, color: '#1a4a2e' }}>
          📁 미팅 히스토리 <span style={{ fontWeight: 400, fontSize: 14, color: '#888' }}>({history.length}건)</span>
        </div>
        <button onClick={onNew} style={{ background: '#1a4a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>+ 새 미팅 작성</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#aaa', fontSize: 15 }}>⏳ Supabase에서 불러오는 중...</div>
      ) : history.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: '#fff', borderRadius: 14, color: '#aaa', fontSize: 15, boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
          저장된 미팅 기록이 없습니다.
          <br />
          <button onClick={onNew} style={{ marginTop: 16, background: '#1a4a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>첫 미팅 작성하기</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
          {history.map((row) => (
            <HistoryCard key={row.id} row={row} onLoad={onLoad} onDelete={onDelete} onReport={onReport} />
          ))}
        </div>
      )}
    </div>
  )
}
