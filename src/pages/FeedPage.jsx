import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import * as XLSX from 'xlsx'

const SECTIONS = [
  { key:'piglet',    label:'자돈 구간', color:'#378ADD', bg:'#E6F1FB', feeds:['초유밀','자돈1호','자돈2호','자돈3호'] },
  { key:'lactation', label:'젖돈 구간', color:'#7B3FAB', bg:'#F0E6FB', feeds:['체인지','1호사료'] },
  { key:'fattening', label:'비육 구간', color:'#BA7517', bg:'#FAEEDA', feeds:['2호사료'] },
  { key:'sow',       label:'모돈 구간', color:'#1D9E75', bg:'#E1F5EE', feeds:['임신돈','포유돈'] },
  { key:'etc',       label:'기타',      color:'#5F5E5A', bg:'#F1EFE8', feeds:['기타1','기타2'] },
]
const ALL_FEEDS = SECTIONS.flatMap(s => s.feeds.map(f => ({section:s.key, sectionLabel:s.label, feed:f})))
const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']
const NOW = new Date()
function pct(v,t){ return t ? Math.round(v/t*100) : 0 }

// ── 거래원장 파싱 ─────────────────────────────────────
function parseWonJang(arrayBuffer) {
  const wb   = XLSX.read(arrayBuffer, { type:'array', cellDates:false })
  const ws   = wb.Sheets[wb.SheetNames[0]]
  const json = XLSX.utils.sheet_to_json(ws, { header:1, defval:'', raw:true })

  let year = NOW.getFullYear(), month = NOW.getMonth()+1
  for (let i=0; i<6; i++) {
    const row = json[i] || []
    for (const v of row) {
      const m = String(v).match(/(\d{4})-(\d{2})-\d{2}\s*~/)
      if (m) { year = parseInt(m[1]); month = parseInt(m[2]); break }
    }
  }

  let farmName = ''
  for (let i=0; i<5; i++) {
    const row = json[i] || []
    for (let ci=0; ci<row.length; ci++) {
      if (String(row[ci]).includes('거래선') || String(row[ci]).includes('거 래 선')) {
        farmName = String(row[ci+1]||'').trim(); break
      }
    }
    if (farmName) break
  }

  const products = []
  for (let i=json.length-1; i>=0; i--) {
    const row = json[i]
    const name = String(row[0]||'').trim()
    if (!name || name.includes('합') || name.includes('계') || name.includes('Page') || name.includes('거래')) continue
    if (/^\d{2}-\d{2}/.test(name)) continue
    const kg  = parseFloat(row[6]||0)
    const won = parseFloat(row[8]||0)
    if (name && kg > 0) products.unshift({ name, kg, won })
  }

  if (!products.length) {
    let summaryStart = -1
    for (let i=json.length-1; i>=0; i--) {
      const name = String(json[i][0]||'').trim()
      if (name.includes('합') || name.includes('월 계') || name.includes('월계')) { summaryStart = i+1; break }
    }
    if (summaryStart > 0) {
      for (let i=summaryStart; i<json.length; i++) {
        const row = json[i]
        const name = String(row[0]||'').trim()
        const kg   = parseFloat(row[6]||0)
        const won  = parseFloat(row[8]||0)
        if (name && kg > 0) products.push({ name, kg, won })
      }
    }
  }

  return { year, month, farmName, products }
}

