import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Footer from '../components/Footer'

const SECTIONS = [
  {
    key: 'piglet', label: '자돈 구간', color: '#378ADD', lightColor: '#B5D4F4', bg: '#E6F1FB',
    feeds: ['초유밀', '자돈1호', '자돈2호', '자돈3호', '체인지']
  },
  {
    key: 'sow', label: '모돈 구간', color: '#1D9E75', lightColor: '#9FE1CB', bg: '#E1F5EE',
    feeds: ['임신돈', '포유돈']
  },
  {
    key: 'fattening', label: '비육 구간', color: '#BA7517', lightColor: '#FAC775', bg: '#FAEEDA',
    feeds: ['1호사료', '2호사료']
  },
]

const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']
const NOW = new Date()

function pct(val, total) {
  if (!total) return 0
  return Math.round((val / total) * 100)
}

function SectionCard({ section, records, onSave, year, month, prevRecords, grandTotal, farmSlug }) {
  const [editing, setEditing] = useState(false)
  const [vals, setVals] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null)

  const getAmt = (feedName, recs) => {
    const r = (recs||records).find(r => r.section===section.key && r.feed_name===feedName)
    return r ? Number(r.amount_kg) : 0
  }

  const total = section.feeds.reduce((a, f) => a + getAmt(f), 0)

  function startEdit() {
    const init = {}
    section.feeds.forEach(f => { init[f] = getAmt(f) || '' })
    setVals(init)
    setEditing(true)
    setSaveStatus(null)
  }

  async function handleSave() {
    setSaving(true); setSaveStatus(null)
    let hasError = false
    for (const feedName of section.feeds) {
      const amt = parseFloat(vals[feedName]) || 0
      const { error } = await supabase.from('feed_records').upsert({
        farm_slug: farmSlug, year, month,
        section: section.key, feed_name: feedName, amount_kg: amt
      }, { onConflict: 'farm_slug,year,month,section,feed_name' })
      if (error) { hasError = true; console.error(error) }
    }
    setSaving(false)
    if (!hasError) {
      setEditing(false)
      onSave()
    } else {
      setSaveStatus('❌ 저장 실패. Supabase 연결을 확인해주세요.')
    }
  }

  return (
    <div style={{background:'white',border:'0.5px solid rgba(0,0,0,0.10)',borderRadius:10,padding:14,marginBottom:10}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{fontSize:13,fontWeight:500,color:'#1a1a18'}}>{section.label}</span>
          <span style={{fontSize:10,padding:'2px 7px',borderRadius:99,fontWeight:500,background:section.bg,color:section.color}}>
            {section.feeds.length}종
          </span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{fontSize:11,color:'#888'}}>총 {total.toLocaleString()} kg</span>
          {grandTotal > 0 && (
            <span style={{fontSize:11,fontWeight:500,color:section.color,background:section.bg,padding:'1px 7px',borderRadius:99}}>
              {Math.round((total/grandTotal)*100)}%
            </span>
          )}
          {!editing && (
            <button onClick={startEdit} style={{fontSize:11,padding:'3px 10px',border:'0.5px solid rgba(0,0,0,0.12)',borderRadius:6,background:'white',cursor:'pointer',fontFamily:'inherit',color:'#555'}}>
              입력
            </button>
          )}
        </div>
      </div>

      {section.feeds.map(feedName => {
        const amt   = getAmt(feedName)
        const bar   = pct(amt, total)
        return (
          <div key={feedName} style={{display:'flex',alignItems:'center',gap:8,marginBottom:editing?10:8}}>
            <div style={{width:72,fontSize:12,fontWeight:500,color:'#333',flexShrink:0}}>{feedName}</div>
            {editing ? (
              <div style={{flex:1,display:'flex',alignItems:'center',gap:6}}>
                <input
                  type="number" min="0" placeholder="0"
                  value={vals[feedName]}
                  onChange={e => setVals(v=>({...v,[feedName]:e.target.value}))}
                  style={{flex:1,padding:'6px 10px',border:'0.5px solid rgba(0,0,0,0.15)',borderRadius:6,fontSize:13,fontFamily:'inherit',outline:'none'}}
                />
                <span style={{fontSize:11,color:'#888',flexShrink:0}}>kg</span>
              </div>
            ) : (
              <>
                <div style={{flex:1,background:'#F1EFE8',borderRadius:99,height:8,overflow:'hidden'}}>
                  <div style={{width:`${bar}%`,height:'100%',borderRadius:99,background:section.color,transition:'width 0.4s'}}/>
                </div>
                <div style={{width:32,textAlign:'right',fontSize:11,color:'#555'}}>{bar}%</div>
                <div style={{width:72,textAlign:'right',fontSize:11,color:'#888'}}>{amt.toLocaleString()} kg</div>
              </>
            )}
          </div>
        )
      })}

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

