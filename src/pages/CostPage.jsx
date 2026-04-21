import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const COST_GROUPS = [
  { key: 'medicine', label: '약품/백신비', color: '#E24B4A', bg: '#FCEBEB' },
  { key: 'labor',    label: '인건비',      color: '#378ADD', bg: '#E6F1FB' },
  { key: 'utility',  label: '수도광열비',  color: '#BA7517', bg: '#FAEEDA' },
  { key: 'repair',   label: '수리유지비',  color: '#5F5E5A', bg: '#F1EFE8' },
  { key: 'other',    label: '기타',        color: '#888',    bg: '#F5F6F4' },
]
const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']
const NOW = new Date()

function numFmt(v) { return v ? Number(v).toLocaleString() : '—' }

// 항목 그룹 카드
function CostGroupCard({ group, items, onAdd, onUpdate, onDelete }) {
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newAmt,  setNewAmt]  = useState('')
  const total = items.reduce((a,i)=>a+Number(i.amount||0),0)

  function handleAdd() {
    if (!newAmt) return
    onAdd({ category: group.key, name: newName||group.label, amount: parseFloat(newAmt)||0 })
    setNewName(''); setNewAmt(''); setAdding(false)
  }

  return (
    <div style={{background:'white',border:'0.5px solid rgba(0,0,0,0.08)',borderRadius:12,padding:14,marginBottom:10}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{fontSize:13,fontWeight:600,color:'#1a1a18'}}>{group.label}</span>
          {items.length > 0 && (
            <span style={{fontSize:10,padding:'1px 7px',borderRadius:99,background:group.bg,color:group.color,fontWeight:600}}>
              {items.length}건
            </span>
          )}
        </div>
        <span style={{fontSize:13,fontWeight:700,color:group.color}}>{total>0?total.toLocaleString()+'원':'—'}</span>
      </div>

      {items.map((item,i)=>(
        <div key={item.id||i} style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
          <input value={item.name} onChange={e=>onUpdate(item.id,{name:e.target.value})}
            placeholder="항목명"
            style={{flex:1,padding:'6px 10px',border:'0.5px solid rgba(0,0,0,0.10)',borderRadius:6,fontSize:12,fontFamily:'inherit',outline:'none',background:'#fafafa'}}/>
          <input value={item.amount} onChange={e=>onUpdate(item.id,{amount:e.target.value})}
            type="number" min="0" placeholder="0"
            style={{width:110,padding:'6px 10px',border:'0.5px solid rgba(0,0,0,0.10)',borderRadius:6,fontSize:12,fontFamily:'inherit',outline:'none',background:'#fafafa',textAlign:'right'}}/>
          <span style={{fontSize:11,color:'#888',flexShrink:0}}>원</span>
          <button onClick={()=>onDelete(item.id)}
            style={{padding:'5px 8px',background:'#FCEBEB',color:'#A32D2D',border:'none',borderRadius:6,cursor:'pointer',fontSize:11,flexShrink:0}}>✕</button>
        </div>
      ))}

      {adding ? (
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
          <input value={newName} onChange={e=>setNewName(e.target.value)}
            placeholder={`${group.label} 항목명`} autoFocus
            style={{flex:1,padding:'6px 10px',border:'0.5px solid rgba(0,0,0,0.15)',borderRadius:6,fontSize:12,fontFamily:'inherit',outline:'none'}}/>
          <input value={newAmt} onChange={e=>setNewAmt(e.target.value)}
            type="number" min="0" placeholder="금액"
            style={{width:110,padding:'6px 10px',border:'0.5px solid rgba(0,0,0,0.15)',borderRadius:6,fontSize:12,fontFamily:'inherit',outline:'none',textAlign:'right'}}/>
          <span style={{fontSize:11,color:'#888',flexShrink:0}}>원</span>
          <button onClick={handleAdd}
            style={{padding:'5px 10px',background:group.color,color:'white',border:'none',borderRadius:6,cursor:'pointer',fontSize:11,fontWeight:600,flexShrink:0}}>추가</button>
          <button onClick={()=>{setAdding(false);setNewName('');setNewAmt('')}}
            style={{padding:'5px 8px',background:'#F5F6F4',color:'#888',border:'none',borderRadius:6,cursor:'pointer',fontSize:11,flexShrink:0}}>취소</button>
        </div>
      ) : (
        <button onClick={()=>setAdding(true)}
          style={{width:'100%',padding:'7px',background:'#F5F6F4',border:'0.5px dashed rgba(0,0,0,0.15)',borderRadius:7,cursor:'pointer',fontSize:12,color:'#888',fontFamily:'inherit'}}>
          + 항목 추가
        </button>
      )}

      {items.length > 1 && (
        <div style={{marginTop:8,paddingTop:8,borderTop:'0.5px solid rgba(0,0,0,0.07)',display:'flex',justifyContent:'flex-end'}}>
          <span style={{fontSize:11,color:group.color,fontWeight:600}}>소계 {total.toLocaleString()}원</span>
        </div>
      )}
    </div>
  )
}

