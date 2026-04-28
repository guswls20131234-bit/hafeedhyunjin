import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { parseExcel } from '../lib/parseExcel'
import ScatterChart from '../components/ScatterChart'
import Footer from '../components/Footer'
import FeedPage from './FeedPage'
import MeetingForm, { GYEONGNAM_CITIES } from '../components/MeetingForm'
import HistoryList from '../components/HistoryList'
import ReportView from '../components/ReportView'
import { formToDb, dbToForm } from '../lib/mapping'
import CostPage from './CostPage'
import ProductionPage from './ProductionPage'
import PorkPriceToast from '../components/PorkPriceToast'

const ADMIN_PASSWORD = '5302'

function isGradePlus(cw,bf){ return cw>=83&&cw<93&&bf>=17&&bf<25 }
function gradeLabel(cw,bf){
  if(isGradePlus(cw,bf)) return {text:'1등급+',color:'#A32D2D',bg:'#FCEBEB'}
  if((cw>=80&&cw<83&&bf>=15&&bf<=28)||(cw>=83&&cw<93&&bf>=15&&bf<17)||(cw>=83&&cw<93&&bf>=25&&bf<=28)||(cw>=93&&cw<98&&bf>=15&&bf<=28))
    return {text:'1등급',color:'#0C447C',bg:'#E6F1FB'}
  return {text:'등외',color:'#5F5E5A',bg:'#F1EFE8'}
}

