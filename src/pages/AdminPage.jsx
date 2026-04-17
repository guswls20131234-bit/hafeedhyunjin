import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { parseExcel } from '../lib/parseExcel'
import ScatterChart from '../components/ScatterChart'
import Footer from '../components/Footer'

// ✅ 관리자 비밀번호 — 원하는 것으로 변경하세요
const ADMIN_PASSWORD = '1234'

const FARMS = [
  { name: '선경농장', owner: '염철근', slug: 'sunkyung' },
  // 거래처 추가 시 여기에 계속 넣으세요
  // { name: '행복농장', owner: '홍길동', slug: 'haengbok' },
]

function Stats({ data }) {
  if (!data.length) return null
  const avgCw   = (data.reduce((a,d)=>a+d.cw,0)/data.length).toFixed(1)
  const avgBf   = (data.reduce((a,d)=>a+d.bf,0)/data.length).toFixed(1)
  const plus    = data.filter(d=>d.cw>=83&&d.cw<93&&d.bf>=17&&d.bf<25).length
  const female  = data.filter(d=>d.sex==='암').length
  const castrate= data.filter(d=>d.sex==='거세').length
  const total   = female+castrate
  return (
    <>
      <div className="stat-grid">
        <div className="stat-box"><div className="stat-label">평균 도체중</div><div><span className="stat-val">{avgCw}</span><span className="stat-unit">kg</span></div></div>
        <div className="stat-box"><div className="stat-label">평균 등지방</div><div><span className="stat-val">{avgBf}</span><span className="stat-unit">mm</span></div></div>
        <div className="stat-box"><div className="stat-label">총 출하 두수</div><div><span className="stat-val">{data.length}</span><span className="stat-unit">두</span></div></div>
        <div className="stat-box"><div className="stat-label">1등급+ 비율</div><div><span className="stat-val">{((plus/data.length)*100).toFixed(1)}</span><span className="stat-unit">%</span></div></div>
      </div>
      <div className="sex-bar">
        <span>암컷</span><b>{female}두</b>
        <span>거세</span><b>{castrate}두</b>
        <span>암컷 비율</span><b style={{color:'#185FA5'}}>{total>0?((female/total)*100).toFixed(1)+'%':'—'}</b>
      </div>
    </>
  )
}

