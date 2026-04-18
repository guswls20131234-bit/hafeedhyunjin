import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { parseExcel } from '../lib/parseExcel'
import ScatterChart from '../components/ScatterChart'
import Footer from '../components/Footer'
import FeedPage from './FeedPage'

const ADMIN_PASSWORD = '1234'

function isGradePlus(cw,bf){ return cw>=83&&cw<93&&bf>=17&&bf<25 }
function gradeLabel(cw,bf){
  if(isGradePlus(cw,bf)) return {text:'1등급+',color:'#A32D2D',bg:'#FCEBEB'}
  if((cw>=80&&cw<83&&bf>=15&&bf<=28)||(cw>=83&&cw<93&&bf>=15&&bf<17)||(cw>=83&&cw<93&&bf>=25&&bf<=28)||(cw>=93&&cw<98&&bf>=15&&bf<=28))
    return {text:'1등급',color:'#0C447C',bg:'#E6F1FB'}
  return {text:'등외',color:'#5F5E5A',bg:'#F1EFE8'}
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

function slugify(owner, name) {
  const str = (owner + name).toLowerCase().replace(/\s+/g,'')
  return str.slice(0,20) + '_' + Date.now().toString().slice(-4)
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
  const plus     = data.filter(d=>d.cw>=83&&d.cw<93&&d.bf>=17&&d.bf<25).length
  const female   = data.filter(d=>d.sex==='암').length
  const castrate = data.filter(d=>d.sex==='거세').length
  const total    = female+castrate
  const dateLabel = filter==='all'?'전체 기간':mode==='monthly'?filter.replace('-','년 ')+'월':filter
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
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:4,marginBottom:meatcos.length?5:0}}>
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

