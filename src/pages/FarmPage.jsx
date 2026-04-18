import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import ScatterChart from '../components/ScatterChart'
import Footer from '../components/Footer'
import FeedPage from './FeedPage'

function isGradePlus(cw, bf) { return cw>=83&&cw<93&&bf>=17&&bf<25 }
function gradeLabel(cw, bf) {
  if (isGradePlus(cw,bf)) return {text:'1등급+',color:'#A32D2D',bg:'#FCEBEB'}
  if ((cw>=80&&cw<83&&bf>=15&&bf<=28)||(cw>=83&&cw<93&&bf>=15&&bf<17)||(cw>=83&&cw<93&&bf>=25&&bf<=28)||(cw>=93&&cw<98&&bf>=15&&bf<=28))
    return {text:'1등급',color:'#0C447C',bg:'#E6F1FB'}
  return {text:'등외',color:'#5F5E5A',bg:'#F1EFE8'}
}

function Stats({ data, filter, mode }) {
  if (!data.length) return null
  const avgCw    = (data.reduce((a,d)=>a+d.cw,0)/data.length).toFixed(1)
  const avgBf    = (data.reduce((a,d)=>a+d.bf,0)/data.length).toFixed(1)
  const avgLw    = data.filter(d=>d.lw>0).length > 0
    ? (data.filter(d=>d.lw>0).reduce((a,d)=>a+d.lw,0) / data.filter(d=>d.lw>0).length).toFixed(1)
    : null
  const dressingPct = avgLw
    ? ((parseFloat(avgCw) / parseFloat(avgLw)) * 100).toFixed(1)
    : null
  const plus     = data.filter(d=>isGradePlus(d.cw,d.bf)).length
  const female   = data.filter(d=>d.sex==='암').length
  const castrate = data.filter(d=>d.sex==='거세').length
  const total    = female+castrate
  const dateLabel = filter==='all'?'전체 기간':mode==='monthly'?filter.replace('-','년 ')+'월':filter

  // 육가공 업체 목록 (중복 제거)
  const meatcos = [...new Set(data.map(d=>d.meatco).filter(Boolean))]

  return (
    <>
      <div className="stat-grid">
        <div className="stat-box"><div className="stat-label">평균 생체중</div><div><span className="stat-val">{avgLw??'—'}</span><span className="stat-unit">{avgLw?' kg':''}</span></div></div>
        <div className="stat-box"><div className="stat-label">평균 도체중</div><div><span className="stat-val">{avgCw}</span><span className="stat-unit">kg</span></div></div>
        <div className="stat-box"><div className="stat-label">평균 등지방</div><div><span className="stat-val">{avgBf}</span><span className="stat-unit">mm</span></div></div>
        <div className="stat-box"><div className="stat-label">지육율</div><div><span className="stat-val">{dressingPct??'—'}</span><span className="stat-unit">{dressingPct?' %':''}</span></div></div>
        <div className="stat-box"><div className="stat-label">총 출하 두수</div><div><span className="stat-val">{data.length}</span><span className="stat-unit">두</span></div></div>
        <div className="stat-box"><div className="stat-label">1등급+ 비율</div><div><span className="stat-val">{((plus/data.length)*100).toFixed(1)}</span><span className="stat-unit">%</span></div></div>
      </div>
      <div style={{background:'#F5F6F4',borderRadius:7,padding:'8px 12px',marginBottom:10}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:4,marginBottom: meatcos.length?5:0}}>
          <div style={{fontSize:12,fontWeight:700,color:'#1a1a18'}}>{dateLabel}</div>
          {meatcos.length > 0 && (
            <div style={{display:'flex',alignItems:'center',gap:5}}>
              <span style={{fontSize:11,color:'#888'}}>육가공</span>
              {meatcos.map((m,i)=>(
                <span key={i} style={{fontSize:11,fontWeight:500,color:'#085041',background:'#E1F5EE',padding:'1px 8px',borderRadius:99}}>{m}</span>
              ))}
            </div>
          )}
        </div>
        <div style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap',fontSize:12}}>
          <span style={{color:'#888'}}>암컷 <b style={{color:'#1a1a18'}}>{female}두</b></span>
          <span style={{color:'#888'}}>거세 <b style={{color:'#1a1a18'}}>{castrate}두</b></span>
          <span style={{color:'#888'}}>암컷 비율 <b style={{color:'#185FA5'}}>{total>0?((female/total)*100).toFixed(1)+'%':'—'}</b></span>
        </div>
      </div>
    </>
  )
}