function DetailTable({ data }) {
  const [open, setOpen] = useState(false)
  const [aiComment, setAiComment] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)

  if (!data.length) return null
  const sorted = [...data].sort((a,b)=>String(a.pig_id||'').localeCompare(String(b.pig_id||'')))

  // 도체중 개선 계산 (코드로 정확하게)
  const TARGET_CW = 80
  const avgPrice = data.filter(d=>d.price>0).length > 0
    ? Math.round(data.filter(d=>d.price>0).reduce((a,d)=>a+d.price,0)/data.filter(d=>d.price>0).length)
    : 0
  const lightAnimals = data.filter(d=>d.cw < TARGET_CW)
  const totalGain    = lightAnimals.reduce((a,d)=>a+(TARGET_CW-d.cw)*avgPrice, 0)
  const avgCw        = (data.reduce((a,d)=>a+d.cw,0)/data.length).toFixed(1)
  const avgBf        = (data.reduce((a,d)=>a+d.bf,0)/data.length).toFixed(1)
  const grades       = {"1+":0,"1":0,"2":0,"E":0}
  data.forEach(d=>{ const g=gradeLabel(d.cw,d.bf).text; if(grades[g]!==undefined) grades[g]++ })

  async function getComment() {
    setAiLoading(true); setAiComment(null)
    try {
      const res = await fetch("/api/claude", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          model:"gpt-4o-mini",
          max_tokens:200,
          messages:[{role:"user", content:
            `양돈 출하 데이터를 보고 한국어로 2문장 이내 핵심 조언만 해주세요.
- 출하두수: ${data.length}두
- 평균 도체중: ${avgCw}kg (목표 80kg)
- 80kg 미만 개체: ${lightAnimals.length}두
- 예상 추가 수익: ${totalGain.toLocaleString()}원
- 평균 등지방: ${avgBf}mm
- 등급: 1+${grades["1+"]}두 / 1등${grades["1"]}두 / 2등${grades["2"]}두 / E${grades["E"]}두
짧고 실용적으로만 답하세요.`
          }]
        })
      })
      const d = await res.json()
      const text = d.content?.[0]?.text || d.choices?.[0]?.message?.content || ''
      setAiComment(text.trim())
    } catch(e) {
      setAiComment("분석 중 오류가 발생했어요.")
    }
    setAiLoading(false)
  }

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
                    <td style={{padding:'8px 12px',fontWeight:500}}>{d.pig_id||'—'}</td>
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

      {/* 도체중 개선 분석 카드 */}
      {avgPrice > 0 && (
        <div style={{marginTop:10,background:'white',border:'0.5px solid rgba(0,0,0,0.08)',borderRadius:10,padding:14}}>
          <div style={{fontSize:12,fontWeight:600,color:'#1a1a18',marginBottom:10}}>⚖️ 도체중 개선 예상 수익</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:12}}>
            <div style={{background:'#F5F6F4',borderRadius:8,padding:'8px 10px'}}>
              <div style={{fontSize:10,color:'#888',marginBottom:2}}>80kg 미만</div>
              <div style={{fontSize:16,fontWeight:700,color:'#E67E22'}}>{lightAnimals.length}<span style={{fontSize:11,marginLeft:2}}>두</span></div>
            </div>
            <div style={{background:'#F5F6F4',borderRadius:8,padding:'8px 10px'}}>
              <div style={{fontSize:10,color:'#888',marginBottom:2}}>평균 도체중</div>
              <div style={{fontSize:16,fontWeight:700,color:'#1a1a18'}}>{avgCw}<span style={{fontSize:11,marginLeft:2}}>kg</span></div>
            </div>
            <div style={{background:'#E1F5EE',borderRadius:8,padding:'8px 10px'}}>
              <div style={{fontSize:10,color:'#085041',marginBottom:2}}>예상 추가 수익</div>
              <div style={{fontSize:14,fontWeight:700,color:'#085041'}}>+{totalGain.toLocaleString()}<span style={{fontSize:10,marginLeft:1}}>원</span></div>
            </div>
          </div>
          <div style={{fontSize:10,color:'#aaa',marginBottom:10}}>
            * 80kg 미만 {lightAnimals.length}두 × 부족 도체중 × 평균단가 {avgPrice.toLocaleString()}원/kg 기준
          </div>

          {/* AI 코멘트 */}
          {!aiComment && (
            <button onClick={getComment} disabled={aiLoading}
              style={{width:'100%',padding:'9px',background:aiLoading?'#aaa':'#0F2A1E',color:'white',border:'none',
                borderRadius:8,fontSize:12,fontWeight:600,cursor:aiLoading?'not-allowed':'pointer',fontFamily:'inherit',
                display:'flex',alignItems:'center',justifyContent:'center',gap:5}}>
              {aiLoading ? '🤖 분석 중...' : '🤖 AI 코멘트 보기'}
            </button>
          )}
          {aiComment && (
            <div style={{background:'#0F2A1E',borderRadius:8,padding:'10px 14px',display:'flex',gap:8,alignItems:'flex-start'}}>
              <span style={{fontSize:14,flexShrink:0}}>🤖</span>
              <div style={{fontSize:12,color:'rgba(255,255,255,0.85)',lineHeight:1.7}}>{aiComment}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

  async function runAI() {
    setAiLoading(true); setAiResult(null); setAiError(null)
    const sd = statsData || {}
    const total = data.length
    const avgCw = (data.reduce((a,d)=>a+d.cw,0)/total).toFixed(1)
    const avgBf = (data.reduce((a,d)=>a+d.bf,0)/total).toFixed(1)
    const lightCount = data.filter(d=>d.cw<70).length
    const thinBackfat2 = data.filter(d=>d.bf<=15 && (d.grade==='2'||(!d.grade&&d.cw<83))).length
    const grades = { "1+":0, "1":0, "2":0, "E":0 }
    data.forEach(d=>{ const g = gradeLabel(d.cw,d.bf).text; if(grades[g]!==undefined) grades[g]++ })
    const avgPrice = data.filter(d=>d.price>0).length > 0
      ? Math.round(data.filter(d=>d.price>0).reduce((a,d)=>a+d.price,0)/data.filter(d=>d.price>0).length)
      : 0

    const prompt = `당신은 양돈 출하 성적 전문 분석가입니다. 아래 출하 데이터를 분석하고 금액적으로 개선 가능한 포인트를 찾아주세요.

[출하 데이터]
- 총 출하두수: ${total}두
- 평균 도체중: ${avgCw}kg
- 평균 등지방: ${avgBf}mm
- 평균 단가: ${avgPrice.toLocaleString()}원/kg
- 1+등급: ${grades["1+"]}두 / 1등급: ${grades["1"]}두 / 2등급: ${grades["2"]}두 / E등급: ${grades["E"]}두
- 70kg 미만 경량 개체: ${lightCount}두
- 등지방 15mm 이하 2등급 의심 개체: ${thinBackfat2}두

다음을 분석해주세요:
1. 경량 출하(70kg 미만) 손실 추정 (80kg 기준, 현재 평균단가 적용)
2. 등급 개선 가능 개체와 예상 추가 수익
3. 가장 시급한 개선 포인트

반드시 아래 JSON만 응답하세요:
{
  "lightweight": {"count":숫자,"estimatedLoss":숫자,"advice":"조언"},
  "gradeImprovement": {"targetCount":숫자,"estimatedGain":숫자,"advice":"조언"},
  "topPriority": {"title":"제목","detail":"상세내용","estimatedEffect":숫자},
  "overallComment": "한줄평가"
}`

    try {
      const res = await fetch("/api/claude", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514",
          max_tokens:1000,
          messages:[{role:"user",content:prompt}]
        })
      })
      const d = await res.json()
      const text = d.content.map(c=>c.text||"").join("")
      const parsed = JSON.parse(text.replace(/```json|```/g,"").trim())
      setAiResult(parsed)
    } catch(e) {
      setAiError("분석 중 오류가 발생했어요.")
    }
    setAiLoading(false)
  }

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
                    <td style={{padding:'8px 12px',fontWeight:500}}>{d.pig_id||'—'}</td>
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

      {/* AI 분석 버튼 */}
      <button onClick={runAI} disabled={aiLoading}
        style={{width:'100%',marginTop:10,padding:'11px',background:aiLoading?'#aaa':'#0F2A1E',color:'white',border:'none',
          borderRadius:9,fontSize:13,fontWeight:700,cursor:aiLoading?'not-allowed':'pointer',fontFamily:'inherit',
          display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
        {aiLoading ? <>⟳ AI 분석 중...</> : <>🤖 AI 출하 성적 분석</>}
      </button>

      {aiError && <div style={{marginTop:8,padding:12,background:'#FDECEA',borderRadius:8,fontSize:12,color:'#C0392B'}}>{aiError}</div>}

      {aiResult && (
        <div style={{marginTop:10,display:'flex',flexDirection:'column',gap:8}}>
          {/* 총평 */}
          <div style={{background:'#0F2A1E',borderRadius:10,padding:14,color:'white'}}>
            <div style={{fontSize:10,color:'rgba(255,255,255,0.5)',marginBottom:4}}>🤖 AI 총평</div>
            <div style={{fontSize:12,lineHeight:1.6,color:'rgba(255,255,255,0.9)'}}>{aiResult.overallComment}</div>
          </div>

          {/* 최우선 개선 */}
          <div style={{background:'#FEF5E7',border:'1.5px solid #F39C12',borderRadius:10,padding:14}}>
            <div style={{fontSize:11,fontWeight:700,color:'#935A07',marginBottom:6}}>⚡ 최우선 개선 포인트</div>
            <div style={{fontSize:13,fontWeight:700,color:'#1a1a18',marginBottom:4}}>{aiResult.topPriority?.title}</div>
            <div style={{fontSize:12,color:'#555',lineHeight:1.6,marginBottom:8}}>{aiResult.topPriority?.detail}</div>
            {aiResult.topPriority?.estimatedEffect > 0 && (
              <div style={{background:'white',borderRadius:7,padding:'7px 12px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{fontSize:11,color:'#888'}}>예상 추가 수익</span>
                <span style={{fontSize:15,fontWeight:800,color:'#1D9E75'}}>+{aiResult.topPriority.estimatedEffect.toLocaleString()}원</span>
              </div>
            )}
          </div>

          {/* 경량 / 등급 카드 */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            <div style={{background:'white',border:'0.5px solid rgba(0,0,0,0.08)',borderRadius:10,padding:12}}>
              <div style={{fontSize:11,fontWeight:600,marginBottom:8}}>⚖️ 경량 출하 손실</div>
              <div style={{fontSize:18,fontWeight:700,color:'#C0392B',marginBottom:4}}>
                -{(aiResult.lightweight?.estimatedLoss||0).toLocaleString()}<span style={{fontSize:10}}>원</span>
              </div>
              <div style={{fontSize:11,color:'#555',lineHeight:1.5}}>{aiResult.lightweight?.advice}</div>
            </div>
            <div style={{background:'white',border:'0.5px solid rgba(0,0,0,0.08)',borderRadius:10,padding:12}}>
              <div style={{fontSize:11,fontWeight:600,marginBottom:8}}>📈 등급 개선 가능</div>
              <div style={{fontSize:18,fontWeight:700,color:'#1D9E75',marginBottom:4}}>
                +{(aiResult.gradeImprovement?.estimatedGain||0).toLocaleString()}<span style={{fontSize:10}}>원</span>
              </div>
              <div style={{fontSize:11,color:'#555',lineHeight:1.5}}>{aiResult.gradeImprovement?.advice}</div>
            </div>
          </div>
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
  const dateLabel = filter==='all' ? '전체 기간'
    : mode==='monthly' ? filter.replace('-','년 ')+'월'
    : filter.includes('_') ? filter.split('_')[0] + ' ' + filter.split('_')[1]
    : filter
  const meatcos   = [...new Set(data.map(d=>d.meatco).filter(Boolean))]
  const priceKg   = data.find(d=>d.price_kg>0)?.price_kg || 0
  const totalPrice  = data.reduce((a,d)=>a+(Number(d.price)||0),0)
  // jojogeum: date+금액 조합으로 중복 제거 후 합산
  const jojoKeys = new Set()
  let jojogeum = 0
  for (const d of data) {
    if (d.jojogeum > 0) {
      const key = `${d.date}_${d.jojogeum}`
      if (!jojoKeys.has(key)) { jojoKeys.add(key); jojogeum += Number(d.jojogeum) }
    }
  }
  // total_paid: date+금액 조합으로 중복 제거 후 합산
  const paidKeys = new Set()
  let totalPaid = 0
  for (const d of data) {
    if (d.total_paid > 0) {
      const key = `${d.date}_${d.total_paid}`
      if (!paidKeys.has(key)) { paidKeys.add(key); totalPaid += Number(d.total_paid) }
    }
  }
  const totalDeduct = ['deduct_samgyup','deduct_moksim','deduct_fat','deduct_weight','deduct_grade','deduct_huji']
    .reduce((a,k) => a + (Number(data.find(d=>Number(d[k])>0)?.[k]) || 0), 0)
  const gradeBonus  = data.find(d=>d.grade_bonus>0)?.grade_bonus || 0
  return (
    <>
      <div className="stat-grid">
        <div className="stat-box"><div className="stat-label">평균 생체중</div><div><span className="stat-val">{avgLw??'—'}</span><span className="stat-unit">{avgLw?' kg':''}</span></div></div>
        <div className="stat-box"><div className="stat-label">평균 도체중</div><div><span className="stat-val">{avgCw}</span><span className="stat-unit">kg</span></div></div>
        <div className="stat-box"><div className="stat-label">평균 등지방</div><div><span className="stat-val">{avgBf}</span><span className="stat-unit">mm</span></div></div>
        <div className="stat-box"><div className="stat-label">지육율</div><div><span className="stat-val">{dressingPct??'—'}</span><span className="stat-unit">{dressingPct?' %':''}</span></div></div>
        <div className="stat-box"><div className="stat-label">총 출하 두수</div><div><span className="stat-val">{data.length}</span><span className="stat-unit">두</span></div></div>
        <div className="stat-box"><div className="stat-label">1등급+ 비율</div><div><span className="stat-val">{((plus/data.length)*100).toFixed(1)}</span><span className="stat-unit">%</span></div></div>
        {totalPrice > 0 && (
          <div className="stat-box" style={{gridColumn:'1/-1',background:'#E1F5EE',border:'0.5px solid rgba(29,158,117,0.2)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:8}}>
              <div>
                <div className="stat-label" style={{color:'#085041'}}>{totalPaid>0 ? '실수령액 (전금액)' : '생돈대 합계'}</div>
                <div>
                  <span className="stat-val" style={{color:'#085041',fontSize:20}}>
                    {(totalPaid>0 ? totalPaid : totalPrice).toLocaleString()}
                  </span>
                  <span className="stat-unit" style={{color:'#085041'}}>원</span>
                </div>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:3,fontSize:11,color:'#666',alignItems:'flex-end'}}>
                {totalPaid>0 && <span style={{color:'#888'}}>지육대금 {totalPrice.toLocaleString()}원</span>}
                {gradeBonus > 0 && <span style={{color:'#1a7a1a'}}>등급장려금 +{gradeBonus.toLocaleString()}원</span>}
                {jojogeum > 0   && <span style={{color:'#A32D2D'}}>자조금 -{jojogeum.toLocaleString()}원</span>}
                {totalDeduct > 0 && <span style={{color:'#A32D2D'}}>감가 -{totalDeduct.toLocaleString()}원</span>}
              </div>
            </div>
          </div>
        )}
      </div>
      <div style={{background:'#F5F6F4',borderRadius:7,padding:'8px 12px',marginBottom:10}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:4,marginBottom:5}}>
          <div style={{fontSize:12,fontWeight:700,color:'#1a1a18'}}>{dateLabel}</div>
          <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
            {priceKg > 0 && (
              <span style={{fontSize:11,color:'#888'}}>시세 <b style={{color:'#1a1a18'}}>{Number(priceKg).toLocaleString()}원/kg</b></span>
            )}
            {meatcos.length > 0 && (
              <div style={{display:'flex',alignItems:'center',gap:4}}>
                <span style={{fontSize:11,color:'#888'}}>육가공</span>
                {meatcos.map((m,i)=>(
                  <span key={i} style={{fontSize:11,fontWeight:500,color:'#085041',background:'#E1F5EE',padding:'1px 8px',borderRadius:99}}>{m}</span>
                ))}
              </div>
            )}
          </div>
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

  // 영업관리 state
  const [salesView,      setSalesView]      = useState('history')
  const [salesCityFilter,setSalesCityFilter]= useState('')
  const [salesStatusFilter,setSalesStatusFilter]= useState('') // 기존/신규
  const [salesTypeFilter,setSalesTypeFilter]= useState('')     // 양돈장/대리점 // 'form'|'history'|'report'
  const [salesForm,      setSalesForm]      = useState({})
  const [salesEditId,    setSalesEditId]    = useState(null)
  const [salesHistory,   setSalesHistory]   = useState([])
  const [salesLoading,   setSalesLoading]   = useState(false)
  const [salesSaving,    setSalesSaving]    = useState(false)
  const [salesStatus,    setSalesStatus]    = useState('')
  const [salesReport,    setSalesReport]    = useState(null)
  const [salesPrevView,  setSalesPrevView]  = useState('history')
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
  const [shipments,      setShipments]      = useState([])
  const [farmFeedRecs,   setFarmFeedRecs]   = useState([])

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
    const loadedRows = rows||[]
    setDbData(loadedRows)
    setShipments(loadedRows)
    const { data:feeds } = await supabase.from('feed_records').select('*').eq('farm_slug',selFarm.slug)
    setFarmFeedRecs(feeds||[])
    const latestDate = loadedRows.length > 0 ? loadedRows[0].date : 'all'
    setFilter(latestDate)
    setDelDate(''); setDelStatus(null); setDelConfirm(false); setStatus(null)
  }

  function getLabel(d){ return mode==='daily'?d.date:d.date?.slice(0,7) }

  // 같은 날 여러 출하 A/B 구분
  const dayGroups = {}
  for (const d of dbData) {
    const date = d.date
    if (!dayGroups[date]) dayGroups[date] = []
    const paid = Number(d.total_paid) || 0
    let found = false
    for (const gk of dayGroups[date]) {
      if (gk.paid === paid) { found = true; break }
    }
    if (!found) {
      const suffix = dayGroups[date].length === 0 ? '' : dayGroups[date].length === 1 ? 'B' : String.fromCharCode(65 + dayGroups[date].length)
      dayGroups[date].push({ paid, suffix })
      if (dayGroups[date].length === 2) dayGroups[date][0].suffix = 'A'
    }
  }
  const dataWithGroup = dbData.map(d => {
    const date = d.date
    const paid = Number(d.total_paid) || 0
    const groups = dayGroups[date] || []
    const group = groups.find(g => g.paid === paid) || groups[0]
    const suffix = group?.suffix || ''
    return { ...d, _groupKey: mode==='daily' ? date + (suffix ? `_${suffix}` : '') : d.date?.slice(0,7), _suffix: suffix }
  })

  const filtered = filter==='all' ? dataWithGroup : dataWithGroup.filter(d => d._groupKey === filter)
  const allLabels = [...new Set(dataWithGroup.map(d => mode==='daily' ? d._groupKey : d.date?.slice(0,7)))].sort().reverse()
  const threeMonthsAgo = new Date(); threeMonthsAgo.setMonth(threeMonthsAgo.getMonth()-3)
  const labels = mode==='daily'
    ? allLabels.filter(l => new Date(l.split('_')[0]) >= threeMonthsAgo)
    : allLabels

  async function loadSalesHistory() {
    setSalesLoading(true)
    const { data } = await supabase.from('meetings').select('*').order('created_at', { ascending: false })
    setSalesHistory(data || [])
    setSalesLoading(false)
  }

  async function handleSalesSave() {
    setSalesSaving(true)
    const payload = formToDb(salesForm)
    let error
    if (salesEditId) {
      ;({ error } = await supabase.from('meetings').update(payload).eq('id', salesEditId))
    } else {
      const { data, error: ie } = await supabase.from('meetings').insert(payload).select().single()
      error = ie
      if (!error && data) setSalesEditId(data.id)
    }
    setSalesSaving(false)
    if (error) setSalesStatus('❌ 저장 실패: ' + error.message)
    else { setSalesStatus('✅ 저장 완료!'); await loadSalesHistory() }
    setTimeout(() => setSalesStatus(''), 3000)
  }

  async function handleSalesDelete(id) {
    if (!window.confirm('이 미팅 기록을 삭제할까요?')) return
    await supabase.from('meetings').delete().eq('id', id)
    if (salesEditId === id) { setSalesForm({}); setSalesEditId(null) }
    await loadSalesHistory()
  }

  // 거래처로 전환
  async function handleConvertToFarm(row) {
    if (!window.confirm(`${row.farm_name}을 거래처로 등록할까요?`)) return
    const slug = (row.owner_name + row.farm_name).toLowerCase().replace(/\s+/g,'').slice(0,16) + '_' + Date.now().toString().slice(-4)
    const initial = (row.owner_name || row.farm_name || '?').charAt(0)
    const { error } = await supabase.from('farms').insert({
      name: row.farm_name, owner: row.owner_name || '', slug, initial
    })
    if (error) alert('등록 실패: ' + error.message)
    else { alert(`✅ ${row.farm_name} 거래처 등록 완료!\n링크: /farm/${slug}`); loadFarms() }
  }

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
      const { rows, sheetDate, sheetMeatco, sheetPriceKg, settlement } = parseExcel(buf)
      const s = settlement || {}
      const inserts = rows.map((r,i)=>({
        ...r,
        farm_slug: selFarm.slug, farm_name: selFarm.name, owner: selFarm.owner,
        meatco: r.meatco || sheetMeatco || '',
        price_kg: sheetPriceKg || 0,
        // 정산 항목은 모든 행에 저장 (나중에 연동 편하게)
        total_price:    s.total_price    || 0,
        jojogeum:       s.jojogeum       || 0,
        total_paid:     s.total_paid     || 0,
        grade_bonus:    s.grade_bonus    || 0,
        deduct_samgyup: s.deduct_samgyup || 0,
        deduct_moksim:  s.deduct_moksim  || 0,
        deduct_fat:     s.deduct_fat     || 0,
        deduct_weight:  s.deduct_weight  || 0,
        deduct_grade:   s.deduct_grade   || 0,
        deduct_huji:    s.deduct_huji    || 0,
      }))
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
  <PorkPriceToast />
  <div className="page">
    <div className="header">
      <div className="header-left">
        <div className="avatar green">관</div>
        <div><div className="farm-name">관리자 대시보드</div><div className="farm-sub">양돈 출하 성적 관리</div></div>
      </div>
    </div>

    {/* 상단 탭 메뉴 */}
    <div style={{display:'flex',gap:2,background:'white',border:'0.5px solid rgba(0,0,0,0.10)',borderRadius:10,padding:4,marginBottom:14}}>
      {[{key:'shipment',label:'출하성적'},{key:'feed',label:'사료현황'},{key:'cost',label:'비용현황'},{key:'production',label:'생산관리'},{key:'sales',label:'영업관리'}].map(t=>(
        <button key={t.key} onClick={()=>{ setTab(t.key); if(t.key==='sales') loadSalesHistory() }}
          style={{flex:1,padding:'8px 4px',border:'none',borderRadius:7,cursor:'pointer',fontFamily:'inherit',
            fontSize:13,fontWeight:500,transition:'all 0.15s',
            background:tab===t.key?'#1D9E75':'transparent',
            color:tab===t.key?'white':'#888'}}>
          {t.label}
        </button>
      ))}
    </div>

    {tab==='feed' && <FeedPage farmSlug={selFarm?.slug||'admin'} isAdmin={true}/>}
    {tab==='cost' && <CostPage farmSlug={selFarm?.slug||'admin'} shipments={shipments} feedRecords={farmFeedRecs}/>}
    {tab==='production' && <ProductionPage farmSlug={selFarm?.slug||'admin'}/>}
    {tab==='sales' && (
      <div style={{paddingBottom:'2rem'}}>
        {salesView==='report' && salesReport ? (
          <ReportView data={salesReport.data} onBack={()=>setSalesView(salesPrevView)}/>
        ) : salesView==='form' ? (
          <>
            <button onClick={()=>setSalesView('history')}
              style={{display:'flex',alignItems:'center',gap:6,background:'white',border:'0.5px solid rgba(0,0,0,0.12)',borderRadius:8,padding:'7px 14px',fontSize:13,color:'#555',cursor:'pointer',fontFamily:'inherit',marginBottom:10}}>
              ← 목록으로
            </button>
            <MeetingForm
              formData={salesForm}
              editingId={salesEditId}
              saving={salesSaving}
              saveStatus={salesStatus}
              onChange={(id,val)=>setSalesForm(prev=>({...prev,[id]:val}))}
              onSave={handleSalesSave}
              onNew={()=>{ setSalesForm({}); setSalesEditId(null) }}
              onReport={()=>{ setSalesReport({data:salesForm}); setSalesPrevView('form'); setSalesView('report') }}
            />
          </>
        ) : (
          <>
            {/* 히스토리 헤더 */}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
              <div style={{fontSize:14,fontWeight:700,color:'#1a1a18'}}>
                미팅 히스토리 <span style={{fontWeight:400,fontSize:12,color:'#888'}}>({salesHistory.length}건)</span>
              </div>
              <button onClick={()=>{ setSalesForm({}); setSalesEditId(null); setSalesView('form') }}
                style={{background:'#1D9E75',color:'white',border:'none',borderRadius:8,padding:'8px 16px',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                + 새 미팅
              </button>
            </div>

            {/* 필터 */}
            {salesHistory.length > 0 && (
              <div style={{background:'white',borderRadius:10,padding:'12px 14px',marginBottom:12,border:'0.5px solid rgba(0,0,0,0.08)',display:'flex',flexDirection:'column',gap:8}}>
                <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
                  <span style={{fontSize:11,color:'#888',width:32,flexShrink:0}}>상태</span>
                  {['전체','기존','신규'].map(t=>(
                    <button key={t} onClick={()=>setSalesStatusFilter(t==='전체'?'':t)}
                      style={{padding:'4px 12px',borderRadius:99,fontSize:11,fontWeight:500,cursor:'pointer',fontFamily:'inherit',border:'none',
                        background:(salesStatusFilter===t||(t==='전체'&&!salesStatusFilter))
                          ? (t==='기존'?'#1D9E75':t==='신규'?'#378ADD':'#1a4a2e')
                          : '#F5F6F4',
                        color:(salesStatusFilter===t||(t==='전체'&&!salesStatusFilter))?'white':'#555'}}>
                      {t}
                    </button>
                  ))}
                </div>
                <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
                  <span style={{fontSize:11,color:'#888',width:32,flexShrink:0}}>업종</span>
                  {['전체','양돈장','대리점'].map(t=>(
                    <button key={t} onClick={()=>setSalesTypeFilter(t==='전체'?'':t)}
                      style={{padding:'4px 12px',borderRadius:99,fontSize:11,fontWeight:500,cursor:'pointer',fontFamily:'inherit',border:'none',
                        background:(salesTypeFilter===t||(t==='전체'&&!salesTypeFilter))?'#1a4a2e':'#F5F6F4',
                        color:(salesTypeFilter===t||(t==='전체'&&!salesTypeFilter))?'white':'#555'}}>
                      {t}
                    </button>
                  ))}
                </div>
                <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
                  <span style={{fontSize:11,color:'#888',width:32,flexShrink:0}}>지역</span>
                  <button onClick={()=>setSalesCityFilter('')}
                    style={{padding:'4px 12px',borderRadius:99,fontSize:11,fontWeight:500,cursor:'pointer',fontFamily:'inherit',border:'none',
                      background:!salesCityFilter?'#1a4a2e':'#F5F6F4',color:!salesCityFilter?'white':'#555'}}>전체</button>
                  {GYEONGNAM_CITIES.filter(c=>salesHistory.some(r=>r.location===c)).map(c=>(
                    <button key={c} onClick={()=>setSalesCityFilter(c===salesCityFilter?'':c)}
                      style={{padding:'4px 12px',borderRadius:99,fontSize:11,fontWeight:500,cursor:'pointer',fontFamily:'inherit',border:'none',
                        background:salesCityFilter===c?'#1a4a2e':'#F5F6F4',color:salesCityFilter===c?'white':'#555'}}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {salesLoading ? (
              <div style={{textAlign:'center',padding:'40px',color:'#aaa',fontSize:13}}>불러오는 중...</div>
            ) : salesHistory.length === 0 ? (
              <div style={{background:'white',borderRadius:12,padding:'40px',textAlign:'center',border:'0.5px solid rgba(0,0,0,0.08)'}}>
                <div style={{fontSize:32,marginBottom:10}}>📭</div>
                <div style={{fontSize:13,color:'#aaa',marginBottom:16}}>저장된 미팅 기록이 없습니다.</div>
                <button onClick={()=>{ setSalesForm({}); setSalesEditId(null); setSalesView('form') }}
                  style={{background:'#1D9E75',color:'white',border:'none',borderRadius:8,padding:'10px 24px',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                  첫 미팅 작성하기
                </button>
              </div>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {salesHistory
                  .filter(r => !salesCityFilter || r.location === salesCityFilter)
                  .filter(r => !salesStatusFilter || (r.customer_type||'').includes(salesStatusFilter))
                  .filter(r => !salesTypeFilter   || (r.customer_type||'').includes(salesTypeFilter))
                  .map(row=>{
                  const pos = !row.possibility?{label:'-',color:'#999',bg:'#f5f5f5'}:
                    row.possibility.includes('90%')?{label:'HIGH',color:'#1a7a1a',bg:'#e8f5e8'}:
                    row.possibility.includes('60')?{label:'MED-HIGH',color:'#5a6a00',bg:'#f5f5e0'}:
                    row.possibility.includes('30~60')?{label:'MEDIUM',color:'#a06000',bg:'#fff3e0'}:
                    {label:'LOW',color:'#a01a1a',bg:'#fde8e8'}

                  // b0: "기존·양돈장" 형식 파싱
                  const b0Parts = (row.customer_type||'').split('·')
                  const statusTag = b0Parts[0] // 기존 or 신규
                  const typeTag   = b0Parts[1] // 양돈장 or 대리점

                  return (
                    <div key={row.id} style={{background:'white',borderRadius:12,border:'0.5px solid rgba(0,0,0,0.08)',padding:'14px 16px'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
                        <div>
                          <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:2,flexWrap:'wrap'}}>
                            <span style={{fontWeight:700,fontSize:14,color:'#1a1a18'}}>{row.farm_name||'(미입력)'}</span>
                            {statusTag && <span style={{fontSize:10,padding:'1px 7px',borderRadius:99,fontWeight:600,
                              background:statusTag==='기존'?'#E1F5EE':'#E6F1FB',
                              color:statusTag==='기존'?'#085041':'#0C447C'}}>{statusTag}</span>}
                            {typeTag && <span style={{fontSize:10,padding:'1px 7px',borderRadius:99,fontWeight:600,
                              background:typeTag==='대리점'?'#F1EFE8':'#F5F6F4',
                              color:typeTag==='대리점'?'#4a2a6a':'#1a4a2e'}}>{typeTag}</span>}
                          </div>
                          <div style={{fontSize:11,color:'#888'}}>{[row.location,row.meeting_date].filter(Boolean).join(' · ')}</div>
                        </div>
                        <span style={{fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:6,background:pos.bg,color:pos.color,border:`1.5px solid ${pos.color}`,whiteSpace:'nowrap'}}>{pos.label}</span>
                      </div>
                      <div style={{display:'flex',gap:10,marginBottom:8,flexWrap:'wrap'}}>
                        {row.sow_count > 0 && <span style={{fontSize:11,color:'#555'}}>모돈 <b>{Number(row.sow_count).toLocaleString()}두</b></span>}
                        {row.total_head > 0 && <span style={{fontSize:11,color:'#555'}}>전체 <b>{Number(row.total_head).toLocaleString()}두</b></span>}
                        {row.trade_status && <span style={{fontSize:10,padding:'1px 8px',borderRadius:99,fontWeight:600,
                          background:row.trade_status==='거래 중'?'#E1F5EE':row.trade_status==='과거 거래'?'#FAEEDA':'#F5F6F4',
                          color:row.trade_status==='거래 중'?'#085041':row.trade_status==='과거 거래'?'#633806':'#888'}}>
                          {row.trade_status}
                        </span>}
                      </div>
                      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                        <button onClick={()=>{ setSalesReport({data:dbToForm(row),raw:row}); setSalesPrevView('history'); setSalesView('report') }}
                          style={{flex:1,minWidth:70,background:'#1D9E75',color:'white',border:'none',borderRadius:7,padding:'7px 0',cursor:'pointer',fontSize:12,fontWeight:700,fontFamily:'inherit'}}>📋 보고서</button>
                        <button onClick={()=>{ setSalesForm(dbToForm(row)); setSalesEditId(row.id); setSalesView('form') }}
                          style={{flex:1,minWidth:70,background:'#E6F1FB',color:'#0C447C',border:'0.5px solid #B5D4F4',borderRadius:7,padding:'7px 0',cursor:'pointer',fontSize:12,fontWeight:600,fontFamily:'inherit'}}>✏️ 수정</button>
                        <button onClick={()=>handleConvertToFarm(row)}
                          style={{flex:1,minWidth:70,background:'#E1F5EE',color:'#085041',border:'0.5px solid #9FE1CB',borderRadius:7,padding:'7px 0',cursor:'pointer',fontSize:12,fontWeight:600,fontFamily:'inherit'}}>🔄 거래처</button>
                        <button onClick={()=>handleSalesDelete(row.id)}
                          style={{background:'#FCEBEB',color:'#A32D2D',border:'0.5px solid #F09595',borderRadius:7,padding:'7px 12px',cursor:'pointer',fontSize:12,fontFamily:'inherit'}}>🗑️</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* MS 요약 */}
            {!salesLoading && salesHistory.length > 0 && (() => {
              const filtered = salesHistory
                .filter(r => !salesCityFilter    || r.location === salesCityFilter)
                .filter(r => !salesStatusFilter  || (r.customer_type||'').includes(salesStatusFilter))
                .filter(r => !salesTypeFilter    || (r.customer_type||'').includes(salesTypeFilter))
              const totalHead    = filtered.reduce((a,r)=>a+(Number(r.total_head)||0),0)
              const tradingHead  = filtered.filter(r=>(r.trade_status||'').includes('거래 중')).reduce((a,r)=>a+(Number(r.total_head)||0),0)
              const ms = totalHead > 0 ? ((tradingHead/totalHead)*100).toFixed(1) : null
              if (totalHead === 0) return null
              return (
                <div style={{background:'white',borderRadius:10,padding:'14px 16px',marginTop:12,border:'0.5px solid rgba(0,0,0,0.08)'}}>
                  <div style={{fontSize:11,color:'#888',marginBottom:10}}>
                    📊 {salesCityFilter||'전체'} {salesTypeFilter||'전체'} 현황
                    <span style={{marginLeft:6,fontSize:10,color:'#bbb'}}>({filtered.length}건 기준)</span>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                    <div style={{background:'#F5F6F4',borderRadius:8,padding:'10px 12px'}}>
                      <div style={{fontSize:10,color:'#888',marginBottom:3}}>전체 규모</div>
                      <div style={{fontSize:16,fontWeight:700,color:'#1a1a18'}}>{totalHead.toLocaleString()}<span style={{fontSize:10,color:'#888',marginLeft:2}}>두</span></div>
                    </div>
                    <div style={{background:'#E1F5EE',borderRadius:8,padding:'10px 12px'}}>
                      <div style={{fontSize:10,color:'#085041',marginBottom:3}}>당사 거래</div>
                      <div style={{fontSize:16,fontWeight:700,color:'#085041'}}>{tradingHead.toLocaleString()}<span style={{fontSize:10,marginLeft:2}}>두</span></div>
                    </div>
                    <div style={{background:ms>=50?'#E1F5EE':ms>=30?'#FAEEDA':'#FCEBEB',borderRadius:8,padding:'10px 12px'}}>
                      <div style={{fontSize:10,color:'#888',marginBottom:3}}>MS</div>
                      <div style={{fontSize:16,fontWeight:700,color:ms>=50?'#085041':ms>=30?'#633806':'#A32D2D'}}>{ms??'—'}<span style={{fontSize:10,marginLeft:2}}>{ms?'%':''}</span></div>
                    </div>
                  </div>
                </div>
              )
            })()}
          </>
        )}
      </div>
    )}
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
                {labels.map(l=>{
                  const suffix = l.includes('_') ? ' ' + l.split('_')[1] : ''
                  const date   = l.split('_')[0]
                  const label  = mode==='daily' ? date + suffix : date.replace('-','년 ')+'월'
                  return <option key={l} value={l}>{label}</option>
                })}
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
