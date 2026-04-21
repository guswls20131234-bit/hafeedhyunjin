import { useState, useEffect } from 'react'

export default function PorkPriceToast() {
  const [info,    setInfo]    = useState(null)  // { price, date, count }
  const [visible, setVisible] = useState(false)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    async function fetchPrice() {
      try {
        const res  = await fetch('https://vsljsjqxcmielpxckjrn.supabase.co/functions/v1/pork-price')
        const data = await res.json()
        if (data.price) {
          setInfo(data)
          setVisible(true)
          // 5초 후 페이드아웃
          setTimeout(() => setExiting(true), 4500)
          setTimeout(() => setVisible(false), 5200)
        }
      } catch (e) {
        console.log('돈가 API 오류:', e)
      }
    }
    fetchPrice()
  }, [])

  if (!visible || !info) return null

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
      display: 'flex', justifyContent: 'center',
      animation: exiting
        ? 'slideUp 0.5s ease-in forwards'
        : 'slideDown 0.4s ease-out forwards',
    }}>
      <div style={{
        background: '#0F2A1E',
        color: 'white',
        borderRadius: '0 0 16px 16px',
        padding: '10px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
        minWidth: 280,
      }}>
        <span style={{ fontSize: 20 }}>🐷</span>
        <div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 1 }}>
            {info.date} 전국 평균 경락가 (제주 제외)
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: '#5DCAA5', letterSpacing: -0.5 }}>
              {info.price.toLocaleString()}
            </span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>원/kg</span>
            {info.count > 0 && (
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginLeft: 2 }}>
                {info.count.toLocaleString()}두
              </span>
            )}
          </div>
        </div>
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
