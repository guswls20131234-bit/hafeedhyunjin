import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import ScatterChart from '../components/ScatterChart'
import Footer from '../components/Footer'

function Stats({ data, filter, mode }) {
  if (!data.length) return null
  const avgCw    = (data.reduce((a,d)=>a+d.cw,0)/data.length).toFixed(1)
  const avgBf    = (data.reduce((a,d)=>a+d.bf,0)/data.length).toFixed(1)
  const plus     = data.filter(d=>d.cw>=83&&d.cw<93&&d.bf>=17&&d.bf<25).length
  const female   = data.filter(d=>d.sex==='암').length
  const castrate = data.filter(d=>d.sex==='거세').length
  const total    = female+castrate
  const dateLabel = filter==='all'?'전체 기간':mode==='monthly'?filter.replace('-','년 ')+'월':filter
  return (
    <>
      <div className="stat-grid">
        <div className="stat-box"><div className="stat-label">평균 도체중</div><div><span className="stat-val">{avgCw}</span><span className="stat-unit">kg</span></div></div>
        <div className="stat-box"><div className="stat-label">평균 등지방</div><div><span className="stat-val">{avgBf}</span><span className="stat-unit">mm</span></div></div>
        <div className="stat-box"><div className="stat-label">총 출하 두수</div><div><span className="stat-val">{data.length}</span><span className="stat-unit">두</span></div></div>
        <div className="stat-box"><div className="stat-label">1등급+ 비율</div><div><span className="stat-val">{((plus/data.length)*100).toFixed(1)}</span><span className="stat-unit">%</span></div></div>
      </div>
      <div className="sex-bar">
        <b style={{color:'#1a1a18'}}>{dateLabel}</b>
        <span style={{color:'rgba(0,0,0,0.15)'}}>|</span>
        <span>암컷</span><b>{female}두</b>
        <span>거세</span><b>{castrate}두</b>
        <span>암컷 비율</span><b style={{color:'#185FA5'}}>{total>0?((female/total)*100).toFixed(1)+'%':'—'}</b>
      </div>
    </>
  )
}

export default function FarmPage() {
  const { farmSlug } = useParams()
  const [farm,   setFarm]   = useState(null)
  const [data,   setData]   = useState([])
  const [mode,   setMode]   = useState('daily')
  const [filter, setFilter] = useState('all')
  const [loading,setLoading]= useState(true)

  useEffect(()=>{
    async function load() {
      const { data:farmRow } = await supabase.from('farms').select('*').eq('slug', farmSlug).single()
      if (!farmRow) { setLoading(false); return }
      setFarm(farmRow)
      const { data:rows } = await supabase.from('shipments').select('*').eq('farm_slug', farmSlug).order('date',{ascending:false})
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
            <div className="farm-name">{farm.name} <span className="badge badge-green">출하 성적</span></div>
            <div className="farm-sub">{farm.owner} · 출하 성적 분석 대시보드</div>
          </div>
        </div>
      </div>

      {data.length===0?(
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
        </div>
      )}
    </div>
    <Footer/>
  </>
  )
}
