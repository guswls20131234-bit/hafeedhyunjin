import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const NOW = new Date()
const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']

export default function ProductionPage({ farmSlug }) {
  const slug = farmSlug || 'admin'
  const [year,    setYear]    = useState(NOW.getFullYear())
  const [month,   setMonth]   = useState(NOW.getMonth()+1)
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [status,  setStatus]  = useState(null)
  const [vals,    setVals]    = useState({ mating:0, farrowing:0, born:0, weaning:0, weaned:0 })
  const [dirty,   setDirty]   = useState(false)

  const years = Array.from({length:5},(_,i)=>NOW.getFullYear()-i)

  useEffect(()=>{ loadRecords() },[slug, year])
  useEffect(()=>{
    const rec = records.find(r=>r.month===month)
    if (rec) setVals({ mating:rec.mating||0, farrowing:rec.farrowing||0, born:rec.born||0, weaning:rec.weaning||0, weaned:rec.weaned||0 })
    else setVals({ mating:0, farrowing:0, born:0, weaning:0, weaned:0 })
    setDirty(false)
  },[month, records])

  async function loadRecords() {
    setLoading(true)
    const { data } = await supabase.from('production_records').select('*')
      .eq('farm_slug', slug).eq('year', year).order('month', {ascending:true})
    setRecords(data||[])
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true); setStatus(null)
    const { error } = await supabase.from('production_records').upsert({
      farm_slug: slug, year, month,
      week: 1, // 월별 관리용 더미값
      mating:    Number(vals.mating)||0,
      farrowing: Number(vals.farrowing)||0,
      born:      Number(vals.born)||0,
      weaning:   Number(vals.weaning)||0,
      weaned:    Number(vals.weaned)||0,
    }, { onConflict: 'farm_slug,year,week' })
    setSaving(false)
    if (error) { setStatus('❌ 저장 실패: '+error.message) }
    else { setStatus('✅ 저장 완료!'); setDirty(false); loadRecords() }
    setTimeout(()=>setStatus(null), 3000)
  }

  function setVal(k, v) { setVals(p=>({...p,[k]:v})); setDirty(true) }

  const bpf = vals.farrowing>0 ? (vals.born/vals.farrowing).toFixed(1) : '—'
  const wpw = vals.weaning>0   ? (vals.weaned/vals.weaning).toFixed(1)  : '—'

  const maxWeaned = Math.max(...records.map(r=>r.weaned||0), 1)
  const maxMating = Math.max(...records.map(r=>r.mating||0), 1)

  // 연간 합계
  const totMating    = records.reduce((a,r)=>a+(r.mating||0),0)
  const totFarrowing = records.reduce((a,r)=>a+(r.farrowing||0),0)
  const totBorn      = records.reduce((a,r)=>a+(r.born||0),0)
  const totWeaning   = records.reduce((a,r)=>a+(r.weaning||0),0)
  const totWeaned    = records.reduce((a,r)=>a+(r.weaned||0),0)

  const inp = { border:'0.5px solid rgba(0,0,0,0.12)', borderRadius:8, padding:'8px 12px', fontSize:14, fontFamily:'inherit', outline:'none', background:'#fafafa', width:'100%', boxSizing:'border-box', textAlign:'right' }

  return (
    <div style={{padding:'0 0 2rem'}}>
      {/* 조회 컨트롤 */}
      <div style={{background:'white',border:'0.5px solid rgba(0,0,0,0.08)',borderRadius:10,padding:14,marginBottom:10}}>
        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          <select value={year} onChange={e=>setYear(Number(e.target.value))}
            style={{border:'0.5px solid rgba(0,0,0,0.12)',borderRadius:6,padding:'6px 10px',fontSize:13,fontFamily:'inherit',background:'white',outline:'none'}}>
            {years.map(y=><option key={y} value={y}>{y}년</option>)}
          </select>
          <select value={month} onChange={e=>setMonth(Number(e.target.value))}
            style={{border:'0.5px solid rgba(0,0,0,0.12)',borderRadius:6,padding:'6px 10px',fontSize:13,fontFamily:'inherit',background:'white',outline:'none'}}>
            {MONTHS.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
          </select>
          {loading && <span style={{fontSize:12,color:'#aaa'}}>불러오는 중...</span>}
          {dirty && (
            <button onClick={handleSave} disabled={saving}
              style={{marginLeft:'auto',padding:'7px 18px',background:'#1D9E75',color:'white',border:'none',borderRadius:8,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
              {saving?'저장 중...':'💾 저장'}
            </button>
          )}
          {status && <span style={{fontSize:12,fontWeight:600,color:status.includes('✅')?'#085041':'#A32D2D'}}>{status}</span>}
        </div>
      </div>

      {/* 입력 카드 */}
      <div style={{background:'white',border:'0.5px solid rgba(0,0,0,0.08)',borderRadius:12,padding:16,marginBottom:10}}>
        <div style={{fontSize:13,fontWeight:600,color:'#1a1a18',marginBottom:14}}>
          {year}년 {month}월 입력
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          {[
            {key:'mating',    label:'종부복수',  unit:'복', color:'#378ADD', full:true},
            {key:'farrowing', label:'분만복수',  unit:'복', color:'#1D9E75'},
            {key:'born',      label:'산자수',    unit:'두', color:'#1D9E75'},
            {key:'weaning',   label:'이유복수',  unit:'복', color:'#BA7517'},
            {key:'weaned',    label:'이유두수',  unit:'두', color:'#BA7517'},
          ].map(({key,label,unit,color,full})=>(
            <div key={key} style={{gridColumn:full?'1/-1':'auto'}}>
              <div style={{fontSize:11,color:'#888',marginBottom:4,fontWeight:500}}>{label}</div>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <input type="number" min="0" value={vals[key]||''}
                  onChange={e=>setVal(key, e.target.value)}
                  placeholder="0"
                  style={{...inp, borderColor:vals[key]>0?color:'rgba(0,0,0,0.12)'}}/>
                <span style={{fontSize:12,color:'#888',flexShrink:0}}>{unit}</span>
              </div>
            </div>
          ))}
        </div>

        {/* 자동계산 */}
        {(vals.farrowing>0||vals.weaning>0) && (
          <div style={{marginTop:14,paddingTop:14,borderTop:'0.5px solid rgba(0,0,0,0.07)',display:'flex',gap:12,flexWrap:'wrap'}}>
            {vals.farrowing>0 && (
              <div style={{background:'#E1F5EE',borderRadius:8,padding:'8px 14px',flex:1,minWidth:110}}>
                <div style={{fontSize:10,color:'#085041',marginBottom:2}}>복당 산자수</div>
                <div style={{fontSize:18,fontWeight:700,color:'#085041'}}>{bpf}<span style={{fontSize:11,marginLeft:2}}>두</span></div>
              </div>
            )}
            {vals.weaning>0 && (
              <div style={{background:'#FAEEDA',borderRadius:8,padding:'8px 14px',flex:1,minWidth:110}}>
                <div style={{fontSize:10,color:'#633806',marginBottom:2}}>복당 이유두수</div>
                <div style={{fontSize:18,fontWeight:700,color:'#633806'}}>{wpw}<span style={{fontSize:11,marginLeft:2}}>두</span></div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 연간 현황 테이블 */}
      {records.length > 0 && (
        <div style={{background:'white',border:'0.5px solid rgba(0,0,0,0.08)',borderRadius:12,padding:16,marginBottom:10}}>
          <div style={{fontSize:13,fontWeight:600,color:'#1a1a18',marginBottom:14}}>{year}년 월별 현황</div>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,minWidth:480}}>
              <thead>
                <tr style={{background:'#F5F6F4'}}>
                  {['월','종부','분만','산자','이유복','이유두','복당산자','복당이유'].map(h=>(
                    <th key={h} style={{padding:'7px 8px',textAlign:'center',fontWeight:500,color:'#6b6b68',borderBottom:'0.5px solid rgba(0,0,0,0.08)',whiteSpace:'nowrap',fontSize:11}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((r,i)=>{
                  const b = r.farrowing>0?(r.born/r.farrowing).toFixed(1):'—'
                  const w = r.weaning>0?(r.weaned/r.weaning).toFixed(1):'—'
                  const isCur = r.month===month
                  return (
                    <tr key={i} onClick={()=>setMonth(r.month)}
                      style={{borderBottom:'0.5px solid rgba(0,0,0,0.06)',background:isCur?'#F0FAF5':'transparent',cursor:'pointer'}}>
                      <td style={{padding:'8px',textAlign:'center',fontWeight:isCur?700:500,color:isCur?'#085041':'#1a1a18'}}>{r.month}월</td>
                      <td style={{padding:'8px',textAlign:'center',color:'#378ADD'}}>{r.mating||'—'}</td>
                      <td style={{padding:'8px',textAlign:'center',color:'#1D9E75'}}>{r.farrowing||'—'}</td>
                      <td style={{padding:'8px',textAlign:'center'}}>{r.born||'—'}</td>
                      <td style={{padding:'8px',textAlign:'center',color:'#BA7517'}}>{r.weaning||'—'}</td>
                      <td style={{padding:'8px',textAlign:'center'}}>{r.weaned||'—'}</td>
                      <td style={{padding:'8px',textAlign:'center',fontWeight:500}}>{b}</td>
                      <td style={{padding:'8px',textAlign:'center',fontWeight:500}}>{w}</td>
                    </tr>
                  )
                })}
              </tbody>
              {records.length > 1 && (
                <tfoot>
                  <tr style={{background:'#F0FAF5',borderTop:'1.5px solid rgba(29,158,117,0.3)'}}>
                    <td style={{padding:'8px',textAlign:'center',fontWeight:700,fontSize:11,color:'#085041'}}>합계</td>
                    <td style={{padding:'8px',textAlign:'center',fontWeight:600,color:'#378ADD'}}>{totMating}</td>
                    <td style={{padding:'8px',textAlign:'center',fontWeight:600,color:'#1D9E75'}}>{totFarrowing}</td>
                    <td style={{padding:'8px',textAlign:'center',fontWeight:600}}>{totBorn}</td>
                    <td style={{padding:'8px',textAlign:'center',fontWeight:600,color:'#BA7517'}}>{totWeaning}</td>
                    <td style={{padding:'8px',textAlign:'center',fontWeight:600}}>{totWeaned}</td>
                    <td style={{padding:'8px',textAlign:'center',fontWeight:700,color:'#085041'}}>{totFarrowing>0?(totBorn/totFarrowing).toFixed(1):'—'}</td>
                    <td style={{padding:'8px',textAlign:'center',fontWeight:700,color:'#085041'}}>{totWeaning>0?(totWeaned/totWeaning).toFixed(1):'—'}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* 바 차트 */}
          <div style={{marginTop:16,display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div style={{background:'#E6F1FB',borderRadius:10,padding:'12px 14px'}}>
              <div style={{fontSize:11,fontWeight:600,color:'#0C447C',marginBottom:10}}>종부 / 분만</div>
              {records.map((r,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:6,marginBottom:5}}>
                  <span style={{fontSize:10,color:'#888',width:24,flexShrink:0}}>{r.month}월</span>
                  <div style={{flex:1}}>
                    <div style={{background:'#F1EFE8',borderRadius:99,height:5,overflow:'hidden',marginBottom:2}}>
                      <div style={{width:`${maxMating>0?(r.mating||0)/maxMating*100:0}%`,height:'100%',background:'#378ADD',borderRadius:99}}/>
                    </div>
                    <div style={{background:'#F1EFE8',borderRadius:99,height:5,overflow:'hidden'}}>
                      <div style={{width:`${maxMating>0?(r.farrowing||0)/maxMating*100:0}%`,height:'100%',background:'#1D9E75',borderRadius:99}}/>
                    </div>
                  </div>
                  <span style={{fontSize:10,color:'#555',width:28,textAlign:'right'}}>{r.mating||0}</span>
                </div>
              ))}
              <div style={{display:'flex',gap:10,marginTop:8,fontSize:10}}>
                <span style={{display:'flex',alignItems:'center',gap:3}}><span style={{width:8,height:4,background:'#378ADD',borderRadius:99,display:'inline-block'}}></span>종부</span>
                <span style={{display:'flex',alignItems:'center',gap:3}}><span style={{width:8,height:4,background:'#1D9E75',borderRadius:99,display:'inline-block'}}></span>분만</span>
              </div>
            </div>
            <div style={{background:'#FAEEDA',borderRadius:10,padding:'12px 14px'}}>
              <div style={{fontSize:11,fontWeight:600,color:'#633806',marginBottom:10}}>이유두수</div>
              {records.map((r,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:6,marginBottom:5}}>
                  <span style={{fontSize:10,color:'#888',width:24,flexShrink:0}}>{r.month}월</span>
                  <div style={{flex:1,background:'#F1EFE8',borderRadius:99,height:8,overflow:'hidden'}}>
                    <div style={{width:`${maxWeaned>0?(r.weaned||0)/maxWeaned*100:0}%`,height:'100%',background:'#BA7517',borderRadius:99}}/>
                  </div>
                  <span style={{fontSize:10,color:'#555',width:28,textAlign:'right'}}>{r.weaned||0}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {records.length===0 && !loading && (
        <div style={{background:'white',borderRadius:12,padding:'40px',textAlign:'center',border:'0.5px solid rgba(0,0,0,0.08)'}}>
          <div style={{fontSize:32,marginBottom:10}}>📋</div>
          <div style={{fontSize:13,color:'#aaa'}}>아직 입력된 데이터가 없습니다.</div>
        </div>
      )}
    </div>
  )
}