export default function CostPage({ farmSlug, shipments, feedRecords }) {
  const slug = farmSlug || 'admin'
  const [year,    setYear]    = useState(NOW.getFullYear())
  const [month,   setMonth]   = useState(NOW.getMonth()+1)
  const [items,   setItems]   = useState([]) // DB 저장된 항목들
  const [loading, setLoading] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [dirty,   setDirty]   = useState(false) // 변경됨 여부

  const years = Array.from({length:5},(_,i)=>NOW.getFullYear()-i)

  useEffect(()=>{ loadItems() },[slug, year, month])

  async function loadItems() {
    setLoading(true)
    const { data } = await supabase.from('cost_records')
      .select('*').eq('farm_slug',slug).eq('year',year).eq('month',month)
      .order('created_at',{ascending:true})
    setItems(data||[])
    setDirty(false)
    setLoading(false)
  }

  function handleAdd({ category, name, amount }) {
    const newItem = { id: `new_${Date.now()}`, farm_slug:slug, year, month, category, name, amount, memo:'', isNew:true }
    setItems(prev=>[...prev, newItem])
    setDirty(true)
  }

  function handleUpdate(id, changes) {
    setItems(prev=>prev.map(it=>it.id===id?{...it,...changes,isDirty:true}:it))
    setDirty(true)
  }

  function handleDelete(id) {
    setItems(prev=>prev.map(it=>it.id===id?{...it,isDeleted:true}:it))
    setDirty(true)
  }

  async function handleSave() {
    setSaving(true)
    const toDelete = items.filter(it=>it.isDeleted && !it.isNew)
    const toInsert = items.filter(it=>it.isNew && !it.isDeleted)
    const toUpdate = items.filter(it=>!it.isNew && !it.isDeleted && it.isDirty)

    for (const it of toDelete) await supabase.from('cost_records').delete().eq('id',it.id)
    for (const it of toInsert) await supabase.from('cost_records').insert({ farm_slug:slug, year, month, category:it.category, name:it.name||it.category, amount:Number(it.amount)||0, memo:it.memo||'' })
    for (const it of toUpdate) await supabase.from('cost_records').update({ name:it.name, amount:Number(it.amount)||0, memo:it.memo||'' }).eq('id',it.id)

    setSaving(false)
    loadItems()
  }

  // 수입: 생돈대 수취액 (해당 월 출하성적에서)
  const monthShipments = (shipments||[]).filter(s=>{
    if (!s.date) return false
    const d = new Date(s.date)
    return d.getFullYear()===year && d.getMonth()+1===month
  })
  // total_paid 있으면 사용, 없으면 price 합계
  const paidSet = monthShipments.filter(s=>s.total_paid>0)
  const income = paidSet.length > 0
    ? paidSet[0].total_paid  // 정산서에서 온 실수령액
    : monthShipments.reduce((a,s)=>a+(Number(s.price)||0),0) // 생돈대 합계

  // 사료비: 해당 월 feed_records에서
  const feedCost = (feedRecords||[]).filter(r=>r.year===year&&r.month===month)
    .reduce((a,r)=>a+Number(r.amount_won||0),0)

  // 비용 계산
  const visibleItems = items.filter(it=>!it.isDeleted)
  const costByGroup = {}
  COST_GROUPS.forEach(g=>{ costByGroup[g.key] = visibleItems.filter(it=>it.category===g.key) })
  const totalCost = visibleItems.reduce((a,it)=>a+Number(it.amount||0),0) + feedCost
  const netProfit = income - totalCost

  return (
    <div style={{padding:'0 0 2rem'}}>
      {/* 조회 컨트롤 */}
      <div style={{background:'white',border:'0.5px solid rgba(0,0,0,0.08)',borderRadius:10,padding:14,marginBottom:10}}>
        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          <select value={year} onChange={e=>{setYear(Number(e.target.value))}}
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
        </div>
      </div>

      {/* 수입 카드 */}
      <div style={{background:'white',border:'0.5px solid rgba(0,0,0,0.08)',borderRadius:12,padding:14,marginBottom:10}}>
        <div style={{fontSize:12,color:'#888',marginBottom:8,fontWeight:500}}>수입</div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'0.5px solid rgba(0,0,0,0.07)'}}>
          <span style={{fontSize:13,color:'#555'}}>생돈대 수취액 <span style={{fontSize:10,color:'#aaa'}}>(출하성적 자동)</span></span>
          <span style={{fontSize:14,fontWeight:700,color:'#085041'}}>{income>0?income.toLocaleString()+'원':'—'}</span>
        </div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingTop:8}}>
          <span style={{fontSize:13,fontWeight:600,color:'#1a1a18'}}>총 수입</span>
          <span style={{fontSize:16,fontWeight:700,color:'#085041'}}>{income>0?income.toLocaleString()+'원':'—'}</span>
        </div>
      </div>

      {/* 지출 */}
      <div style={{fontSize:12,color:'#888',fontWeight:500,marginBottom:8,paddingLeft:2}}>지출</div>

      {/* 사료비 (자동) */}
      <div style={{background:'white',border:'0.5px solid rgba(0,0,0,0.08)',borderRadius:12,padding:14,marginBottom:10}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:13,fontWeight:600}}>사료비</span>
            <span style={{fontSize:10,padding:'1px 7px',borderRadius:99,background:'#E6F1FB',color:'#0C447C',fontWeight:600}}>자동연동</span>
          </div>
          <span style={{fontSize:14,fontWeight:700,color:'#378ADD'}}>{feedCost>0?feedCost.toLocaleString()+'원':'—'}</span>
        </div>
        {feedCost===0 && <div style={{fontSize:11,color:'#bbb',marginTop:4}}>사료현황에 금액을 입력하면 자동으로 표시됩니다.</div>}
      </div>

      {/* 기타 지출 항목들 */}
      {COST_GROUPS.map(group=>(
        <CostGroupCard key={group.key} group={group}
          items={costByGroup[group.key]||[]}
          onAdd={handleAdd} onUpdate={handleUpdate} onDelete={handleDelete}/>
      ))}

      {/* 손익 요약 */}
      <div style={{background:'#0F2A1E',color:'white',borderRadius:12,padding:16,marginTop:4}}>
        <div style={{fontSize:12,color:'rgba(255,255,255,0.5)',marginBottom:12}}>
          {year}년 {month}월 손익 요약
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:13}}>
            <span style={{color:'rgba(255,255,255,0.6)'}}>총 수입</span>
            <span style={{color:'#5DCAA5',fontWeight:600}}>{income>0?income.toLocaleString()+'원':'—'}</span>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:13}}>
            <span style={{color:'rgba(255,255,255,0.6)'}}>총 지출</span>
            <span style={{color:'#F09595',fontWeight:600}}>{totalCost>0?totalCost.toLocaleString()+'원':'—'}</span>
          </div>
          {(feedCost>0||visibleItems.length>0) && (
            <div style={{paddingLeft:12,display:'flex',flexDirection:'column',gap:4}}>
              {feedCost>0 && <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'rgba(255,255,255,0.4)'}}>
                <span>사료비</span><span>{feedCost.toLocaleString()}원</span>
              </div>}
              {COST_GROUPS.map(g=>{
                const tot=(costByGroup[g.key]||[]).reduce((a,it)=>a+Number(it.amount||0),0)
                if(!tot) return null
                return <div key={g.key} style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'rgba(255,255,255,0.4)'}}>
                  <span>{g.label}</span><span>{tot.toLocaleString()}원</span>
                </div>
              })}
            </div>
          )}
          <div style={{borderTop:'0.5px solid rgba(255,255,255,0.15)',paddingTop:10,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontSize:14,fontWeight:700}}>손익</span>
            <span style={{fontSize:20,fontWeight:700,color:netProfit>=0?'#5DCAA5':'#F09595'}}>
              {income===0&&totalCost===0?'—':(netProfit>=0?'+':'')+netProfit.toLocaleString()+'원'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