export default function AdminPage() {
  const [authed,    setAuthed]    = useState(false)
  const [pw,        setPw]        = useState('')
  const [pwErr,     setPwErr]     = useState(false)
  const [selFarm,   setSelFarm]   = useState(FARMS[0])
  const [data,      setData]      = useState([])
  const [status,    setStatus]    = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [dbData,    setDbData]    = useState([])
  const [mode,      setMode]      = useState('daily')
  const [filter,    setFilter]    = useState('all')
  const [copied,    setCopied]    = useState(null)
  const [delDate,   setDelDate]   = useState('')
  const [delStatus, setDelStatus] = useState(null)
  const [delConfirm,setDelConfirm]= useState(false)
  const [delLoading,setDelLoading]= useState(false)

  useEffect(() => { if (authed) loadDb() }, [authed, selFarm])

  async function loadDb() {
    const { data: rows } = await supabase
      .from('shipments')
      .select('*')
      .eq('farm_slug', selFarm.slug)
      .order('date', { ascending: false })
    setDbData(rows || [])
  }

  function getLabel(d) { return mode === 'daily' ? d.date : d.date?.slice(0,7) }
  const filtered = filter === 'all' ? dbData : dbData.filter(d => getLabel(d) === filter)
  const labels   = [...new Set(dbData.map(getLabel))].sort().reverse()

  function handleLogin(e) {
    e.preventDefault()
    if (pw === ADMIN_PASSWORD) { setAuthed(true) } else { setPwErr(true) }
  }

  async function handleFile(file) {
    if (!file) return
    setLoading(true); setStatus(null)
    try {
      const buf = await file.arrayBuffer()
      const { rows, sheetDate } = parseExcel(buf)
      setData(rows)

      const inserts = rows.map(r => ({ ...r, farm_slug: selFarm.slug, farm_name: selFarm.name, owner: selFarm.owner }))
      const { error } = await supabase.from('shipments').insert(inserts)
      if (error) throw new Error(error.message)

      const f = rows.filter(d=>d.sex==='암').length, c = rows.filter(d=>d.sex==='거세').length
      setStatus({ ok: true, msg: `✅ ${rows.length}두 저장 완료 (암 ${f}두 / 거세 ${c}두) · 출하일 ${sheetDate}` })
      loadDb()
    } catch (err) {
      setStatus({ ok: false, msg: '❌ ' + err.message })
    }
    setLoading(false)
  }

  function copyLink(slug) {
    navigator.clipboard.writeText(`${location.origin}/farm/${slug}`)
    setCopied(slug); setTimeout(() => setCopied(null), 1500)
  }

  // 날짜 단위 삭제
  const dateList = [...new Set(dbData.map(d => d.date))].sort().reverse()
  const delCount = delDate ? dbData.filter(d => d.date === delDate).length : 0

  async function handleDelete() {
    if (!delDate) return
    setDelLoading(true); setDelStatus(null)
    try {
      const { error } = await supabase
        .from('shipments')
        .delete()
        .eq('farm_slug', selFarm.slug)
        .eq('date', delDate)
      if (error) throw new Error(error.message)
      setDelStatus({ ok: true, msg: `✅ ${delDate} 데이터 ${delCount}두 삭제 완료` })
      setDelDate(''); setDelConfirm(false)
      loadDb()
    } catch (err) {
      setDelStatus({ ok: false, msg: '❌ ' + err.message })
    }
    setDelLoading(false)
  }

  if (!authed) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#F5F6F4'}}>
      <div className="card" style={{width:320,textAlign:'center'}}>
        <div style={{fontSize:18,fontWeight:700,marginBottom:4}}>관리자 로그인</div>
        <div style={{fontSize:13,color:'#888',marginBottom:20}}>양돈 출하 성적 대시보드</div>
        <form onSubmit={handleLogin}>
          <input type="password" placeholder="비밀번호" value={pw} onChange={e=>{setPw(e.target.value);setPwErr(false)}}
            style={{width:'100%',padding:'9px 12px',border:`0.5px solid ${pwErr?'#E24B4A':'rgba(0,0,0,0.12)'}`,borderRadius:8,fontSize:14,fontFamily:'inherit',marginBottom:8,outline:'none'}}/>
          {pwErr && <div style={{color:'#E24B4A',fontSize:12,marginBottom:8}}>비밀번호가 틀렸습니다</div>}
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

      {/* 거래처 선택 */}
      <div className="card" style={{marginBottom:14}}>
        <div style={{fontSize:13,fontWeight:500,marginBottom:10,color:'#555'}}>거래처 선택</div>
        <table className="farm-table">
          <thead><tr><th>농장명</th><th>대표자</th><th>고유 링크</th><th>저장 데이터</th></tr></thead>
          <tbody>
            {FARMS.map(f => {
              const count = f.slug === selFarm.slug ? dbData.length : '—'
              return (
                <tr key={f.slug} onClick={()=>setSelFarm(f)} style={{cursor:'pointer',background:f.slug===selFarm.slug?'#E6F1FB':''}}>
                  <td><b>{f.name}</b> {f.slug===selFarm.slug&&<span className="badge badge-blue">선택됨</span>}</td>
                  <td>{f.owner}</td>
                  <td>
                    <button className="copy-link" onClick={e=>{e.stopPropagation();copyLink(f.slug)}}>
                      {copied===f.slug ? '복사됨 ✓' : `/farm/${f.slug}`}
                    </button>
                  </td>
                  <td>{f.slug===selFarm.slug ? <b>{dbData.length}두</b> : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* 업로드 */}
      <div className="card" style={{marginBottom:14}}>
        <div style={{fontSize:13,fontWeight:500,marginBottom:10,color:'#555'}}>{selFarm.name} · 엑셀 업로드</div>
        <label>
          <div className={`upload-zone${loading?' drag':''}`}>
            <div style={{fontSize:14,fontWeight:500,marginBottom:4}}>
              {loading ? '업로드 중...' : '엑셀 파일을 드래그하거나 클릭'}
            </div>
            <div style={{fontSize:12,color:'#888'}}>선경농장_출하성적_양식_v2.xlsx</div>
            <input type="file" accept=".xlsx,.xls" style={{display:'none'}} onChange={e=>handleFile(e.target.files[0])} disabled={loading}/>
          </div>
        </label>
        {status && <div className={`status ${status.ok?'status-ok':'status-err'}`}>{status.msg}</div>}
      </div>

      {/* 날짜 단위 삭제 */}
      <div className="card" style={{marginBottom:14}}>
        <div style={{fontSize:13,fontWeight:500,marginBottom:10,color:'#555'}}>{selFarm.name} · 데이터 삭제</div>
        {dateList.length === 0 ? (
          <div style={{fontSize:13,color:'#aaa'}}>저장된 데이터가 없습니다.</div>
        ) : (
          <>
            <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:10}}>
              <select value={delDate} onChange={e=>{setDelDate(e.target.value);setDelConfirm(false);setDelStatus(null)}}
                style={{flex:1,minWidth:160}}>
                <option value="">출하일 선택</option>
                {dateList.map(d => {
                  const cnt = dbData.filter(r=>r.date===d).length
                  return <option key={d} value={d}>{d} ({cnt}두)</option>
                })}
              </select>
              {delDate && !delConfirm && (
                <button className="btn" onClick={()=>setDelConfirm(true)}
                  style={{background:'#FCEBEB',color:'#A32D2D',border:'0.5px solid #F09595'}}>
                  삭제
                </button>
              )}
            </div>

            {delConfirm && delDate && (
              <div style={{background:'#FCEBEB',border:'0.5px solid #F09595',borderRadius:8,padding:'12px 14px',marginBottom:8}}>
                <div style={{fontSize:13,fontWeight:500,color:'#A32D2D',marginBottom:8}}>
                  정말 삭제할까요?
                </div>
                <div style={{fontSize:12,color:'#791F1F',marginBottom:12}}>
                  {selFarm.name} · {delDate} · {delCount}두 데이터가 영구 삭제됩니다.
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button className="btn" onClick={handleDelete} disabled={delLoading}
                    style={{background:'#E24B4A',color:'#fff',border:'none'}}>
                    {delLoading ? '삭제 중...' : '확인, 삭제'}
                  </button>
                  <button className="btn btn-outline" onClick={()=>{setDelConfirm(false);setDelDate('')}}>
                    취소
                  </button>
                </div>
              </div>
            )}

            {delStatus && (
              <div className={`status ${delStatus.ok?'status-ok':'status-err'}`}>{delStatus.msg}</div>
            )}
          </>
        )}
      </div>

      {/* 차트 */}
      {dbData.length > 0 && (
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
          <Stats data={filtered}/>
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
    <Footer />
  </>
  )
}