export default function AdminPage() {
  const [authed,         setAuthed]         = useState(false)
  const [pw,             setPw]             = useState('')
  const [pwErr,          setPwErr]          = useState(false)
  const [tab,            setTab]            = useState('shipment')
  const [farms,          setFarms]          = useState([])
  const [selFarm,        setSelFarm]        = useState(null)
  const [farmsLoading,   setFarmsLoading]   = useState(true)
  const [newName,        setNewName]        = useState('')
  const [newOwner,       setNewOwner]       = useState('')
  const [addStatus,      setAddStatus]      = useState(null)
  const [addLoading,     setAddLoading]     = useState(false)
  const [delFarmConfirm, setDelFarmConfirm] = useState(null)
  const [dbData,         setDbData]         = useState([])
  const [status,         setStatus]         = useState(null)
  const [loading,        setLoading]        = useState(false)
  const [mode,           setMode]           = useState('daily')
  const [filter,         setFilter]         = useState('all')
  const [copied,         setCopied]         = useState(null)
  const [delDate,        setDelDate]        = useState('')
  const [delStatus,      setDelStatus]      = useState(null)
  const [delConfirm,     setDelConfirm]     = useState(false)
  const [delLoading,     setDelLoading]     = useState(false)

  useEffect(()=>{ if(authed) loadFarms() },[authed])
  useEffect(()=>{ if(selFarm) loadDb() },[selFarm])

  async function loadFarms() {
    setFarmsLoading(true)
    const { data } = await supabase.from('farms').select('*').order('created_at',{ascending:true})
    const list = data||[]
    setFarms(list)
    if(list.length>0 && !selFarm) setSelFarm(list[0])
    setFarmsLoading(false)
  }

  async function loadDb() {
    if(!selFarm) return
    const { data:rows } = await supabase.from('shipments').select('*').eq('farm_slug',selFarm.slug).order('date',{ascending:false})
    setDbData(rows||[])
    setFilter('all'); setDelDate(''); setDelStatus(null); setDelConfirm(false); setStatus(null)
  }

  function getLabel(d){ return mode==='daily'?d.date:d.date?.slice(0,7) }
  const filtered = filter==='all'?dbData:dbData.filter(d=>getLabel(d)===filter)
  const labels   = [...new Set(dbData.map(getLabel))].sort().reverse()

  function handleLogin(e){
    e.preventDefault()
    if(pw===ADMIN_PASSWORD) setAuthed(true)
    else setPwErr(true)
  }

  async function handleAddFarm(e){
    e.preventDefault()
    if(!newName.trim()||!newOwner.trim()) return
    setAddLoading(true); setAddStatus(null)
    const slug    = slugify(newOwner.trim(), newName.trim())
    const initial = newOwner.trim().charAt(0)
    const { error } = await supabase.from('farms').insert({name:newName.trim(),owner:newOwner.trim(),slug,initial})
    if(error) setAddStatus({ok:false,msg:'❌ 추가 실패: '+error.message})
    else {
      setAddStatus({ok:true,msg:`✅ ${newName} 추가 완료! 거래처 링크: /farm/${slug}`})
      setNewName(''); setNewOwner(''); loadFarms()
    }
    setAddLoading(false)
  }

  async function handleDelFarm(farm){
    await supabase.from('farms').delete().eq('slug',farm.slug)
    setDelFarmConfirm(null)
    if(selFarm?.slug===farm.slug){ setSelFarm(null); setDbData([]) }
    loadFarms()
  }

  async function handleFile(file){
    if(!file||!selFarm) return
    setLoading(true); setStatus(null)
    try {
      const buf = await file.arrayBuffer()
      const { rows, sheetDate, sheetMeatco } = parseExcel(buf)
      const inserts = rows.map(r=>({...r, farm_slug:selFarm.slug, farm_name:selFarm.name, owner:selFarm.owner, meatco: r.meatco || sheetMeatco || ''}))
      const { error } = await supabase.from('shipments').insert(inserts)
      if(error) throw new Error(error.message)
      const f=rows.filter(d=>d.sex==='암').length, c=rows.filter(d=>d.sex==='거세').length
      setStatus({ok:true,msg:`✅ ${rows.length}두 저장 완료 (암 ${f}두 / 거세 ${c}두) · 출하일 ${sheetDate}`})
      loadDb()
    } catch(err){ setStatus({ok:false,msg:'❌ '+err.message}) }
    setLoading(false)
  }

  function copyLink(slug){
    navigator.clipboard.writeText(`${location.origin}/farm/${slug}`)
    setCopied(slug); setTimeout(()=>setCopied(null),1500)
  }

  const dateList = [...new Set(dbData.map(d=>d.date))].sort().reverse()
  const delCount = delDate?dbData.filter(d=>d.date===delDate).length:0

  async function handleDelete(){
    if(!delDate) return
    setDelLoading(true); setDelStatus(null)
    try {
      const { error } = await supabase.from('shipments').delete().eq('farm_slug',selFarm.slug).eq('date',delDate)
      if(error) throw new Error(error.message)
      setDelStatus({ok:true,msg:`✅ ${delDate} 데이터 ${delCount}두 삭제 완료`})
      setDelDate(''); setDelConfirm(false); loadDb()
    } catch(err){ setDelStatus({ok:false,msg:'❌ '+err.message}) }
    setDelLoading(false)
  }

  const inp = {width:'100%',padding:'8px 12px',border:'0.5px solid rgba(0,0,0,0.12)',borderRadius:8,fontSize:14,fontFamily:'inherit',outline:'none'}

  if(!authed) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#F5F6F4'}}>
      <div className="card" style={{width:320,textAlign:'center'}}>
        <div style={{fontSize:18,fontWeight:700,marginBottom:4}}>관리자 로그인</div>
        <div style={{fontSize:13,color:'#888',marginBottom:20}}>양돈 출하 성적 대시보드</div>
        <form onSubmit={handleLogin}>
          <input type="password" placeholder="비밀번호" value={pw} onChange={e=>{setPw(e.target.value);setPwErr(false)}} style={{...inp,marginBottom:8}}/>
          {pwErr&&<div style={{color:'#E24B4A',fontSize:12,marginBottom:8}}>비밀번호가 틀렸습니다</div>}
          <button type="submit" className="btn btn-green" style={{width:'100%',justifyContent:'center'}}>로그인</button>
        </form>
      </div>
    </div>
  )

  return (
  <>
  <div className="page">
    <div className="header">
      <div className="header-left">
        <div className="avatar green">관</div>
        <div><div className="farm-name">관리자 대시보드</div><div className="farm-sub">양돈 출하 성적 관리</div></div>
      </div>
    </div>

    {/* 상단 탭 메뉴 */}
    <div style={{display:'flex',gap:2,background:'white',border:'0.5px solid rgba(0,0,0,0.10)',borderRadius:10,padding:4,marginBottom:14}}>
      {[{key:'shipment',label:'출하성적'},{key:'feed',label:'사료현황'}].map(t=>(
        <button key={t.key} onClick={()=>setTab(t.key)}
          style={{flex:1,padding:'8px 4px',border:'none',borderRadius:7,cursor:'pointer',fontFamily:'inherit',
            fontSize:13,fontWeight:500,transition:'all 0.15s',
            background:tab===t.key?'#1D9E75':'transparent',
            color:tab===t.key?'white':'#888'}}>
          {t.label}
        </button>
      ))}
    </div>

    {tab==='feed' && <FeedPage farmSlug={selFarm?.slug||'admin'}/>}
    {tab==='shipment' && (<>

    {/* 거래처 목록 + 추가 */}
    <div className="card" style={{marginBottom:14}}>
      <div style={{fontSize:13,fontWeight:500,marginBottom:10,color:'#555'}}>거래처 목록</div>
      {farmsLoading ? (
        <div style={{fontSize:13,color:'#aaa'}}>불러오는 중...</div>
      ) : farms.length===0 ? (
        <div style={{fontSize:13,color:'#aaa',marginBottom:10}}>등록된 거래처가 없습니다. 아래에서 추가해주세요.</div>
      ) : (
        <table className="farm-table" style={{marginBottom:14}}>
          <thead><tr><th>농장명</th><th>대표자</th><th>거래처 링크</th><th>선택</th><th>삭제</th></tr></thead>
          <tbody>
            {farms.map(f=>(
              <tr key={f.slug} style={{background:selFarm?.slug===f.slug?'#E6F1FB':''}}>
                <td data-label="농장명"><b>{f.name}</b> {selFarm?.slug===f.slug&&<span className="badge badge-blue">선택됨</span>}</td>
                <td data-label="대표자">{f.owner}</td>
                <td data-label="링크">
                  <button className="copy-link" onClick={()=>copyLink(f.slug)}>
                    {copied===f.slug?'복사됨 ✓':`/farm/${f.slug}`}
                  </button>
                </td>
                <td data-label="선택">
                  <button className="btn btn-outline" style={{padding:'4px 12px',fontSize:12}} onClick={()=>setSelFarm(f)}>선택</button>
                </td>
                <td data-label="삭제">
                  {delFarmConfirm===f.slug?(
                    <div style={{display:'flex',gap:6}}>
                      <button className="btn" style={{padding:'4px 10px',fontSize:12,background:'#E24B4A',color:'#fff',border:'none'}} onClick={()=>handleDelFarm(f)}>확인</button>
                      <button className="btn btn-outline" style={{padding:'4px 10px',fontSize:12}} onClick={()=>setDelFarmConfirm(null)}>취소</button>
                    </div>
                  ):(
                    <button className="btn" style={{padding:'4px 10px',fontSize:12,background:'#FCEBEB',color:'#A32D2D',border:'0.5px solid #F09595'}} onClick={()=>setDelFarmConfirm(f.slug)}>삭제</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{borderTop:'0.5px solid rgba(0,0,0,0.08)',paddingTop:14}}>
        <div style={{fontSize:13,fontWeight:500,marginBottom:10,color:'#555'}}>거래처 추가</div>
        <form onSubmit={handleAddFarm} style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'flex-end'}}>
          <div style={{flex:1,minWidth:120}}>
            <div style={{fontSize:11,color:'#888',marginBottom:4}}>농장명</div>
            <input placeholder="예) 선경농장" value={newName} onChange={e=>setNewName(e.target.value)} style={inp} required/>
          </div>
          <div style={{flex:1,minWidth:120}}>
            <div style={{fontSize:11,color:'#888',marginBottom:4}}>대표자 이름</div>
            <input placeholder="예) 염철근" value={newOwner} onChange={e=>setNewOwner(e.target.value)} style={inp} required/>
          </div>
          <button type="submit" className="btn btn-green" disabled={addLoading} style={{whiteSpace:'nowrap'}}>
            {addLoading?'추가 중...':'+ 거래처 추가'}
          </button>
        </form>
        {addStatus&&<div className={`status ${addStatus.ok?'status-ok':'status-err'}`} style={{marginTop:8}}>{addStatus.msg}</div>}
      </div>
    </div>

    {selFarm&&(<>
      {/* 엑셀 업로드 */}
      <div className="card" style={{marginBottom:14}}>
        <div style={{fontSize:13,fontWeight:500,marginBottom:10,color:'#555'}}>{selFarm.name} · 엑셀 업로드</div>
        <label>
          <div className={`upload-zone${loading?' drag':''}`}>
            <div style={{fontSize:14,fontWeight:500,marginBottom:4}}>{loading?'업로드 중...':'엑셀 파일을 드래그하거나 클릭'}</div>
            <div style={{fontSize:12,color:'#888'}}>출하성적_양식_v2.xlsx</div>
            <input type="file" accept=".xlsx,.xls" style={{display:'none'}} onChange={e=>handleFile(e.target.files[0])} disabled={loading}/>
          </div>
        </label>
        {status&&<div className={`status ${status.ok?'status-ok':'status-err'}`}>{status.msg}</div>}
      </div>

      {/* 데이터 삭제 */}
      <div className="card" style={{marginBottom:14}}>
        <div style={{fontSize:13,fontWeight:500,marginBottom:10,color:'#555'}}>{selFarm.name} · 데이터 삭제</div>
        {dateList.length===0?(
          <div style={{fontSize:13,color:'#aaa'}}>저장된 데이터가 없습니다.</div>
        ):(
          <>
            <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:10}}>
              <select value={delDate} onChange={e=>{setDelDate(e.target.value);setDelConfirm(false);setDelStatus(null)}} style={{flex:1,minWidth:160}}>
                <option value="">출하일 선택</option>
                {dateList.map(d=>{const cnt=dbData.filter(r=>r.date===d).length;return <option key={d} value={d}>{d} ({cnt}두)</option>})}
              </select>
              {delDate&&!delConfirm&&(
                <button className="btn" onClick={()=>setDelConfirm(true)} style={{background:'#FCEBEB',color:'#A32D2D',border:'0.5px solid #F09595'}}>삭제</button>
              )}
            </div>
            {delConfirm&&delDate&&(
              <div style={{background:'#FCEBEB',border:'0.5px solid #F09595',borderRadius:8,padding:'12px 14px',marginBottom:8}}>
                <div style={{fontSize:13,fontWeight:500,color:'#A32D2D',marginBottom:8}}>정말 삭제할까요?</div>
                <div style={{fontSize:12,color:'#791F1F',marginBottom:12}}>{selFarm.name} · {delDate} · {delCount}두 데이터가 영구 삭제됩니다.</div>
                <div style={{display:'flex',gap:8}}>
                  <button className="btn" onClick={handleDelete} disabled={delLoading} style={{background:'#E24B4A',color:'#fff',border:'none'}}>{delLoading?'삭제 중...':'확인, 삭제'}</button>
                  <button className="btn btn-outline" onClick={()=>{setDelConfirm(false);setDelDate('')}}>취소</button>
                </div>
              </div>
            )}
            {delStatus&&<div className={`status ${delStatus.ok?'status-ok':'status-err'}`}>{delStatus.msg}</div>}
          </>
        )}
      </div>

      {/* 차트 */}
      {dbData.length>0&&(
        <div className="card">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10,marginBottom:12}}>
            <div>
              <div style={{fontWeight:600}}>{selFarm.name} 도체중 vs 등지방</div>
              <div style={{fontSize:12,color:'#888',marginTop:2}}>저장된 데이터 {dbData.length}두</div>
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
      )}
    </>)}
    </>)}
  </div>
  <Footer/>
  </>
  )
}