// ── 거래원장 매핑 UI ──────────────────────────────────
function MappingModal({ result, farmSlug, onDone, onCancel }) {
  const [mappings, setMappings] = useState(() =>
    result.products.map(p => ({ ...p, section:'', feed:'' }))
  )
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null)

  async function handleSave() {
    const valid = mappings.filter(m => m.section && m.feed)
    if (!valid.length) { setStatus('❌ 최소 1개 이상 매핑해주세요.'); return }
    setSaving(true)

    const merged = {}
    for (const m of valid) {
      const key = `${m.section}__${m.feed}`
      if (!merged[key]) merged[key] = { section:m.section, feed:m.feed, kg:0, won:0 }
      merged[key].kg  += m.kg  || 0
      merged[key].won += m.won || 0
    }

    const { data: existing } = await supabase.from('feed_records').select('*')
      .eq('farm_slug', farmSlug).eq('year', result.year).eq('month', result.month)

    for (const m of Object.values(merged)) {
      const prev = existing?.find(r => r.section===m.section && r.feed_name===m.feed)
      await supabase.from('feed_records').upsert({
        farm_slug: farmSlug,
        year: result.year, month: result.month,
        section: m.section, feed_name: m.feed,
        amount_kg:  (prev ? Number(prev.amount_kg||0)  : 0) + m.kg,
        amount_won: (prev ? Number(prev.amount_won||0) : 0) + m.won,
      }, { onConflict: 'farm_slug,year,month,section,feed_name' })
    }

    setSaving(false)
    onDone()
  }

  const inp = { border:'0.5px solid rgba(0,0,0,0.12)', borderRadius:6, padding:'5px 8px', fontSize:12, fontFamily:'inherit', background:'white', outline:'none' }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div style={{background:'white',borderRadius:16,padding:20,width:'100%',maxWidth:500,maxHeight:'85vh',overflowY:'auto'}}>
        <div style={{fontSize:15,fontWeight:700,marginBottom:4}}>거래원장 매핑</div>
        <div style={{fontSize:12,color:'#888',marginBottom:16}}>
          {result.farmName} · {result.year}년 {result.month}월 · {result.products.length}개 제품
        </div>

        {result.products.map((p,i) => (
          <div key={i} style={{background:'#F5F6F4',borderRadius:10,padding:'12px 14px',marginBottom:10}}>
            <div style={{fontSize:13,fontWeight:600,marginBottom:2}}>{p.name}</div>
            <div style={{fontSize:11,color:'#888',marginBottom:10}}>
              {p.kg.toLocaleString()} kg {p.won>0?`· ${p.won.toLocaleString()}원`:''}
            </div>
            <div style={{display:'flex',gap:8}}>
              <select value={mappings[i].section}
                onChange={e => setMappings(ms => ms.map((m,j) => j===i ? {...m, section:e.target.value, feed:''} : m))}
                style={{...inp, flex:1}}>
                <option value=''>구간 선택</option>
                {SECTIONS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
              <select value={mappings[i].feed}
                onChange={e => setMappings(ms => ms.map((m,j) => j===i ? {...m, feed:e.target.value} : m))}
                style={{...inp, flex:1}}
                disabled={!mappings[i].section}>
                <option value=''>사료 선택</option>
                {(SECTIONS.find(s=>s.key===mappings[i].section)?.feeds||[]).map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>
        ))}

        {(() => {
          const merged = {}
          mappings.filter(m=>m.section&&m.feed).forEach(m=>{
            const k=`${m.section}__${m.feed}`
            if(!merged[k]) merged[k]={sectionLabel:SECTIONS.find(s=>s.key===m.section)?.label,feed:m.feed,kg:0}
            merged[k].kg += m.kg||0
          })
          const dupes = Object.values(merged).filter(m=>m.kg>0)
          if(!dupes.length) return null
          const hasMulti = mappings.filter(m=>m.section&&m.feed).length > dupes.length
          return (
            <div style={{background:hasMulti?'#E6F1FB':'#F5F6F4',borderRadius:8,padding:'10px 12px',marginBottom:12}}>
              <div style={{fontSize:11,fontWeight:600,color:hasMulti?'#0C447C':'#888',marginBottom:6}}>
                {hasMulti?'⚡ 합산 저장 미리보기':'저장 미리보기'}
              </div>
              {dupes.map((m,i)=>(
                <div key={i} style={{fontSize:11,color:'#555',marginBottom:2}}>
                  {m.sectionLabel} · {m.feed} → <b>{m.kg.toLocaleString()} kg</b>
                </div>
              ))}
            </div>
          )
        })()}

        {status && <div style={{fontSize:12,color:'#A32D2D',marginBottom:10}}>{status}</div>}
        <div style={{display:'flex',gap:8}}>
          <button onClick={handleSave} disabled={saving}
            style={{flex:1,padding:'10px',background:'#1D9E75',color:'white',border:'none',borderRadius:8,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
            {saving?'저장 중...':'저장'}
          </button>
          <button onClick={onCancel}
            style={{padding:'10px 16px',background:'white',border:'0.5px solid rgba(0,0,0,0.12)',borderRadius:8,fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#555'}}>
            취소
          </button>
        </div>
      </div>
    </div>
  )
}

// ── SectionCard ───────────────────────────────────────
function SectionCard({ section, records, onSave, year, month, grandTotalKg, grandTotalWon, farmSlug, showWon }) {
  const [editing, setEditing] = useState(false)
  const [vals, setVals] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null)

  const getAmt = (feedName, key='amount_kg') => {
    const r = records.find(r => r.section===section.key && r.feed_name===feedName)
    return r ? Number(r[key]||0) : 0
  }
  const totalKg  = section.feeds.reduce((a,f) => a+getAmt(f,'amount_kg'), 0)
  const totalWon = section.feeds.reduce((a,f) => a+getAmt(f,'amount_won'), 0)
  const total    = showWon ? totalWon : totalKg
  const grandT   = showWon ? grandTotalWon : grandTotalKg

  function startEdit() {
    const init = {}
    section.feeds.forEach(f => {
      init[f+'_kg']  = getAmt(f,'amount_kg')  || ''
      init[f+'_won'] = getAmt(f,'amount_won') || ''
    })
    setVals(init); setEditing(true); setSaveStatus(null)
  }

  async function handleSave() {
    setSaving(true); setSaveStatus(null)
    let hasError = false
    for (const feedName of section.feeds) {
      const { error } = await supabase.from('feed_records').upsert({
        farm_slug: farmSlug, year, month, section: section.key, feed_name: feedName,
        amount_kg:  parseFloat(vals[feedName+'_kg'])  || 0,
        amount_won: parseFloat(vals[feedName+'_won']) || 0,
      }, { onConflict:'farm_slug,year,month,section,feed_name' })
      if (error) hasError = true
    }
    setSaving(false)
    if (!hasError) { setEditing(false); onSave() }
    else setSaveStatus('❌ 저장 실패')
  }

  return (
    <div style={{background:'white',border:'0.5px solid rgba(0,0,0,0.10)',borderRadius:10,padding:14,marginBottom:10}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{fontSize:13,fontWeight:500}}>{section.label}</span>
          <span style={{fontSize:10,padding:'2px 7px',borderRadius:99,fontWeight:500,background:section.bg,color:section.color}}>{section.feeds.length}종</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{fontSize:11,color:'#888'}}>
            총 {showWon ? (totalWon>0?totalWon.toLocaleString()+'원':'—') : (totalKg>0?totalKg.toLocaleString()+' kg':'—')}
          </span>
          {grandT > 0 && <span style={{fontSize:11,fontWeight:500,color:section.color,background:section.bg,padding:'1px 7px',borderRadius:99}}>{pct(total,grandT)}%</span>}
          {!editing && <button onClick={startEdit} style={{fontSize:11,padding:'3px 10px',border:'0.5px solid rgba(0,0,0,0.12)',borderRadius:6,background:'white',cursor:'pointer',fontFamily:'inherit',color:'#555'}}>입력</button>}
        </div>
      </div>

      {section.feeds.map(feedName => {
        const kg  = getAmt(feedName,'amount_kg')
        const won = getAmt(feedName,'amount_won')
        const val = showWon ? won : kg
        const bar = pct(val, total)
        return (
          <div key={feedName} style={{display:'flex',alignItems:'center',gap:8,marginBottom:editing?12:8}}>
            <div style={{width:64,fontSize:12,fontWeight:500,color:'#333',flexShrink:0}}>{feedName}</div>
            {editing ? (
              <div style={{flex:1,display:'flex',gap:6,flexWrap:'wrap'}}>
                <div style={{flex:1,minWidth:80}}>
                  <div style={{fontSize:10,color:'#888',marginBottom:2}}>kg</div>
                  <input type="number" min="0" placeholder="0" value={vals[feedName+'_kg']}
                    onChange={e=>setVals(v=>({...v,[feedName+'_kg']:e.target.value}))}
                    style={{width:'100%',padding:'6px 8px',border:'0.5px solid rgba(0,0,0,0.15)',borderRadius:6,fontSize:12,fontFamily:'inherit',outline:'none'}}/>
                </div>
                <div style={{flex:1,minWidth:80}}>
                  <div style={{fontSize:10,color:'#888',marginBottom:2}}>원</div>
                  <input type="number" min="0" placeholder="0" value={vals[feedName+'_won']}
                    onChange={e=>setVals(v=>({...v,[feedName+'_won']:e.target.value}))}
                    style={{width:'100%',padding:'6px 8px',border:'0.5px solid rgba(0,0,0,0.15)',borderRadius:6,fontSize:12,fontFamily:'inherit',outline:'none'}}/>
                </div>
              </div>
            ) : (
              <>
                <div style={{flex:1,background:'#F1EFE8',borderRadius:99,height:8,overflow:'hidden'}}>
                  <div style={{width:`${bar}%`,height:'100%',borderRadius:99,background:section.color,transition:'width 0.4s'}}/>
                </div>
                <div style={{width:28,textAlign:'right',fontSize:11,color:'#555'}}>{bar}%</div>
                <div style={{width:80,textAlign:'right',fontSize:11,color:'#888'}}>
                  {showWon ? (won>0?won.toLocaleString()+'원':'—') : (kg>0?kg.toLocaleString()+' kg':'—')}
                </div>
              </>
            )}
          </div>
        )
      })}

      {!editing && (totalKg>0||totalWon>0) && (
        <div style={{marginTop:8,paddingTop:8,borderTop:'0.5px solid rgba(0,0,0,0.07)',display:'flex',justifyContent:'flex-end',gap:12}}>
          {totalKg>0  && <span style={{fontSize:11,color:section.color,fontWeight:600}}>합계 {totalKg.toLocaleString()} kg</span>}
          {totalWon>0 && <span style={{fontSize:11,color:section.color,fontWeight:600}}>{totalWon.toLocaleString()}원</span>}
        </div>
      )}

      {editing && (
        <div style={{display:'flex',flexDirection:'column',gap:6,marginTop:4}}>
          <div style={{display:'flex',gap:8}}>
            <button onClick={handleSave} disabled={saving}
              style={{flex:1,padding:'8px',background:'#1D9E75',color:'white',border:'none',borderRadius:8,fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:'inherit'}}>
              {saving?'저장 중...':'저장'}
            </button>
            <button onClick={()=>setEditing(false)}
              style={{padding:'8px 16px',background:'white',border:'0.5px solid rgba(0,0,0,0.12)',borderRadius:8,fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#555'}}>
              취소
            </button>
          </div>
          {saveStatus && <div style={{fontSize:12,padding:'6px 10px',borderRadius:6,background:'#FCEBEB',color:'#A32D2D'}}>{saveStatus}</div>}
        </div>
      )}
    </div>
  )
}

// ── MonthlyTable (월별 사료 사용량 표) ──────────────────
function MonthlyTable({ yearRecords, year, showWon }) {
  const key  = showWon ? 'amount_won' : 'amount_kg'
  const unit = showWon ? '원' : 'kg'

  const months = Array.from({length:12}, (_,i) => i+1)
  const rows = months.map(m => {
    const recs = yearRecords.filter(r => r.month === m)
    if (!recs.length) return null
    const bySection = {}
    SECTIONS.forEach(s => {
      bySection[s.key] = recs.filter(r=>r.section===s.key).reduce((a,r)=>a+Number(r[key]||0),0)
    })
    const total = Object.values(bySection).reduce((a,v)=>a+v,0)
    return { month:m, ...bySection, total }
  }).filter(Boolean)

  if (!rows.length) return null
  const grandTotal = rows.reduce((a,r)=>a+r.total,0)

  return (
    <div style={{background:'white',border:'0.5px solid rgba(0,0,0,0.10)',borderRadius:10,padding:14,marginBottom:10}}>
      <div style={{fontSize:13,fontWeight:500,marginBottom:12}}>{year}년 월별 사료 사용량</div>
      <div style={{overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,minWidth:400}}>
          <thead>
            <tr style={{background:'#F5F6F4'}}>
              <th style={{padding:'7px 8px',textAlign:'center',fontWeight:500,color:'#888',whiteSpace:'nowrap'}}>월</th>
              {SECTIONS.map(s=>(
                <th key={s.key} style={{padding:'7px 8px',textAlign:'right',fontWeight:500,color:s.color,whiteSpace:'nowrap'}}>{s.label.replace(' 구간','')}</th>
              ))}
              <th style={{padding:'7px 8px',textAlign:'right',fontWeight:600,color:'#1a1a18'}}>합계</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r,i)=>(
              <tr key={r.month} style={{borderBottom:'0.5px solid rgba(0,0,0,0.05)',background:i%2===0?'white':'#FAFAFA'}}>
                <td style={{padding:'7px 8px',textAlign:'center',fontWeight:500,color:'#1a1a18'}}>{r.month}월</td>
                {SECTIONS.map(s=>(
                  <td key={s.key} style={{padding:'7px 8px',textAlign:'right',color:r[s.key]>0?s.color:'#ccc'}}>
                    {r[s.key]>0 ? r[s.key].toLocaleString() : '—'}
                  </td>
                ))}
                <td style={{padding:'7px 8px',textAlign:'right',fontWeight:700,color:'#1a1a18'}}>{r.total.toLocaleString()}</td>
              </tr>
            ))}
            <tr style={{background:'#F5F6F4',borderTop:'1px solid rgba(0,0,0,0.1)'}}>
              <td style={{padding:'7px 8px',textAlign:'center',fontWeight:700,color:'#1a1a18'}}>합계</td>
              {SECTIONS.map(s=>{
                const tot = rows.reduce((a,r)=>a+r[s.key],0)
                return <td key={s.key} style={{padding:'7px 8px',textAlign:'right',fontWeight:600,color:s.color}}>{tot>0?tot.toLocaleString():'—'}</td>
              })}
              <td style={{padding:'7px 8px',textAlign:'right',fontWeight:700,color:'#1a1a18'}}>{grandTotal.toLocaleString()}</td>
            </tr>
            <tr style={{background:'white'}}>
              <td style={{padding:'7px 8px',textAlign:'center',fontSize:10,color:'#888'}}>비율</td>
              {SECTIONS.map(s=>{
                const tot = rows.reduce((a,r)=>a+r[s.key],0)
                const ratio = grandTotal>0 ? Math.round(tot/grandTotal*100) : 0
                return <td key={s.key} style={{padding:'7px 8px',textAlign:'right',fontSize:11,color:s.color}}>{ratio>0?`${ratio}%`:'—'}</td>
              })}
              <td style={{padding:'7px 8px',textAlign:'right',fontSize:11,fontWeight:600,color:'#888'}}>100%</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{marginTop:14,paddingTop:12,borderTop:'0.5px solid rgba(0,0,0,0.07)'}}>
        <div style={{fontSize:11,color:'#888',marginBottom:8}}>구간별 비율</div>
        <div style={{display:'flex',height:18,borderRadius:99,overflow:'hidden',gap:1}}>
          {SECTIONS.map(s=>{
            const tot = rows.reduce((a,r)=>a+r[s.key],0)
            const ratio = grandTotal>0 ? (tot/grandTotal*100) : 0
            return ratio>0 ? (
              <div key={s.key} style={{width:`${ratio}%`,background:s.color,display:'flex',alignItems:'center',justifyContent:'center'}}>
                {ratio>8 && <span style={{fontSize:9,color:'white',fontWeight:700}}>{Math.round(ratio)}%</span>}
              </div>
            ) : null
          })}
        </div>
        <div style={{display:'flex',gap:10,marginTop:6,flexWrap:'wrap'}}>
          {SECTIONS.map(s=>{
            const tot = rows.reduce((a,r)=>a+r[s.key],0)
            const ratio = grandTotal>0 ? Math.round(tot/grandTotal*100) : 0
            return tot>0 ? (
              <span key={s.key} style={{display:'flex',alignItems:'center',gap:4,fontSize:10}}>
                <span style={{width:8,height:8,background:s.color,borderRadius:2,display:'inline-block'}}/>
                <span style={{color:s.color}}>{s.label.replace(' 구간','')} {ratio}%</span>
              </span>
            ) : null
          })}
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────
export default function FeedPage({ farmSlug, isAdmin }) {
  const slug = farmSlug || 'admin'
  const [viewMode, setViewMode] = useState('monthly')
  const [year,     setYear]     = useState(NOW.getFullYear())
  const [month,    setMonth]    = useState(NOW.getMonth()+1)
  const [records,  setRecords]  = useState([])
  const [yearRecs, setYearRecs] = useState([])
  const [loading,  setLoading]  = useState(false)
  const [showWon,  setShowWon]  = useState(false)
  const [mapping,  setMapping]  = useState(null)
  const fileRef = useRef(null)

  useEffect(()=>{ load() },[slug,year,month,viewMode])

  async function load() {
    setLoading(true)
    // 연간 데이터는 항상 로딩 (월별 표에 사용)
    const { data:yr } = await supabase.from('feed_records').select('*').eq('farm_slug',slug).eq('year',year)
    setYearRecs(yr||[])
    if (viewMode==='monthly') {
      const { data:cur } = await supabase.from('feed_records').select('*').eq('farm_slug',slug).eq('year',year).eq('month',month)
      setRecords(cur||[])
    }
    setLoading(false)
  }

  async function handleWonJangFile(file) {
    if (!file) return
    const buf = await file.arrayBuffer()
    const result = parseWonJang(buf)
    if (!result.products.length) { alert('제품 데이터를 찾을 수 없습니다.'); return }
    setMapping(result)
  }

  const years = Array.from({length:5},(_,i)=>NOW.getFullYear()-i)
  const grandTotalKg  = records.reduce((a,r)=>a+Number(r.amount_kg||0),0)
  const grandTotalWon = records.reduce((a,r)=>a+Number(r.amount_won||0),0)

  return (
    <div style={{padding:'0 0 2rem'}}>
      {mapping && (
        <MappingModal
          result={mapping}
          farmSlug={slug}
          onDone={()=>{ setMapping(null); load() }}
          onCancel={()=>setMapping(null)}
        />
      )}

      {/* 조회 컨트롤 */}
      <div style={{background:'white',border:'0.5px solid rgba(0,0,0,0.10)',borderRadius:10,padding:14,marginBottom:10}}>
        <div style={{display:'flex',gap:6,marginBottom:10}}>
          {['monthly','yearly'].map((m,i)=>(
            <button key={m} onClick={()=>setViewMode(m)}
              style={{flex:1,padding:'7px',border:'none',borderRadius:7,cursor:'pointer',fontFamily:'inherit',fontSize:13,fontWeight:500,
                background:viewMode===m?'#378ADD':'#F5F6F4',color:viewMode===m?'white':'#888'}}>
              {i===0?'월별':'연간'}
            </button>
          ))}
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          <select value={year} onChange={e=>setYear(Number(e.target.value))}
            style={{border:'0.5px solid rgba(0,0,0,0.12)',borderRadius:6,padding:'6px 10px',fontSize:13,fontFamily:'inherit',background:'white',outline:'none'}}>
            {years.map(y=><option key={y} value={y}>{y}년</option>)}
          </select>
          {viewMode==='monthly' && (
            <select value={month} onChange={e=>setMonth(Number(e.target.value))}
              style={{border:'0.5px solid rgba(0,0,0,0.12)',borderRadius:6,padding:'6px 10px',fontSize:13,fontFamily:'inherit',background:'white',outline:'none'}}>
              {MONTHS.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
            </select>
          )}
          <div style={{display:'flex',border:'0.5px solid rgba(0,0,0,0.12)',borderRadius:7,overflow:'hidden',marginLeft:'auto'}}>
            {[['kg','kg'],['won','금액']].map(([k,l])=>(
              <button key={k} onClick={()=>setShowWon(k==='won')}
                style={{padding:'5px 14px',border:'none',cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:500,
                  background:(showWon?(k==='won'):(k==='kg'))?'#378ADD':'#F5F6F4',
                  color:(showWon?(k==='won'):(k==='kg'))?'white':'#888'}}>
                {l}
              </button>
            ))}
          </div>
          {loading && <span style={{fontSize:12,color:'#aaa'}}>불러오는 중...</span>}
        </div>

        {isAdmin && (
          <div style={{marginTop:10,paddingTop:10,borderTop:'0.5px solid rgba(0,0,0,0.07)',display:'flex',gap:8,flexWrap:'wrap'}}>
            <label style={{flex:1}}>
              <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 12px',background:'#F5F6F4',borderRadius:8,cursor:'pointer',fontSize:12,color:'#555'}}>
                <span>📂</span>
                <span>거래원장 업로드</span>
                <span style={{fontSize:10,color:'#aaa',marginLeft:'auto'}}>월 합계 자동 파싱</span>
              </div>
              <input type="file" accept=".xlsx,.xls" style={{display:'none'}}
                onChange={e=>handleWonJangFile(e.target.files[0])}/>
            </label>
            {viewMode==='monthly' && (
              <button onClick={async ()=>{
                if (!window.confirm(`${year}년 ${month}월 사료 데이터를 삭제할까요?`)) return
                await supabase.from('feed_records').delete().eq('farm_slug',slug).eq('year',year).eq('month',month)
                load()
              }} style={{padding:'8px 14px',background:'#FCEBEB',color:'#A32D2D',border:'0.5px solid #F09595',borderRadius:8,fontSize:12,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}>
                🗑️ {month}월 삭제
              </button>
            )}
          </div>
        )}
      </div>

      {viewMode==='monthly' ? (
        <>
          {SECTIONS.map(section=>(
            <SectionCard key={section.key} section={section} records={records}
              onSave={load} year={year} month={month}
              grandTotalKg={grandTotalKg} grandTotalWon={grandTotalWon}
              farmSlug={slug} showWon={showWon}/>
          ))}

          {(grandTotalKg>0||grandTotalWon>0) && (
            <div style={{background:'#0F2A1E',color:'white',borderRadius:10,padding:'12px 16px',marginBottom:10}}>
              <div style={{fontSize:11,color:'rgba(255,255,255,0.5)',marginBottom:6}}>전체 합계</div>
              <div style={{display:'flex',gap:20,flexWrap:'wrap'}}>
                {grandTotalKg>0  && <div><span style={{fontSize:20,fontWeight:700}}>{grandTotalKg.toLocaleString()}</span><span style={{fontSize:11,color:'rgba(255,255,255,0.5)',marginLeft:3}}>kg</span></div>}
                {grandTotalWon>0 && <div><span style={{fontSize:20,fontWeight:700}}>{grandTotalWon.toLocaleString()}</span><span style={{fontSize:11,color:'rgba(255,255,255,0.5)',marginLeft:3}}>원</span></div>}
              </div>
            </div>
          )}
          <MonthlyTable yearRecords={yearRecs} year={year} showWon={showWon}/>
        </>
      ) : (
        <MonthlyTable yearRecords={yearRecs} year={year} showWon={showWon}/>
      )}
    </div>
  )
}