function DetailTable({ data }) {
  const [open, setOpen] = useState(false)
  if (!data.length) return null
  const sorted = [...data].sort((a,b)=>String(a.id||'').localeCompare(String(b.id||'')))
  return (
    <div style={{marginTop:12}}>
      <button onClick={()=>setOpen(v=>!v)}
        style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',
          padding:'10px 14px',background:'#F5F6F4',border:'0.5px solid rgba(0,0,0,0.10)',
          borderRadius:8,cursor:'pointer',fontFamily:'inherit',fontSize:13,fontWeight:500,color:'#1a1a18'}}>
        <span>개체별 보기 ({data.length}두)</span>
        <span style={{fontSize:11,color:'#888',transition:'transform 0.2s',display:'inline-block',transform:open?'rotate(180deg)':'rotate(0deg)'}}>▼</span>
      </button>
      {open&&(
        <div style={{marginTop:8,overflowX:'auto',borderRadius:8,border:'0.5px solid rgba(0,0,0,0.10)'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:13,minWidth:520}}>
            <thead>
              <tr style={{background:'#F5F6F4'}}>
                {['개체번호','암수','생체중(kg)','도체중(kg)','등지방(mm)','생돈대(원)','등급'].map(h=>(
                  <th key={h} style={{padding:'8px 12px',textAlign:'left',fontWeight:500,color:'#6b6b68',borderBottom:'0.5px solid rgba(0,0,0,0.10)',whiteSpace:'nowrap'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((d,i)=>{
                const g=gradeLabel(d.cw,d.bf)
                return (
                  <tr key={i} style={{borderBottom:'0.5px solid rgba(0,0,0,0.07)',background:i%2===0?'#fff':'#fafafa'}}>
                    <td style={{padding:'8px 12px',fontWeight:500}}>{d.id||'—'}</td>
                    <td style={{padding:'8px 12px'}}>{d.sex||'—'}</td>
                    <td style={{padding:'8px 12px'}}>{d.lw?Number(d.lw).toFixed(1):'—'}</td>
                    <td style={{padding:'8px 12px'}}>{Number(d.cw).toFixed(1)}</td>
                    <td style={{padding:'8px 12px'}}>{Number(d.bf).toFixed(1)}</td>
                    <td style={{padding:'8px 12px'}}>{d.price?Number(d.price).toLocaleString()+'원':'—'}</td>
                    <td style={{padding:'8px 12px'}}>
                      <span style={{fontSize:11,padding:'2px 8px',borderRadius:99,fontWeight:500,background:g.bg,color:g.color}}>{g.text}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const TABS = [
  { key: 'shipment', label: '출하성적' },
  { key: 'feed',     label: '사료현황' },
]

export default function FarmPage() {
  const { farmSlug } = useParams()
  const [farm,   setFarm]   = useState(null)
  const [data,   setData]   = useState([])
  const [mode,   setMode]   = useState('daily')
  const [filter, setFilter] = useState('all')
  const [loading,setLoading]= useState(true)
  const [tab,    setTab]    = useState('shipment')

  useEffect(()=>{
    async function load() {
      const { data:farmRow } = await supabase.from('farms').select('*').eq('slug',farmSlug).single()
      if (!farmRow) { setLoading(false); return }
      setFarm(farmRow)
      const { data:rows } = await supabase.from('shipments').select('*').eq('farm_slug',farmSlug).order('date',{ascending:false})
      setData(rows||[])
      setLoading(false)
    }
    load()
  },[farmSlug])

  if (loading) return <div className="page"><div className="empty">데이터를 불러오는 중...</div></div>
  if (!farm)   return <div className="page"><div className="empty">존재하지 않는 농장 링크입니다.</div></div>

  function getLabel(d){ return mode==='daily'?d.date:d.date?.slice(0,7) }
  const filtered = filter==='all'?data:data.filter(d=>getLabel(d)===filter)
  const labels   = [...new Set(data.map(getLabel))].sort().reverse()

  return (
  <>
    <div className="page">
      <div className="header">
        <div className="header-left">
          <div className="avatar">{farm.initial}</div>
          <div>
            <div className="farm-name">{farm.name}</div>
            <div className="farm-sub">{farm.owner} · 출하 성적 분석 대시보드</div>
          </div>
        </div>
      </div>

      {/* 상단 탭 메뉴 */}
      <div style={{display:'flex',gap:2,background:'white',border:'0.5px solid rgba(0,0,0,0.10)',borderRadius:10,padding:4,marginBottom:14}}>
        {TABS.map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key)}
            style={{flex:1,padding:'8px 4px',border:'none',borderRadius:7,cursor:'pointer',fontFamily:'inherit',
              fontSize:13,fontWeight:500,transition:'all 0.15s',
              background:tab===t.key?'#1D9E75':'transparent',
              color:tab===t.key?'white':'#888'}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* 출하성적 탭 */}
      {tab==='shipment' && (
        data.length===0?(
          <div className="card"><div className="empty" style={{padding:'32px 0'}}>아직 업로드된 데이터가 없습니다.</div></div>
        ):(
          <div className="card">
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10,marginBottom:12}}>
              <div>
                <div style={{fontWeight:600}}>도체중 vs 등지방 산점도</div>
                <div style={{fontSize:12,color:'#888',marginTop:2}}>탕박도체 등급 기준선 포함</div>
              </div>
              <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
                <div className="seg">
                  <button className={mode==='daily'?'active':''} onClick={()=>setMode('daily')}>일별</button>
                  <button className={mode==='monthly'?'active':''} onClick={()=>setMode('monthly')}>월별</button>
                </div>
                <select value={filter} onChange={e=>setFilter(e.target.value)}>
                  <option value="all">전체 기간</option>
                  {labels.map(l=><option key={l} value={l}>{mode==='daily'?l:l.replace('-','년 ')+'월'}</option>)}
                </select>
              </div>
            </div>
            <Stats data={filtered} filter={filter} mode={mode}/>
            <ScatterChart data={filtered}/>
            <div className="legend" style={{marginTop:10}}>
              <div className="leg-item"><div className="leg-dot" style={{background:'#E24B4A'}}></div>1등급+ 범위 내</div>
              <div className="leg-item"><div className="leg-dot" style={{background:'#378ADD'}}></div>1등급 이하</div>
              <div className="leg-item"><div className="leg-rect" style={{background:'rgba(210,40,40,0.10)',border:'2px solid rgba(210,40,40,0.7)'}}></div>1등급+</div>
              <div className="leg-item"><div className="leg-rect" style={{background:'rgba(55,138,221,0.08)',border:'2px solid rgba(55,138,221,0.6)'}}></div>1등급</div>
            </div>
            <DetailTable data={filtered}/>
          </div>
        )
      )}

      {/* 사료현황 탭 */}
      {tab==='feed' && <FeedPage farmSlug={farmSlug}/>}
    </div>
    <Footer/>
  </>
  )
}