function CompareCard({ records, prevRecords, month }) {
  const prevMonth = month === 1 ? 12 : month - 1

  const getAmt = (recs, section, feedName) => {
    const r = recs.find(r => r.section===section && r.feed_name===feedName)
    return r ? Number(r.amount_kg) : 0
  }

  const allFeeds = []
  SECTIONS.forEach(s => s.feeds.forEach(f => allFeeds.push({section:s, feedName:f, color:s.color, lightColor:s.lightColor})))

  const maxAmt = Math.max(...allFeeds.map(({section:s,feedName:f}) =>
    Math.max(getAmt(records,s.key,f), getAmt(prevRecords,s.key,f))
  ), 1)

  return (
    <div style={{background:'white',border:'0.5px solid rgba(0,0,0,0.10)',borderRadius:10,padding:14,marginBottom:10}}>
      <div style={{fontSize:13,fontWeight:500,color:'#1a1a18',marginBottom:4}}>전월 비교</div>
      <div style={{display:'flex',gap:12,fontSize:11,color:'#888',marginBottom:12}}>
        <span style={{display:'flex',alignItems:'center',gap:4}}><span style={{width:10,height:6,borderRadius:99,background:'#D3D1C7',display:'inline-block'}}></span>{prevMonth}월</span>
        <span style={{display:'flex',alignItems:'center',gap:4}}><span style={{width:10,height:6,borderRadius:99,background:'#378ADD',display:'inline-block'}}></span>{month}월</span>
      </div>

      {SECTIONS.map(section => (
        <div key={section.key} style={{marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:500,color:section.color,marginBottom:6}}>{section.label}</div>
          {section.feeds.map(feedName => {
            const cur  = getAmt(records, section.key, feedName)
            const prev = getAmt(prevRecords, section.key, feedName)
            const diff = cur - prev
            const curW  = pct(cur, maxAmt)
            const prevW = pct(prev, maxAmt)
            return (
              <div key={feedName} style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                <div style={{width:64,fontSize:11,fontWeight:500,color:'#333',flexShrink:0}}>{feedName}</div>
                <div style={{flex:1}}>
                  <div style={{background:'#F1EFE8',borderRadius:99,height:6,overflow:'hidden',marginBottom:3}}>
                    <div style={{width:`${prevW}%`,height:'100%',borderRadius:99,background:'#D3D1C7',transition:'width 0.4s'}}/>
                  </div>
                  <div style={{background:'#F1EFE8',borderRadius:99,height:6,overflow:'hidden'}}>
                    <div style={{width:`${curW}%`,height:'100%',borderRadius:99,background:section.color,transition:'width 0.4s'}}/>
                  </div>
                </div>
                <div style={{width:52,textAlign:'right',fontSize:10}}>
                  {diff !== 0 && (
                    <span style={{color:diff>0?'#A32D2D':'#085041',fontWeight:500}}>
                      {diff>0?'▲':'▼'} {Math.abs(diff).toLocaleString()}
                    </span>
                  )}
                  {diff === 0 && <span style={{color:'#aaa'}}>—</span>}
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function YearChart({ yearRecords, year }) {
  const monthTotals = Array.from({length:12},(_,i)=>{
    const m = i+1
    const recs = yearRecords.filter(r=>r.month===m)
    return recs.reduce((a,r)=>a+Number(r.amount_kg),0)
  })
  const maxVal = Math.max(...monthTotals, 1)

  return (
    <div style={{background:'white',border:'0.5px solid rgba(0,0,0,0.10)',borderRadius:10,padding:14,marginBottom:10}}>
      <div style={{fontSize:13,fontWeight:500,color:'#1a1a18',marginBottom:12}}>{year}년 월별 사용량</div>
      <div style={{display:'flex',alignItems:'flex-end',gap:4,height:80}}>
        {monthTotals.map((val,i)=>(
          <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
            <div style={{width:'100%',background:val?'#378ADD':'#F1EFE8',borderRadius:'3px 3px 0 0',height:`${val?Math.max(pct(val,maxVal),4):4}%`,minHeight:val?8:4,transition:'height 0.4s'}}/>
            <span style={{fontSize:9,color:'#aaa'}}>{i+1}월</span>
          </div>
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6,marginTop:12}}>
        {(() => {
          const grandTotal = yearRecords.reduce((a,r)=>a+Number(r.amount_kg),0)
          return (
            <>
              {SECTIONS.map(s=>{
                const total = yearRecords.filter(r=>r.section===s.key).reduce((a,r)=>a+Number(r.amount_kg),0)
                const ratio = grandTotal > 0 ? Math.round((total/grandTotal)*100) : 0
                return (
                  <div key={s.key} style={{background:s.bg,borderRadius:8,padding:'8px 10px'}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:2}}>
                      <div style={{fontSize:10,color:s.color}}>{s.label}</div>
                      <div style={{fontSize:11,fontWeight:700,color:s.color}}>{ratio}%</div>
                    </div>
                    <div style={{fontSize:13,fontWeight:700,color:'#1a1a18'}}>{total.toLocaleString()}<span style={{fontSize:10,fontWeight:400,color:'#888',marginLeft:2}}>kg</span></div>
                    <div style={{marginTop:5,background:'rgba(0,0,0,0.08)',borderRadius:99,height:4,overflow:'hidden'}}>
                      <div style={{width:`${ratio}%`,height:'100%',borderRadius:99,background:s.color,transition:'width 0.4s'}}/>
                    </div>
                  </div>
                )
              })}
              <div style={{background:'#F1EFE8',borderRadius:8,padding:'8px 10px'}}>
                <div style={{fontSize:10,color:'#888',marginBottom:2}}>전체 합계</div>
                <div style={{fontSize:13,fontWeight:700,color:'#1a1a18'}}>{grandTotal.toLocaleString()}<span style={{fontSize:10,fontWeight:400,color:'#888',marginLeft:2}}>kg</span></div>
              </div>
            </>
          )
        })()}
      </div>
    </div>
  )
}

export default function FeedPage({ farmSlug }) {
  const slug = farmSlug || 'admin'
  const [viewMode, setViewMode]   = useState('monthly')
  const [year,     setYear]       = useState(NOW.getFullYear())
  const [month,    setMonth]      = useState(NOW.getMonth()+1)
  const [records,  setRecords]    = useState([])
  const [prevRecs, setPrevRecs]   = useState([])
  const [yearRecs, setYearRecs]   = useState([])
  const [loading,  setLoading]    = useState(false)

  useEffect(()=>{
    async function load() {
      setLoading(true)
      if (viewMode==='monthly') {
        const { data:cur  } = await supabase.from('feed_records').select('*').eq('farm_slug',slug).eq('year',year).eq('month',month)
        const prevMonth = month===1?12:month-1
        const prevYear  = month===1?year-1:year
        const { data:prev } = await supabase.from('feed_records').select('*').eq('farm_slug',slug).eq('year',prevYear).eq('month',prevMonth)
        setRecords(cur||[])
        setPrevRecs(prev||[])
      } else {
        const { data:yr } = await supabase.from('feed_records').select('*').eq('farm_slug',slug).eq('year',year)
        setYearRecs(yr||[])
      }
      setLoading(false)
    }
    load()
  },[slug, year, month, viewMode])

  async function load() {
    setLoading(true)
    if (viewMode==='monthly') {
      const { data:cur  } = await supabase.from('feed_records').select('*').eq('farm_slug',slug).eq('year',year).eq('month',month)
      const prevMonth = month===1?12:month-1
      const prevYear  = month===1?year-1:year
      const { data:prev } = await supabase.from('feed_records').select('*').eq('farm_slug',slug).eq('year',prevYear).eq('month',prevMonth)
      setRecords(cur||[])
      setPrevRecs(prev||[])
    } else {
      const { data:yr } = await supabase.from('feed_records').select('*').eq('farm_slug',slug).eq('year',year)
      setYearRecs(yr||[])
    }
    setLoading(false)
  }

  const years = Array.from({length:5},(_,i)=>NOW.getFullYear()-i)

  return (
    <div style={{padding:'0 0 2rem'}}>
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
          {loading && <span style={{fontSize:12,color:'#aaa'}}>불러오는 중...</span>}
        </div>
      </div>

      {viewMode==='monthly' ? (
        <>
          {SECTIONS.map(section=>{
            const grandTotal = SECTIONS.reduce((a,s)=>
              a + s.feeds.reduce((b,f)=>{ const r=records.find(r=>r.section===s.key&&r.feed_name===f); return b+(r?Number(r.amount_kg):0) },0)
            ,0)
            return (
              <SectionCard key={section.key} section={section} records={records}
                onSave={load} year={year} month={month}
                prevRecords={prevRecs} grandTotal={grandTotal} farmSlug={slug}/>
            )
          })}
          <CompareCard records={records} prevRecords={prevRecs} month={month}/>
        </>
      ) : (
        <YearChart yearRecords={yearRecs} year={year}/>
      )}
    </div>
  )
}
