import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// ── 날짜 유틸 ──────────────────────────────────────────────
const addDays = (dateStr, days) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}
const today = () => new Date().toISOString().slice(0, 10)
const fmt = (d) => d ? d.replace(/-/g, '.').slice(2) : '—'
const fmtFull = (d) => d ? d.replace(/-/g, '.') : '—'

// 이번주 월~일
function getWeekRange(offset = 0) {
  const now = new Date()
  const day = now.getDay()
  const mon = new Date(now)
  mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offset * 7)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  return {
    start: mon.toISOString().slice(0, 10),
    end:   sun.toISOString().slice(0, 10),
    label: `${fmt(mon.toISOString().slice(0,10))} ~ ${fmt(sun.toISOString().slice(0,10))}`,
  }
}

function isBetween(dateStr, start, end) {
  if (!dateStr) return false
  return dateStr >= start && dateStr <= end
}

function daysSince(dateStr) {
  if (!dateStr) return 0
  return Math.floor((new Date() - new Date(dateStr)) / 86400000)
}

// 상태 자동 계산
function calcStatus(sow, latestCycle) {
  if (sow.cull_date) return '도태'
  if (!latestCycle) return '공태'
  if (latestCycle.farrow_date && !latestCycle.wean_date) return '수유중'
  if (latestCycle.mating_date && !latestCycle.farrow_date && latestCycle.diag_result !== '재발') return '임신중'
  return '공태'
}

const STATUS_STYLE = {
  '임신중': { bg: '#E1F5EE', color: '#085041', label: '임신중' },
  '수유중': { bg: '#FEF5E7', color: '#935A07', label: '수유중' },
  '공태':   { bg: '#F5F6F4', color: '#888',    label: '공태'   },
  '도태':   { bg: '#FDECEA', color: '#C0392B', label: '도태'   },
}

// ── 날짜 입력 컴포넌트 ──────────────────────────────────────
function DateInput({ value, onChange, label, placeholder, min, max }) {
  return (
    <div style={{display:'flex',flexDirection:'column',gap:4}}>
      {label && <label style={{fontSize:11,color:'#888',fontWeight:500}}>{label}</label>}
      <input
        type="date"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        min={min} max={max}
        style={{
          background:'#F5F6F4', border:'0.5px solid rgba(0,0,0,0.12)',
          borderRadius:8, padding:'8px 10px', fontSize:13,
          color: value ? '#1a1a18' : '#aaa', fontFamily:'inherit',
          outline:'none', width:'100%'
        }}
      />
    </div>
  )
}

