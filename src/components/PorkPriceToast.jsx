import { useState, useEffect } from 'react'

const DAYS_KO = ['일','월','화','수','목','금','토']

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function formatDate(date) {
  return `${date.getMonth()+1}월 ${date.getDate()}일 (${DAYS_KO[date.getDay()]})`
}

export default function PorkPriceToast() {
  const [info,    setInfo]    = useState(null)
  const [visible, setVisible] = useState(false)
  const [exiting, setExiting] = useState(false)

  const today = new Date()
  const diag1 = addDays(today, 21)
  const diag2 = addDays(today, 28)
  const birth = addDays(today, 114)

  useEffect(() => {
    async function fetchPrice() {
      try {
        const res  = await fetch('https://vsljsjqxcmielpxckjrn.supabase.co/functions/v1/pork-price')
        const data = await res.json()
        if (data.price) setInfo(data)
      } catch (e) {}
    }
    fetchPrice()
    setVisible(true)
    setTimeout(() => setExiting(true), 6500)
    setTimeout(() => setVisible(false), 7200)
  }, [])

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
      display: 'flex', justifyContent: 'center',
      animation: exiting ? 'slideUp 0.5s ease-in forwards' : 'slideDown 0.4s ease-out forwards',
    }}>
      <div style={{
        background: '#0F2A1E', color: 'white',
        borderRadius: '0 0 16px 16px',
        padding: '12px 20px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
        minWidth: 270, maxWidth: 380,
        display: 'flex', flexDirection: 'column', gap: 10
      }}>
        {/* 진단일/분만일 */}
        <div>
          <div style={{fontSize:10, color:'rgba(255,255,255,0.4)', marginBottom:6}}>
            🐷 오늘({formatDate(today)}) 종부 시
          </div>
          <div style={{display:'flex', flexDirection:'column', gap:5}}>
            {[
              {label:'1차 진단', date:diag1, days:21,  color:'#5DCAA5'},
              {label:'2차 진단', date:diag2, days:28,  color:'#FAC775'},
              {label:'분만 예정', date:birth, days:114, color:'#F09595'},
            ].map(({label, date, days, color})=>(
              <div key={label} style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div style={{display:'flex', alignItems:'center', gap:8}}>
                  <span style={{fontSize:10, color:'rgba(255,255,255,0.45)', width:44, flexShrink:0}}>{label}</span>
                  <span style={{fontSize:12, color, fontWeight:600}}>{formatDate(date)}</span>
                </div>
                <span style={{fontSize:10, color:'rgba(255,255,255,0.3)'}}>+{days}일</span>
              </div>
            ))}
          </div>
        </div>

        {/* 시세 */}
        {info && (
          <div style={{borderTop:'0.5px solid rgba(255,255,255,0.1)', paddingTop:8,
            display:'flex', alignItems:'center', justifyContent:'space-between'}}>
            <div>
              <div style={{fontSize:10, color:'rgba(255,255,255,0.4)', marginBottom:1}}>
                {info.date} 전국 경락가 (제주 제외)
              </div>
              <div style={{display:'flex', alignItems:'baseline', gap:4}}>
                <span style={{fontSize:20, fontWeight:800, color:'#5DCAA5'}}>
                  {info.price.toLocaleString()}
                </span>
                <span style={{fontSize:11, color:'rgba(255,255,255,0.5)'}}>원/kg</span>
              </div>
            </div>
            {info.count > 0 && (
              <span style={{fontSize:10, color:'rgba(255,255,255,0.3)'}}>{info.count.toLocaleString()}두</span>
            )}
          </div>
        )}
        {!info && (
          <div style={{borderTop:'0.5px solid rgba(255,255,255,0.1)', paddingTop:8,
            fontSize:11, color:'rgba(255,255,255,0.3)'}}>
            경락가 불러오는 중...
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(0);    opacity: 1; }
          to   { transform: translateY(-100%); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
