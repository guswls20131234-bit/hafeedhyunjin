import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const NOW = new Date()
const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']

const DEAD_FIELDS = [
  { key:'dead_nursing',  label:'포유자돈', color:'#E74C3C', bg:'#FDECEA' },
  { key:'dead_early',    label:'초기자돈', color:'#E67E22', bg:'#FEF0E6' },
  { key:'dead_grower',   label:'육성구간', color:'#3498DB', bg:'#EBF5FB' },
  { key:'dead_finisher', label:'비육구간', color:'#27AE60', bg:'#E9F7EF' },
]

const EMPTY = {
  sows:0, mating:0, farrowing:0, born:0, total_born:0, piglet_death:0, weaning:0, weaned:0,
  diag_total:0, diag_preg:0, diag_open:0,
  dead_nursing:0, dead_early:0, dead_grower:0, dead_finisher:0,
}

export default function ProductionPage({ farmSlug }) {
  const slug = farmSlug || 'admin'
  const [year,    setYear]    = useState(NOW.getFullYear())
  const [month,   setMonth]   = useState(NOW.getMonth()+1)
  const [records, setRecords] = useState([])
  const [prevRecords, setPrevRecords] = useState([]) // 전년도 8~12월
  const [loading, setLoading] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [status,  setStatus]  = useState(null)
  const [vals,    setVals]    = useState(EMPTY)
  const [dirty,   setDirty]   = useState(false)

  const years = Array.from({length:5},(_,i)=>NOW.getFullYear()-i)

  useEffect(()=>{ loadRecords() },[slug, year])
  useEffect(()=>{
    const rec = records.find(r=>r.month===month)
    if (rec) setVals({
      sows:         rec.sows||0,
      mating:       rec.mating||0,
      farrowing:    rec.farrowing||0,
      born:         rec.born||0,
      weaning:      rec.weaning||0,
      weaned:       rec.weaned||0,
      diag_total:   rec.diag_total||0,
      diag_preg:    rec.diag_preg||0,
      diag_open:    rec.diag_open||0,
      dead_nursing: rec.dead_nursing||0,
      dead_early:   rec.dead_early||0,
      dead_grower:  rec.dead_grower||0,
      dead_finisher:rec.dead_finisher||0,
    })
    else setVals(EMPTY)
    setDirty(false)
  },[month, records])

  async function loadRecords() {
    setLoading(true)
    // 현재 연도 + 전년도 8~12월 데이터 함께 불러오기 (예상출하 1~5월용)
    const [curr, prev] = await Promise.all([
      supabase.from('production_records').select('*')
        .eq('farm_slug', slug).eq('year', year).order('month', {ascending:true}),
      supabase.from('production_records').select('*')
        .eq('farm_slug', slug).eq('year', year-1)
        .gte('month', 8).order('month', {ascending:true}),
    ])
    setRecords(curr.data||[])
    setPrevRecords(prev.data||[])
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true); setStatus(null)
    const { error } = await supabase.from('production_records').upsert({
      farm_slug: slug, year, month,
      sows:          Number(vals.sows)||0,
      mating:        Number(vals.mating)||0,
      farrowing:     Number(vals.farrowing)||0,
      born:          Number(vals.born)||0,
      total_born:    Number(vals.total_born)||0,
      piglet_death:  Number(vals.piglet_death)||0,
      weaning:       Number(vals.weaning)||0,
      weaned:        Number(vals.weaned)||0,
      diag_total:    Number(vals.diag_total)||0,
      diag_preg:     Number(vals.diag_preg)||0,
      diag_open:     Number(vals.diag_open)||0,
      dead_nursing:  Number(vals.dead_nursing)||0,
      dead_early:    Number(vals.dead_early)||0,
      dead_grower:   Number(vals.dead_grower)||0,
      dead_finisher: Number(vals.dead_finisher)||0,
    }, { onConflict: 'farm_slug,year,month' })
    setSaving(false)
    if (error) setStatus('❌ 저장 실패')
    else { setStatus('✅ 저장 완료!'); setDirty(false); loadRecords() }
    setTimeout(()=>setStatus(null), 3000)
  }

  function setVal(k,v){ setVals(p=>({...p,[k]:v})); setDirty(true) }

  // 자동계산
  const bpf      = vals.farrowing>0 ? (vals.born/vals.farrowing).toFixed(1)   : '—'
  const wpw      = vals.weaning>0   ? (vals.weaned/vals.weaning).toFixed(1)    : '—'
  const psy      = vals.sows>0 && vals.weaned>0 ? ((vals.weaned/vals.sows)*12).toFixed(1) : '—'
  // 임신진단 - 공태 자동계산, 수태율 자동계산
  const diagOpen = vals.diag_total>0 && vals.diag_preg>0
    ? vals.diag_total - Number(vals.diag_preg)
    : Number(vals.diag_open)||0
  const diagRate = vals.diag_total>0 && vals.diag_preg>0
    ? ((vals.diag_preg/vals.diag_total)*100).toFixed(1)
    : '—'

  const totalDead = (Number(vals.dead_nursing)||0)+(Number(vals.dead_early)||0)+(Number(vals.dead_grower)||0)+(Number(vals.dead_finisher)||0)

  // 차트용
  const maxMating = Math.max(...records.map(r=>r.mating||0), 1)
  const maxWeaned = Math.max(...records.map(r=>r.weaned||0), 1)
  const maxDead   = Math.max(...records.map(r=>(r.dead_nursing||0)+(r.dead_early||0)+(r.dead_grower||0)+(r.dead_finisher||0)), 1)

  // 연간 합계
  const tot = (k) => records.reduce((a,r)=>a+(r[k]||0),0)

  const inp = { border:'0.5px solid rgba(0,0,0,0.12)', borderRadius:8, padding:'8px 10px', fontSize:14, fontFamily:'inherit', outline:'none', background:'#fafafa', width:'100%', boxSizing:'border-box', textAlign:'right' }

  return (
    <div style={{padding:'0 0 3rem'}}>
      {/* 조회 컨트롤 */}
      <div style={{background:'white',border:'0.5px solid rgba(0,0,0,0.08)',borderRadius:10,padding:12,marginBottom:10}}>
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
              style={{marginLeft:'auto',padding:'7px 16px',background:'#1D9E75',color:'white',border:'none',borderRadius:8,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
              {saving?'저장 중...':'💾 저장'}
            </button>
          )}
          {status && <span style={{fontSize:12,fontWeight:600,color:status.includes('✅')?'#085041':'#A32D2D'}}>{status}</span>}
        </div>
      </div>

      {/* 생산 입력 */}
      <div style={{background:'white',border:'0.5px solid rgba(0,0,0,0.08)',borderRadius:12,padding:16,marginBottom:10}}>
        <div style={{fontSize:13,fontWeight:600,marginBottom:14}}>📊 {year}년 {month}월 생산 현황</div>

        {/* 상시모돈수 */}
        <div style={{background:'#F5F6F4',borderRadius:10,padding:'10px 12px',marginBottom:12}}>
          <div style={{fontSize:11,color:'#666',marginBottom:5,fontWeight:600}}>🐷 상시모돈수</div>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <input type="number" min="0" value={vals.sows||''} onChange={e=>setVal('sows',e.target.value)} placeholder="0"
              style={{...inp,background:'white',borderColor:'#1D9E75',fontSize:16,fontWeight:600}}/>
            <span style={{fontSize:12,color:'#888',flexShrink:0}}>두</span>
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
          {[
            {key:'mating',    label:'종부복수', unit:'복', color:'#378ADD', full:true},
            {key:'farrowing', label:'분만복수', unit:'복', color:'#1D9E75'},
            {key:'total_born',label:'총산자수', unit:'두', color:'#1D9E75'},
            {key:'piglet_death',label:'자돈폐사', unit:'두', color:'#C0392B'},
            {key:'born',      label:'산자수(이유전)',   unit:'두', color:'#1D9E75'},
            {key:'weaning',   label:'이유복수', unit:'복', color:'#BA7517'},
            {key:'weaned',    label:'이유두수', unit:'두', color:'#BA7517'},
          ].map(({key,label,unit,color,full})=>(
            <div key={key} style={{gridColumn:full?'1/-1':'auto'}}>
              <div style={{fontSize:11,color:'#888',marginBottom:4}}>{label}</div>
              <div style={{display:'flex',alignItems:'center',gap:5}}>
                <input type="number" min="0" value={vals[key]||''} onChange={e=>setVal(key,e.target.value)} placeholder="0"
                  style={{...inp,borderColor:vals[key]>0?color:'rgba(0,0,0,0.12)'}}/>
                <span style={{fontSize:11,color:'#888',flexShrink:0}}>{unit}</span>
              </div>
            </div>
          ))}
        </div>

        {/* 임신진단 */}
        <div style={{background:'#EEF4FF',borderRadius:10,padding:'12px',marginBottom:12}}>
          <div style={{fontSize:11,fontWeight:600,color:'#2563EB',marginBottom:10}}>🔬 임신진단 결과</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            <div>
              <div style={{fontSize:11,color:'#888',marginBottom:4}}>총 진단두수</div>
              <div style={{display:'flex',alignItems:'center',gap:5}}>
                <input type="number" min="0" value={vals.diag_total||''} onChange={e=>setVal('diag_total',e.target.value)} placeholder="0"
                  style={{...inp,borderColor:vals.diag_total>0?'#2563EB':'rgba(0,0,0,0.12)'}}/>
                <span style={{fontSize:11,color:'#888',flexShrink:0}}>두</span>
              </div>
            </div>
            <div>
              <div style={{fontSize:11,color:'#888',marginBottom:4}}>수태</div>
              <div style={{display:'flex',alignItems:'center',gap:5}}>
                <input type="number" min="0" value={vals.diag_preg||''} onChange={e=>setVal('diag_preg',e.target.value)} placeholder="0"
                  style={{...inp,borderColor:vals.diag_preg>0?'#1D9E75':'rgba(0,0,0,0.12)'}}/>
                <span style={{fontSize:11,color:'#888',flexShrink:0}}>두</span>
              </div>
            </div>
          </div>
          {/* 자동계산: 공태, 수태율 */}
          {vals.diag_total>0 && vals.diag_preg>0 && (
            <div style={{display:'flex',gap:8,marginTop:10}}>
              <div style={{flex:1,background:'white',borderRadius:8,padding:'8px 10px'}}>
                <div style={{fontSize:9,color:'#888',marginBottom:2}}>공태</div>
                <div style={{fontSize:16,fontWeight:700,color:'#E74C3C'}}>{diagOpen}<span style={{fontSize:10,marginLeft:1}}>두</span></div>
              </div>
              <div style={{flex:1,background:'white',borderRadius:8,padding:'8px 10px'}}>
                <div style={{fontSize:9,color:'#888',marginBottom:2}}>수태율</div>
                <div style={{fontSize:16,fontWeight:700,color:'#2563EB'}}>{diagRate}<span style={{fontSize:10,marginLeft:1}}>%</span></div>
              </div>
            </div>
          )}
        </div>

        {/* 생산 자동계산 */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
          <div style={{background:'#E1F5EE',borderRadius:8,padding:'8px 10px'}}>
            <div style={{fontSize:9,color:'#085041',marginBottom:2}}>복당 산자수</div>
            <div style={{fontSize:16,fontWeight:700,color:'#085041'}}>{bpf}<span style={{fontSize:10,marginLeft:1}}>두</span></div>
          </div>
          <div style={{background:'#FAEEDA',borderRadius:8,padding:'8px 10px'}}>
            <div style={{fontSize:9,color:'#633806',marginBottom:2}}>복당 이유두수</div>
            <div style={{fontSize:16,fontWeight:700,color:'#633806'}}>{wpw}<span style={{fontSize:10,marginLeft:1}}>두</span></div>
          </div>
          <div style={{background:'#EDE8FB',borderRadius:8,padding:'8px 10px'}}>
            <div style={{fontSize:9,color:'#5B3FA6',marginBottom:2}}>PSY</div>
            <div style={{fontSize:16,fontWeight:700,color:'#5B3FA6'}}>{psy}<span style={{fontSize:10,marginLeft:1}}>두</span></div>
          </div>
        </div>
      </div>

      {/* 연간 현황 테이블 */}
      {records.length>0 && (<>
        <div style={{background:'white',border:'0.5px solid rgba(0,0,0,0.08)',borderRadius:12,padding:16,marginBottom:10}}>
          <div style={{fontSize:13,fontWeight:600,marginBottom:14}}>📋 {year}년 월별 생산 현황</div>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:11,minWidth:560}}>
              <thead>
                <tr style={{background:'#F5F6F4'}}>
                  {['월','모돈','종부','분만','산자','자돈폐사','실산','이유복','이유두','복당산자','복당이유','수태율'].map(h=>(
                    <th key={h} style={{padding:'6px 6px',textAlign:'center',fontWeight:500,color:'#6b6b68',borderBottom:'0.5px solid rgba(0,0,0,0.08)',whiteSpace:'nowrap',fontSize:10}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((r,i)=>{
                  const b   = r.farrowing>0?(r.born/r.farrowing).toFixed(1):'—'
                  const w   = r.weaning>0?(r.weaned/r.weaning).toFixed(1):'—'
                  const realBorn = r.farrowing>0 && r.total_born>0
                    ? ((r.total_born - (r.piglet_death||0)) / r.farrowing).toFixed(1) : '—'
                  const dr  = r.diag_total>0&&r.diag_preg>0?((r.diag_preg/r.diag_total)*100).toFixed(1)+'%':'—'
                  const isCur = r.month===month
                  return (
                    <tr key={i} onClick={()=>setMonth(r.month)}
                      style={{borderBottom:'0.5px solid rgba(0,0,0,0.05)',background:isCur?'#F0FAF5':'transparent',cursor:'pointer'}}>
                      <td style={{padding:'7px 6px',textAlign:'center',fontWeight:isCur?700:500,color:isCur?'#085041':'#1a1a18'}}>{r.month}월</td>
                      <td style={{padding:'7px 6px',textAlign:'center',color:'#555'}}>{r.sows||'—'}</td>
                      <td style={{padding:'7px 6px',textAlign:'center',color:'#378ADD'}}>{r.mating||'—'}</td>
                      <td style={{padding:'7px 6px',textAlign:'center',color:'#1D9E75'}}>{r.farrowing||'—'}</td>
                      <td style={{padding:'7px 6px',textAlign:'center'}}>{r.total_born||r.born||'—'}</td>
                      <td style={{padding:'7px 6px',textAlign:'center',color:'#C0392B'}}>{r.piglet_death||'—'}</td>
                      <td style={{padding:'7px 6px',textAlign:'center',fontWeight:500,color:'#085041'}}>{realBorn}</td>
                      <td style={{padding:'7px 6px',textAlign:'center',color:'#BA7517'}}>{r.weaning||'—'}</td>
                      <td style={{padding:'7px 6px',textAlign:'center'}}>{r.weaned||'—'}</td>
                      <td style={{padding:'7px 6px',textAlign:'center',fontWeight:500}}>{b}</td>
                      <td style={{padding:'7px 6px',textAlign:'center',fontWeight:500}}>{w}</td>
                      <td style={{padding:'7px 6px',textAlign:'center',fontWeight:500,color:'#2563EB'}}>{dr}</td>
                    </tr>
                  )
                })}
              </tbody>
              {records.length>1 && (
                <tfoot>
                  <tr style={{background:'#F0FAF5',borderTop:'1.5px solid rgba(29,158,117,0.3)'}}>
                    <td style={{padding:'7px 6px',textAlign:'center',fontWeight:700,fontSize:10,color:'#085041'}}>합계</td>
                    <td style={{padding:'7px 6px',textAlign:'center',color:'#555'}}>{Math.round(records.reduce((a,r)=>a+(r.sows||0),0)/records.length)||'—'}</td>
                    <td style={{padding:'7px 6px',textAlign:'center',fontWeight:600,color:'#378ADD'}}>{tot('mating')}</td>
                    <td style={{padding:'7px 6px',textAlign:'center',fontWeight:600,color:'#1D9E75'}}>{tot('farrowing')}</td>
                    <td style={{padding:'7px 6px',textAlign:'center',fontWeight:600}}>{tot('total_born')||tot('born')}</td>
                    <td style={{padding:'7px 6px',textAlign:'center',fontWeight:600,color:'#C0392B'}}>{tot('piglet_death')||'—'}</td>
                    <td style={{padding:'7px 6px',textAlign:'center',fontWeight:700,color:'#085041'}}>
                      {tot('farrowing')>0&&tot('total_born')>0
                        ? ((tot('total_born')-tot('piglet_death'))/tot('farrowing')).toFixed(1) : '—'}
                    </td>
                    <td style={{padding:'7px 6px',textAlign:'center',fontWeight:600,color:'#BA7517'}}>{tot('weaning')}</td>
                    <td style={{padding:'7px 6px',textAlign:'center',fontWeight:600}}>{tot('weaned')}</td>
                    <td style={{padding:'7px 6px',textAlign:'center',fontWeight:700,color:'#085041'}}>{tot('farrowing')>0?(tot('born')/tot('farrowing')).toFixed(1):'—'}</td>
                    <td style={{padding:'7px 6px',textAlign:'center',fontWeight:700,color:'#085041'}}>{tot('weaning')>0?(tot('weaned')/tot('weaning')).toFixed(1):'—'}</td>
                    <td style={{padding:'7px 6px',textAlign:'center',fontWeight:700,color:'#2563EB'}}>{tot('diag_total')>0?((tot('diag_preg')/tot('diag_total'))*100).toFixed(1)+'%':'—'}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* 바 차트 */}
          <div style={{marginTop:16,display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div style={{background:'#E6F1FB',borderRadius:10,padding:'10px 12px'}}>
              <div style={{fontSize:11,fontWeight:600,color:'#0C447C',marginBottom:8}}>종부 / 분만</div>
              {records.map((r,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:5,marginBottom:4}}>
                  <span style={{fontSize:10,color:'#888',width:22,flexShrink:0}}>{r.month}월</span>
                  <div style={{flex:1}}>
                    <div style={{background:'#dde8f5',borderRadius:99,height:4,overflow:'hidden',marginBottom:2}}>
                      <div style={{width:`${(r.mating||0)/maxMating*100}%`,height:'100%',background:'#378ADD',borderRadius:99}}/>
                    </div>
                    <div style={{background:'#dde8f5',borderRadius:99,height:4,overflow:'hidden'}}>
                      <div style={{width:`${(r.farrowing||0)/maxMating*100}%`,height:'100%',background:'#1D9E75',borderRadius:99}}/>
                    </div>
                  </div>
                  <span style={{fontSize:9,color:'#555',width:24,textAlign:'right'}}>{r.mating||0}</span>
                </div>
              ))}
              <div style={{display:'flex',gap:8,marginTop:6,fontSize:9}}>
                <span style={{display:'flex',alignItems:'center',gap:2}}><span style={{width:7,height:3,background:'#378ADD',borderRadius:99,display:'inline-block'}}></span>종부</span>
                <span style={{display:'flex',alignItems:'center',gap:2}}><span style={{width:7,height:3,background:'#1D9E75',borderRadius:99,display:'inline-block'}}></span>분만</span>
              </div>
            </div>
            <div style={{background:'#FAEEDA',borderRadius:10,padding:'10px 12px'}}>
              <div style={{fontSize:11,fontWeight:600,color:'#633806',marginBottom:8}}>이유두수</div>
              {records.map((r,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:5,marginBottom:4}}>
                  <span style={{fontSize:10,color:'#888',width:22,flexShrink:0}}>{r.month}월</span>
                  <div style={{flex:1,background:'#f5e5c8',borderRadius:99,height:7,overflow:'hidden'}}>
                    <div style={{width:`${(r.weaned||0)/maxWeaned*100}%`,height:'100%',background:'#BA7517',borderRadius:99}}/>
                  </div>
                  <span style={{fontSize:9,color:'#555',width:28,textAlign:'right'}}>{r.weaned||0}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </>)}

      {/* 폐사 입력 */}
      <div style={{background:'white',border:'0.5px solid rgba(0,0,0,0.08)',borderRadius:12,padding:16,marginBottom:10}}>
        <div style={{fontSize:13,fontWeight:600,marginBottom:6}}>💀 {month}월 폐사 현황</div>
        <div style={{fontSize:11,color:'#aaa',marginBottom:12}}>구간별 폐사두수 입력</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          {DEAD_FIELDS.map(({key,label,color,bg})=>(
            <div key={key} style={{background:bg,borderRadius:10,padding:'10px 12px'}}>
              <div style={{fontSize:11,color,marginBottom:6,fontWeight:600}}>{label}</div>
              <div style={{display:'flex',alignItems:'center',gap:5}}>
                <input type="number" min="0" value={vals[key]||''} onChange={e=>setVal(key,e.target.value)} placeholder="0"
                  style={{...inp,background:'white',borderColor:color,fontSize:16,fontWeight:600,color}}/>
                <span style={{fontSize:11,color:'#888',flexShrink:0}}>두</span>
              </div>
            </div>
          ))}
        </div>
        <div style={{marginTop:12,paddingTop:12,borderTop:'0.5px solid rgba(0,0,0,0.07)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontSize:12,color:'#888'}}>이번 달 총 폐사</span>
          <span style={{fontSize:18,fontWeight:700,color:'#C0392B'}}>{totalDead}<span style={{fontSize:11,marginLeft:2,color:'#888'}}>두</span></span>
        </div>
      </div>

      {/* 폐사 추이 */}
      {records.length>0 && (
        <div style={{background:'white',border:'0.5px solid rgba(0,0,0,0.08)',borderRadius:12,padding:16,marginBottom:10}}>
          <div style={{fontSize:13,fontWeight:600,marginBottom:14}}>📉 월별 폐사 추이</div>
          {records.map((r,i)=>{
            const tot2 = (r.dead_nursing||0)+(r.dead_early||0)+(r.dead_grower||0)+(r.dead_finisher||0)
            const isCur = r.month===month
            return (
              <div key={i} style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                <span style={{fontSize:11,color:isCur?'#C0392B':'#888',fontWeight:isCur?700:400,width:24,flexShrink:0}}>{r.month}월</span>
                <div style={{flex:1,height:16,borderRadius:99,overflow:'hidden',display:'flex',background:'#F1EFE8'}}>
                  {DEAD_FIELDS.map(({key,color})=>(
                    <div key={key} style={{width:`${maxDead>0?(r[key]||0)/maxDead*100:0}%`,background:color}}/>
                  ))}
                </div>
                <span style={{fontSize:11,color:isCur?'#C0392B':'#555',fontWeight:isCur?700:400,width:28,textAlign:'right'}}>{tot2||0}</span>
              </div>
            )
          })}
          <div style={{display:'flex',gap:10,marginTop:8,flexWrap:'wrap'}}>
            {DEAD_FIELDS.map(({label,color})=>(
              <span key={label} style={{display:'flex',alignItems:'center',gap:4,fontSize:10,color:'#666'}}>
                <span style={{width:8,height:8,background:color,borderRadius:2,display:'inline-block'}}></span>{label}
              </span>
            ))}
          </div>
          <div style={{marginTop:12,overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:11,minWidth:300}}>
              <thead>
                <tr style={{background:'#F5F6F4'}}>
                  {['월','포유자돈','초기자돈','육성','비육','합계'].map(h=>(
                    <th key={h} style={{padding:'6px 7px',textAlign:'center',fontWeight:500,color:'#6b6b68',borderBottom:'0.5px solid rgba(0,0,0,0.08)',fontSize:10}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((r,i)=>{
                  const tot2 = (r.dead_nursing||0)+(r.dead_early||0)+(r.dead_grower||0)+(r.dead_finisher||0)
                  const isCur = r.month===month
                  return (
                    <tr key={i} onClick={()=>setMonth(r.month)}
                      style={{borderBottom:'0.5px solid rgba(0,0,0,0.05)',background:isCur?'#FEF5F5':'transparent',cursor:'pointer'}}>
                      <td style={{padding:'7px',textAlign:'center',fontWeight:isCur?700:400,color:isCur?'#C0392B':'#1a1a18'}}>{r.month}월</td>
                      <td style={{padding:'7px',textAlign:'center',color:'#E74C3C'}}>{r.dead_nursing||'—'}</td>
                      <td style={{padding:'7px',textAlign:'center',color:'#E67E22'}}>{r.dead_early||'—'}</td>
                      <td style={{padding:'7px',textAlign:'center',color:'#3498DB'}}>{r.dead_grower||'—'}</td>
                      <td style={{padding:'7px',textAlign:'center',color:'#27AE60'}}>{r.dead_finisher||'—'}</td>
                      <td style={{padding:'7px',textAlign:'center',fontWeight:600,color:isCur?'#C0392B':'#1a1a18'}}>{tot2||0}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{background:'#FEF5F5',borderTop:'1.5px solid rgba(192,57,43,0.2)'}}>
                  <td style={{padding:'7px',textAlign:'center',fontWeight:700,fontSize:10,color:'#C0392B'}}>합계</td>
                  {['dead_nursing','dead_early','dead_grower','dead_finisher'].map(k=>(
                    <td key={k} style={{padding:'7px',textAlign:'center',fontWeight:600}}>{tot(k)||0}</td>
                  ))}
                  <td style={{padding:'7px',textAlign:'center',fontWeight:700,color:'#C0392B'}}>
                    {['dead_nursing','dead_early','dead_grower','dead_finisher'].reduce((a,k)=>a+tot(k),0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {records.length===0 && !loading && (
        <div style={{background:'white',borderRadius:12,padding:'40px',textAlign:'center',border:'0.5px solid rgba(0,0,0,0.08)'}}>
          <div style={{fontSize:32,marginBottom:10}}>📋</div>
          <div style={{fontSize:13,color:'#aaa'}}>아직 입력된 데이터가 없습니다.</div>
        </div>
      )}

      {/* 월별 예상 출하두수 그래프 */}
      {(() => {
        // 전년 8~12월 + 올해 1~7월 이유두수 합쳐서 12개월 예상출하 계산
        const allWeaned = [
          ...prevRecords.map(r=>({year:year-1, month:r.month, weaned:r.weaned||0})),
          ...records.map(r=>({year, month:r.month, weaned:r.weaned||0})),
        ]

        const shipmentData = allWeaned
          .filter(r => r.weaned > 0)
          .map(r => {
            const totalMonth = r.year * 12 + r.month + 5
            const shipYear  = Math.floor((totalMonth - 1) / 12)
            const shipMonth = totalMonth - shipYear * 12
            return {
              weanMonth: r.month,
              weanYear:  r.year,
              shipMonth,
              shipYear,
              weaned:   r.weaned,
              expected: Math.round(r.weaned * 0.9),
            }
          })
          .filter(d => d.shipYear === year) // 올해 출하분만
          .sort((a,b) => a.shipMonth - b.shipMonth)

        if (!shipmentData.length) return null
        const maxExpected = Math.max(...shipmentData.map(d=>d.expected), 1)
        const currentMonth = NOW.getMonth() + 1
        const currentYear  = NOW.getFullYear()

        return (
          <div style={{background:'white',border:'0.5px solid rgba(0,0,0,0.08)',borderRadius:12,padding:16,marginTop:10}}>
            <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>🐷 {year}년 월별 예상 출하두수</div>
            <div style={{fontSize:11,color:'#aaa',marginBottom:14}}>이유두수 × 90% · 이유 후 5개월 기준</div>

            {shipmentData.map((d,i)=>{
              const pct = (d.expected / maxExpected) * 100
              const isPast    = year < currentYear || (year===currentYear && d.shipMonth < currentMonth)
              const isCurrent = year===currentYear && d.shipMonth===currentMonth
              return (
                <div key={i} style={{marginBottom:10}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      <span style={{fontSize:11,fontWeight:isCurrent?700:500,color:isCurrent?'#085041':isPast?'#aaa':'#1a1a18'}}>
                        {d.shipMonth}월 출하
                        {isCurrent && <span style={{fontSize:10,color:'#1D9E75',marginLeft:4,fontWeight:600}}>← 이번달</span>}
                      </span>
                      <span style={{fontSize:10,color:'#bbb'}}>
                        ({d.weanYear!==year?`${d.weanYear}년 `:''}{d.weanMonth}월 이유)
                      </span>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <span style={{fontSize:13,fontWeight:700,color:isCurrent?'#085041':isPast?'#aaa':'#378ADD'}}>
                        {d.expected.toLocaleString()}두
                      </span>
                      <span style={{fontSize:10,color:'#bbb',marginLeft:4}}>({d.weaned}×0.9)</span>
                    </div>
                  </div>
                  <div style={{background:'#F1EFE8',borderRadius:99,height:12,overflow:'hidden'}}>
                    <div style={{
                      width:`${pct}%`,height:'100%',borderRadius:99,
                      background: isCurrent ? '#1D9E75' : isPast ? '#ccc' : '#378ADD',
                      transition:'width 0.4s'
                    }}/>
                  </div>
                </div>
              )
            })}

            <div style={{marginTop:12,paddingTop:12,borderTop:'0.5px solid rgba(0,0,0,0.07)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:12,color:'#888'}}>{year}년 연간 예상 총 출하</span>
              <span style={{fontSize:15,fontWeight:700,color:'#085041'}}>
                {shipmentData.reduce((a,d)=>a+d.expected,0).toLocaleString()}두
              </span>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