// ── 산차별 성적 그래프 ──────────────────────────────────────
function SowChart({ cycles }) {
  if (!cycles.length) return <div style={{color:'#aaa',fontSize:12,textAlign:'center',padding:20}}>산차 데이터 없음</div>
  const maxBorn = Math.max(...cycles.map(c => c.born_alive || 0), 1)
  const maxWeaned = Math.max(...cycles.map(c => c.weaned || 0), 1)
  return (
    <div style={{padding:'12px 0'}}>
      <div style={{fontSize:12,color:'#888',marginBottom:12}}>산차별 성적</div>
      {cycles.filter(c=>c.parity).sort((a,b)=>a.parity-b.parity).map(c => (
        <div key={c.id} style={{marginBottom:12}}>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'#888',marginBottom:4}}>
            <span>{c.parity}산차</span>
            <span>산자 {c.born_alive||0}두 / 이유 {c.weaned||0}두</span>
          </div>
          <div style={{display:'flex',gap:4,flexDirection:'column'}}>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <span style={{fontSize:10,color:'#1D9E75',width:28}}>산자</span>
              <div style={{flex:1,background:'#F1EFE8',borderRadius:99,height:10,overflow:'hidden'}}>
                <div style={{width:`${((c.born_alive||0)/maxBorn)*100}%`,height:'100%',background:'#1D9E75',borderRadius:99}}/>
              </div>
              <span style={{fontSize:10,color:'#1D9E75',width:20,textAlign:'right'}}>{c.born_alive||0}</span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <span style={{fontSize:10,color:'#378ADD',width:28}}>이유</span>
              <div style={{flex:1,background:'#F1EFE8',borderRadius:99,height:10,overflow:'hidden'}}>
                <div style={{width:`${((c.weaned||0)/maxWeaned)*100}%`,height:'100%',background:'#378ADD',borderRadius:99}}/>
              </div>
              <span style={{fontSize:10,color:'#378ADD',width:20,textAlign:'right'}}>{c.weaned||0}</span>
            </div>
          </div>
        </div>
      ))}
      <div style={{marginTop:16,paddingTop:12,borderTop:'0.5px solid rgba(0,0,0,0.07)'}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
          {[
            {label:'평균 산자수', val: cycles.filter(c=>c.born_alive>0).length ? (cycles.reduce((a,c)=>a+(c.born_alive||0),0)/cycles.filter(c=>c.born_alive>0).length).toFixed(1) : '—'},
            {label:'평균 이유두수', val: cycles.filter(c=>c.weaned>0).length ? (cycles.reduce((a,c)=>a+(c.weaned||0),0)/cycles.filter(c=>c.weaned>0).length).toFixed(1) : '—'},
            {label:'총 산차', val: cycles.length},
          ].map(({label,val}) => (
            <div key={label} style={{background:'#F5F6F4',borderRadius:8,padding:'8px 10px',textAlign:'center'}}>
              <div style={{fontSize:9,color:'#888',marginBottom:2}}>{label}</div>
              <div style={{fontSize:16,fontWeight:700,color:'#1a1a18'}}>{val}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── 개체 상세 모달 ──────────────────────────────────────────
function SowModal({ sow, cycles, onClose, onSave, onDelete, farmSlug }) {
  const [tab, setTab] = useState('info') // 'info' | 'cycle' | 'chart'
  const [selParity, setSelParity] = useState(cycles.length > 0 ? Math.max(...cycles.map(c=>c.parity)) : 1)
  const [info, setInfo] = useState({ ...sow })
  const [cycle, setCycle] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const c = cycles.find(c => c.parity === selParity)
    setCycle(c ? { ...c } : {
      parity: selParity, mating_date:'', recheck_date:'', estrus_date:'',
      diag_result:'', expected_farrow:'', farrow_date:'',
      born_alive:0, born_dead:0, wean_date:'', weaned:0, notes:''
    })
  }, [selParity, cycles])

  function onMatingChange(val) {
    setCycle(prev => ({
      ...prev,
      mating_date: val,
      recheck_date: addDays(val, 21),
      estrus_date:  addDays(val, 28),
      expected_farrow: addDays(val, 114),
    }))
  }

  async function handleSave() {
    setSaving(true)
    await onSave(info, cycle, cycles)
    setSaving(false)
    onClose()
  }

  async function handleCull() {
    if (!confirm('도태 처리하시겠어요?')) return
    const cullDate = prompt('도태일 (YYYY-MM-DD):', today())
    const cullReason = prompt('도태사유:', '저능력')
    if (!cullDate) return
    setSaving(true)
    await onSave({ ...info, cull_date: cullDate, cull_reason: cullReason, status: '도태' }, cycle, cycles)
    setSaving(false)
    onClose()
  }

  const maxParity = cycles.length > 0 ? Math.max(...cycles.map(c=>c.parity)) : 0
  const parityOptions = [...Array(maxParity + 2).keys()].slice(1)

  return (
    <div
      style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:1000,
        display:'flex',alignItems:'center',justifyContent:'center',padding:'16px'}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:'white',borderRadius:16,width:'100%',maxWidth:480,maxHeight:'88vh',
        overflow:'hidden',display:'flex',flexDirection:'column',boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}
        onClick={e=>e.stopPropagation()}>

        {/* 헤더 */}
        <div style={{padding:'16px 16px 0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <div style={{fontSize:16,fontWeight:700}}>{sow.sow_id}</div>
            <div style={{fontSize:11,color:'#888'}}>{sow.breed || '품종 미등록'} · {sow.birth_date ? fmtFull(sow.birth_date) : '생년월일 미등록'}</div>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            {!sow.cull_date && (
              <button onClick={handleCull} style={{background:'#FDECEA',color:'#C0392B',border:'none',borderRadius:7,padding:'6px 10px',fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>도태</button>
            )}
            <button onClick={onClose} style={{background:'#F5F6F4',border:'none',borderRadius:7,padding:'6px 10px',fontSize:13,cursor:'pointer'}}>✕</button>
          </div>
        </div>

        {/* 탭 */}
        <div style={{display:'flex',gap:0,padding:'12px 16px 0',borderBottom:'0.5px solid rgba(0,0,0,0.08)'}}>
          {[['info','기본정보'],['cycle','번식이력'],['chart','성적그래프']].map(([key,label])=>(
            <button key={key} onClick={()=>setTab(key)}
              style={{flex:1,padding:'8px 4px',border:'none',borderBottom:`2px solid ${tab===key?'#1D9E75':'transparent'}`,
                background:'transparent',fontFamily:'inherit',fontSize:13,fontWeight:tab===key?700:400,
                color:tab===key?'#1D9E75':'#888',cursor:'pointer'}}>
              {label}
            </button>
          ))}
        </div>

        {/* 콘텐츠 */}
        <div style={{flex:1,overflowY:'auto',padding:16}}>

          {/* 기본정보 탭 */}
          {tab==='info' && (
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <div style={{display:'flex',flexDirection:'column',gap:4}}>
                  <label style={{fontSize:11,color:'#888'}}>개체번호</label>
                  <input value={info.sow_id||''} onChange={e=>setInfo(p=>({...p,sow_id:e.target.value}))}
                    style={{background:'#F5F6F4',border:'0.5px solid rgba(0,0,0,0.12)',borderRadius:8,padding:'8px 10px',fontSize:13,fontFamily:'inherit',outline:'none'}}/>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:4}}>
                  <label style={{fontSize:11,color:'#888'}}>품종</label>
                  <select value={info.breed||''} onChange={e=>setInfo(p=>({...p,breed:e.target.value}))}
                    style={{background:'#F5F6F4',border:'0.5px solid rgba(0,0,0,0.12)',borderRadius:8,padding:'8px 10px',fontSize:13,fontFamily:'inherit',outline:'none'}}>
                    <option value=''>선택</option>
                    {['LYD','LY','LD','YD','순종L','순종Y','순종D','기타'].map(b=><option key={b}>{b}</option>)}
                  </select>
                </div>
              </div>
              <DateInput label="생년월일" value={info.birth_date} onChange={v=>setInfo(p=>({...p,birth_date:v}))}/>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <DateInput label="입식일" value={info.entry_date} onChange={v=>setInfo(p=>({...p,entry_date:v}))}/>
                <div style={{display:'flex',flexDirection:'column',gap:4}}>
                  <label style={{fontSize:11,color:'#888'}}>입식경로</label>
                  <select value={info.entry_type||''} onChange={e=>setInfo(p=>({...p,entry_type:e.target.value}))}
                    style={{background:'#F5F6F4',border:'0.5px solid rgba(0,0,0,0.12)',borderRadius:8,padding:'8px 10px',fontSize:13,fontFamily:'inherit',outline:'none'}}>
                    <option value=''>선택</option>
                    <option>자가생산</option>
                    <option>구입</option>
                  </select>
                </div>
              </div>
              {info.entry_type==='구입' && (
                <div style={{display:'flex',flexDirection:'column',gap:4}}>
                  <label style={{fontSize:11,color:'#888'}}>구입처</label>
                  <input value={info.entry_from||''} onChange={e=>setInfo(p=>({...p,entry_from:e.target.value}))}
                    style={{background:'#F5F6F4',border:'0.5px solid rgba(0,0,0,0.12)',borderRadius:8,padding:'8px 10px',fontSize:13,fontFamily:'inherit',outline:'none'}}/>
                </div>
              )}
              {sow.cull_date && (
                <div style={{background:'#FDECEA',borderRadius:10,padding:12}}>
                  <div style={{fontSize:11,color:'#C0392B',fontWeight:600,marginBottom:4}}>도태 처리됨</div>
                  <div style={{fontSize:12,color:'#888'}}>도태일: {fmtFull(sow.cull_date)} · 사유: {sow.cull_reason||'—'}</div>
                </div>
              )}
            </div>
          )}

          {/* 번식이력 탭 */}
          {tab==='cycle' && cycle && (
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              {/* 산차 선택 */}
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <label style={{fontSize:12,color:'#888',whiteSpace:'nowrap'}}>산차 선택</label>
                <select value={selParity} onChange={e=>setSelParity(Number(e.target.value))}
                  style={{flex:1,background:'#F5F6F4',border:'0.5px solid rgba(0,0,0,0.12)',borderRadius:8,padding:'7px 10px',fontSize:13,fontFamily:'inherit',outline:'none'}}>
                  {parityOptions.map(p=>(
                    <option key={p} value={p}>{p}산차 {cycles.find(c=>c.parity===p) ? '✓' : '(신규)'}</option>
                  ))}
                </select>
              </div>

              {/* 종부 */}
              <div style={{background:'#F0FAF5',borderRadius:10,padding:12}}>
                <div style={{fontSize:12,fontWeight:600,color:'#085041',marginBottom:8}}>🐷 종부</div>
                <DateInput label="종부일" value={cycle.mating_date} onChange={onMatingChange}/>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:8}}>
                  <div style={{display:'flex',flexDirection:'column',gap:4}}>
                    <label style={{fontSize:11,color:'#888'}}>재발확인일 (+21일)</label>
                    <input readOnly value={fmtFull(cycle.recheck_date)}
                      style={{background:'#E1F5EE',border:'none',borderRadius:8,padding:'8px 10px',fontSize:12,color:'#085041',fontWeight:600}}/>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:4}}>
                    <label style={{fontSize:11,color:'#888'}}>발정확인일 (+28일)</label>
                    <input readOnly value={fmtFull(cycle.estrus_date)}
                      style={{background:'#E1F5EE',border:'none',borderRadius:8,padding:'8px 10px',fontSize:12,color:'#085041',fontWeight:600}}/>
                  </div>
                </div>
              </div>

              {/* 임신진단 */}
              <div style={{background:'#EBF5FB',borderRadius:10,padding:12}}>
                <div style={{fontSize:12,fontWeight:600,color:'#0C447C',marginBottom:8}}>🔍 임신진단</div>
                <div style={{display:'flex',gap:8}}>
                  {['수태','재발'].map(r=>(
                    <button key={r} onClick={()=>setCycle(p=>({...p,diag_result:r}))}
                      style={{flex:1,padding:'8px',border:`1.5px solid ${cycle.diag_result===r?'#378ADD':'rgba(0,0,0,0.1)'}`,
                        borderRadius:8,background:cycle.diag_result===r?'#378ADD':'white',
                        color:cycle.diag_result===r?'white':'#888',fontFamily:'inherit',fontSize:13,cursor:'pointer',fontWeight:cycle.diag_result===r?700:400}}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* 분만 */}
              <div style={{background:'#FEF5E7',borderRadius:10,padding:12}}>
                <div style={{fontSize:12,fontWeight:600,color:'#935A07',marginBottom:8}}>🍼 분만</div>
                <div style={{display:'flex',flexDirection:'column',gap:4,marginBottom:8}}>
                  <label style={{fontSize:11,color:'#888'}}>분만예정일 (+114일)</label>
                  <input readOnly value={fmtFull(cycle.expected_farrow)}
                    style={{background:'#FAEEDA',border:'none',borderRadius:8,padding:'8px 10px',fontSize:12,color:'#935A07',fontWeight:600}}/>
                </div>
                <DateInput label="실제 분만일" value={cycle.farrow_date} onChange={v=>setCycle(p=>({...p,farrow_date:v}))}/>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:8}}>
                  <div style={{display:'flex',flexDirection:'column',gap:4}}>
                    <label style={{fontSize:11,color:'#888'}}>생존산자</label>
                    <input type="number" value={cycle.born_alive||''} onChange={e=>setCycle(p=>({...p,born_alive:Number(e.target.value)}))}
                      style={{background:'#F5F6F4',border:'0.5px solid rgba(0,0,0,0.12)',borderRadius:8,padding:'8px 10px',fontSize:13,fontFamily:'inherit',outline:'none'}}/>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:4}}>
                    <label style={{fontSize:11,color:'#888'}}>사산</label>
                    <input type="number" value={cycle.born_dead||''} onChange={e=>setCycle(p=>({...p,born_dead:Number(e.target.value)}))}
                      style={{background:'#F5F6F4',border:'0.5px solid rgba(0,0,0,0.12)',borderRadius:8,padding:'8px 10px',fontSize:13,fontFamily:'inherit',outline:'none'}}/>
                  </div>
                </div>
              </div>

              {/* 이유 */}
              <div style={{background:'#F5F6F4',borderRadius:10,padding:12}}>
                <div style={{fontSize:12,fontWeight:600,color:'#555',marginBottom:8}}>🌿 이유</div>
                <DateInput label="이유일" value={cycle.wean_date} onChange={v=>setCycle(p=>({...p,wean_date:v}))}/>
                <div style={{marginTop:8,display:'flex',flexDirection:'column',gap:4}}>
                  <label style={{fontSize:11,color:'#888'}}>이유두수</label>
                  <input type="number" value={cycle.weaned||''} onChange={e=>setCycle(p=>({...p,weaned:Number(e.target.value)}))}
                    style={{background:'white',border:'0.5px solid rgba(0,0,0,0.12)',borderRadius:8,padding:'8px 10px',fontSize:13,fontFamily:'inherit',outline:'none'}}/>
                </div>
              </div>

              {/* 메모 */}
              <div style={{display:'flex',flexDirection:'column',gap:4}}>
                <label style={{fontSize:11,color:'#888'}}>메모</label>
                <textarea value={cycle.notes||''} onChange={e=>setCycle(p=>({...p,notes:e.target.value}))}
                  rows={2} style={{background:'#F5F6F4',border:'0.5px solid rgba(0,0,0,0.12)',borderRadius:8,padding:'8px 10px',fontSize:13,fontFamily:'inherit',outline:'none',resize:'none'}}/>
              </div>
            </div>
          )}

          {/* 성적그래프 탭 */}
          {tab==='chart' && <SowChart cycles={cycles}/>}
        </div>

        {/* 저장 버튼 */}
        {tab !== 'chart' && (
          <div style={{padding:16,borderTop:'0.5px solid rgba(0,0,0,0.08)',display:'flex',gap:8}}>
            <button onClick={()=>onDelete(sow.id)}
              style={{padding:'11px 16px',background:'#F5F6F4',border:'none',borderRadius:9,fontSize:13,color:'#C0392B',cursor:'pointer',fontFamily:'inherit'}}>
              삭제
            </button>
            <button onClick={handleSave} disabled={saving}
              style={{flex:1,padding:'11px',background:'#0F2A1E',color:'white',border:'none',borderRadius:9,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── 대시보드 카드 ───────────────────────────────────────────
function DashCard({ label, count, color, bg, onClick, sows }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <div onClick={()=>{ setOpen(v=>!v); onClick?.() }}
        style={{background:bg,borderRadius:10,padding:'12px 14px',cursor:'pointer',border:`0.5px solid ${color}30`}}>
        <div style={{fontSize:11,color,fontWeight:600,marginBottom:2}}>{label}</div>
        <div style={{fontSize:22,fontWeight:800,color}}>{count}<span style={{fontSize:12,marginLeft:2,fontWeight:400}}>복</span></div>
      </div>
      {open && sows.length > 0 && (
        <div style={{marginTop:4,background:'white',border:'0.5px solid rgba(0,0,0,0.08)',borderRadius:8,overflow:'hidden'}}>
          {sows.map((s,i) => (
            <div key={s.id} style={{padding:'8px 12px',borderBottom:i<sows.length-1?'0.5px solid rgba(0,0,0,0.05)':'none',fontSize:12}}>
              <div style={{fontWeight:600}}>{s.sow_id}</div>
              <div style={{color:'#888',fontSize:11}}>
                {s._dashLabel}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── 메인 SowPage ───────────────────────────────────────────
export default function SowPage({ farmSlug }) {
  const [sows, setSows] = useState([])
  const [cycles, setCycles] = useState([]) // 전체 사이클
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('전체')
  const [search, setSearch] = useState('')
  const [modalSow, setModalSow] = useState(null)
  const [modalCycles, setModalCycles] = useState([])
  const [showAdd, setShowAdd] = useState(false)

  const thisWeek = getWeekRange(0)
  const nextWeek = getWeekRange(1)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: sowData } = await supabase.from('sow_records').select('*')
      .eq('farm_slug', farmSlug).order('sow_id')
    const { data: cycleData } = await supabase.from('sow_cycles').select('*')
      .eq('farm_slug', farmSlug)
    setSows(sowData || [])
    setCycles(cycleData || [])
    setLoading(false)
  }, [farmSlug])

  useEffect(() => { load() }, [load])

  // 각 모돈의 최신 사이클
  function latestCycle(sowId) {
    const cs = cycles.filter(c => c.sow_record_id === sowId)
    if (!cs.length) return null
    return cs.reduce((a, b) => a.parity > b.parity ? a : b)
  }

  // 상태 계산된 모돈 목록
  const sowsWithStatus = sows.map(s => {
    const lc = latestCycle(s.id)
    const status = calcStatus(s, lc)
    const parity = cycles.filter(c => c.sow_record_id === s.id).length
    return { ...s, _status: status, _latestCycle: lc, _parity: parity }
  })

  // 정렬: 임신중 → 수유중 → 공태 → 도태
  const ORDER = { '임신중': 0, '수유중': 1, '공태': 2, '도태': 3 }
  const sorted = [...sowsWithStatus].sort((a, b) => {
    if (ORDER[a._status] !== ORDER[b._status]) return ORDER[a._status] - ORDER[b._status]
    if (a._status === '임신중') return (a._latestCycle?.expected_farrow || '') < (b._latestCycle?.expected_farrow || '') ? -1 : 1
    if (a._status === '공태') return daysSince(a._latestCycle?.wean_date || a.entry_date) > daysSince(b._latestCycle?.wean_date || b.entry_date) ? -1 : 1
    return 0
  })

  // 필터
  const filtered = sorted.filter(s => {
    if (filter !== '전체' && s._status !== filter) return false
    if (search && !s.sow_id.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  // 대시보드 집계
  const dashData = {
    thisfarrow: sowsWithStatus.filter(s => isBetween(s._latestCycle?.expected_farrow, thisWeek.start, thisWeek.end))
      .map(s => ({ ...s, _dashLabel: `분만예정 ${fmtFull(s._latestCycle?.expected_farrow)}` })),
    nextfarrow: sowsWithStatus.filter(s => isBetween(s._latestCycle?.expected_farrow, nextWeek.start, nextWeek.end))
      .map(s => ({ ...s, _dashLabel: `분만예정 ${fmtFull(s._latestCycle?.expected_farrow)}` })),
    recheck: sowsWithStatus.filter(s => isBetween(s._latestCycle?.recheck_date, thisWeek.start, thisWeek.end))
      .map(s => ({ ...s, _dashLabel: `재발확인 ${fmtFull(s._latestCycle?.recheck_date)}` })),
    estrus: sowsWithStatus.filter(s => isBetween(s._latestCycle?.estrus_date, thisWeek.start, thisWeek.end))
      .map(s => ({ ...s, _dashLabel: `발정확인 ${fmtFull(s._latestCycle?.estrus_date)}` })),
    wean: sowsWithStatus.filter(s => {
      if (!s._latestCycle?.farrow_date || s._latestCycle?.wean_date) return false
      const expectedWean = addDays(s._latestCycle.farrow_date, 21)
      return isBetween(expectedWean, thisWeek.start, thisWeek.end)
    }).map(s => ({ ...s, _dashLabel: `이유예정 ${fmtFull(addDays(s._latestCycle?.farrow_date, 21))}` })),
  }

  // 모달 열기
  async function openModal(sow) {
    const cs = cycles.filter(c => c.sow_record_id === sow.id)
    setModalSow(sow)
    setModalCycles(cs)
  }

  // 저장
  async function handleSave(info, cycle, sowCycles) {
    // 1. 모돈 기본정보 저장
    const { data: savedSow, error } = await supabase.from('sow_records').upsert({
      ...info, farm_slug: farmSlug,
    }, { onConflict: 'farm_slug,sow_id' }).select().single()

    if (error || !savedSow) { console.error(error); return }

    // 2. 사이클 저장 (modalCycles 기준으로 existing 찾기)
    if (cycle && cycle.parity) {
      const existing = (sowCycles||[]).find(c => c.sow_record_id === savedSow.id && c.parity === cycle.parity)
      if (existing) {
        await supabase.from('sow_cycles').update({
          ...cycle, sow_record_id: savedSow.id, farm_slug: farmSlug
        }).eq('id', existing.id)
      } else {
        // 신규 산차 — 종부일 없어도 저장 허용
        await supabase.from('sow_cycles').insert({
          ...cycle, sow_record_id: savedSow.id, farm_slug: farmSlug
        })
      }
    }
    await load()
  }

  // 삭제
  async function handleDelete(sowId) {
    if (!confirm('모돈을 삭제할까요? 번식이력도 모두 삭제됩니다.')) return
    await supabase.from('sow_records').delete().eq('id', sowId)
    setModalSow(null)
    await load()
  }

  // 엑셀 다운로드 (주간 양식)
  function downloadWeekly() {
    const rows = [
      ['[이번 주 분만예정] ' + thisWeek.label],
      ['개체번호','종부일','분만예정일','실제분만일','생존산자','사산','비고'],
      ...dashData.thisfarrow.map(s => [s.sow_id, fmtFull(s._latestCycle?.mating_date), fmtFull(s._latestCycle?.expected_farrow),'','','','']),
      [],
      ['[다음 주 분만예정] ' + nextWeek.label],
      ['개체번호','종부일','분만예정일','실제분만일','생존산자','사산','비고'],
      ...dashData.nextfarrow.map(s => [s.sow_id, fmtFull(s._latestCycle?.mating_date), fmtFull(s._latestCycle?.expected_farrow),'','','','']),
      [],
      ['[이번 주 재발확인] ' + thisWeek.label],
      ['개체번호','종부일','재발확인일','결과(수태/재발)','비고'],
      ...dashData.recheck.map(s => [s.sow_id, fmtFull(s._latestCycle?.mating_date), fmtFull(s._latestCycle?.recheck_date),'','']),
      [],
      ['[이번 주 발정확인] ' + thisWeek.label],
      ['개체번호','종부일','발정확인일','결과','비고'],
      ...dashData.estrus.map(s => [s.sow_id, fmtFull(s._latestCycle?.mating_date), fmtFull(s._latestCycle?.estrus_date),'','']),
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `모돈주간보고_${thisWeek.start}.csv`; a.click()
  }

  if (loading) return <div style={{padding:32,textAlign:'center',color:'#888',fontSize:13}}>로딩 중...</div>

  return (
    <div>
      {/* 대시보드 카드 */}
      <div style={{marginBottom:14}}>
        <div style={{fontSize:12,color:'#888',marginBottom:8}}>이번 주 ({thisWeek.label})</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:8}}>
          <DashCard label="분만예정" count={dashData.thisfarrow.length} color="#085041" bg="#E1F5EE" sows={dashData.thisfarrow}/>
          <DashCard label="재발확인" count={dashData.recheck.length}   color="#0C447C" bg="#EBF5FB" sows={dashData.recheck}/>
          <DashCard label="발정확인" count={dashData.estrus.length}    color="#633806" bg="#FAEEDA" sows={dashData.estrus}/>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          <DashCard label="다음 주 분만예정" count={dashData.nextfarrow.length} color="#378ADD" bg="#EBF5FB" sows={dashData.nextfarrow}/>
          <DashCard label="이유예정" count={dashData.wean.length} color="#935A07" bg="#FEF5E7" sows={dashData.wean}/>
        </div>
      </div>

      {/* 상단 액션 */}
      <div style={{display:'flex',gap:8,marginBottom:12,alignItems:'center',flexWrap:'wrap'}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="개체번호 검색"
          style={{flex:1,minWidth:120,background:'white',border:'0.5px solid rgba(0,0,0,0.12)',borderRadius:8,padding:'8px 12px',fontSize:13,fontFamily:'inherit',outline:'none'}}/>
        <button onClick={downloadWeekly}
          style={{padding:'8px 12px',background:'#F5F6F4',border:'0.5px solid rgba(0,0,0,0.12)',borderRadius:8,fontSize:12,cursor:'pointer',fontFamily:'inherit',color:'#555'}}>
          📥 주간양식
        </button>
        <button onClick={()=>{ setModalSow({ sow_id:'', breed:'', birth_date:'', entry_date:'', entry_type:'', entry_from:'', farm_slug: farmSlug }); setModalCycles([]) }}
          style={{padding:'8px 14px',background:'#0F2A1E',color:'white',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
          + 추가
        </button>
      </div>

      {/* 상태 필터 */}
      <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap'}}>
        {['전체','임신중','수유중','공태','도태'].map(f=>(
          <button key={f} onClick={()=>setFilter(f)}
            style={{padding:'5px 12px',border:`0.5px solid ${filter===f?'#1D9E75':'rgba(0,0,0,0.12)'}`,
              borderRadius:99,background:filter===f?'#1D9E75':'white',color:filter===f?'white':'#555',
              fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>
            {f} {f!=='전체'?`${sowsWithStatus.filter(s=>s._status===f).length}`:''}
          </button>
        ))}
      </div>

      {/* 모돈 목록 */}
      <div style={{background:'white',border:'0.5px solid rgba(0,0,0,0.08)',borderRadius:12,overflow:'hidden'}}>
        {/* 헤더 */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 80px 50px 90px 90px 70px',gap:0,
          background:'#F5F6F4',padding:'8px 12px',fontSize:11,color:'#888',fontWeight:600}}>
          <span>개체번호</span><span>생년월일</span><span>산차</span><span>종부일</span><span>분만예정일</span><span>상태</span>
        </div>

        {filtered.length === 0 && (
          <div style={{padding:'32px',textAlign:'center',color:'#aaa',fontSize:13}}>모돈을 추가해주세요</div>
        )}

        {filtered.map((s, i) => {
          const lc = s._latestCycle
          const st = STATUS_STYLE[s._status] || STATUS_STYLE['공태']
          const isCulled = s._status === '도태'
          const cullDays = s._status === '공태' ? daysSince(lc?.wean_date || s.entry_date) : 0

          return (
            <div key={s.id} onClick={()=>openModal(s)}
              style={{display:'grid',gridTemplateColumns:'1fr 80px 50px 90px 90px 70px',gap:0,
                padding:'10px 12px',borderBottom:i<filtered.length-1?'0.5px solid rgba(0,0,0,0.05)':'none',
                cursor:'pointer',opacity:isCulled?0.5:1,
                background:i%2===0?'white':'#FAFAFA',
                transition:'background 0.15s'}}
              onMouseEnter={e=>e.currentTarget.style.background='#F0FAF5'}
              onMouseLeave={e=>e.currentTarget.style.background=i%2===0?'white':'#FAFAFA'}>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:'#1a1a18'}}>{s.sow_id}</div>
                <div style={{fontSize:10,color:'#aaa'}}>{s.breed||'—'}</div>
              </div>
              <div style={{fontSize:12,color:'#555',alignSelf:'center'}}>{s.birth_date ? fmt(s.birth_date) : '—'}</div>
              <div style={{fontSize:13,fontWeight:600,color:'#1a1a18',alignSelf:'center'}}>{s._parity || 0}</div>
              <div style={{fontSize:12,color:'#555',alignSelf:'center'}}>{lc?.mating_date ? fmt(lc.mating_date) : '—'}</div>
              <div style={{fontSize:12,alignSelf:'center'}}>
                {lc?.expected_farrow ? (
                  <span style={{color: lc.expected_farrow <= today() ? '#C0392B' : '#085041', fontWeight:600}}>
                    {fmt(lc.expected_farrow)}
                  </span>
                ) : '—'}
              </div>
              <div style={{alignSelf:'center'}}>
                <span style={{fontSize:11,padding:'2px 8px',borderRadius:99,background:st.bg,color:st.color,fontWeight:600,whiteSpace:'nowrap'}}>
                  {st.label}
                  {s._status==='공태'&&cullDays>0?` ${cullDays}일`:''}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* 하단 요약 */}
      <div style={{marginTop:10,fontSize:11,color:'#aaa',textAlign:'right'}}>
        총 {sows.filter(s=>!s.cull_date).length}두 (임신 {sowsWithStatus.filter(s=>s._status==='임신중').length} / 수유 {sowsWithStatus.filter(s=>s._status==='수유중').length} / 공태 {sowsWithStatus.filter(s=>s._status==='공태').length})
      </div>

      {/* 모달 */}
      {modalSow && (
        <SowModal
          sow={modalSow}
          cycles={modalCycles}
          farmSlug={farmSlug}
          onClose={()=>setModalSow(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}
