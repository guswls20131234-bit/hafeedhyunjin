import { useEffect, useRef, useState } from 'react'

const FEATURES = [
  {
    icon: '📊',
    title: '출하 성적 산점도',
    desc: '도체중 × 등지방을 한눈에. 1등급+ 기준선을 겹쳐 보여줘 어디서 손해가 나는지 바로 보입니다.',
    detail: '단순 평균 수치만 보는 기존 방식과 달리, 전체 개체를 한 화면에 펼쳐 등급 분포를 시각화합니다.'
  },
  {
    icon: '📋',
    title: '출하 데이터 관리',
    desc: '엑셀 양식 하나로 끝. 업로드하면 자동 저장·분석·시각화까지.',
    detail: '개체번호, 암/거세, 생체중, 도체중, 등지방, 생돈대, 육가공 업체까지 한 번에 관리합니다.'
  },
  {
    icon: '🌾',
    title: '사료 현황 관리',
    desc: '자돈·모돈·비육 구간별 사료 사용량을 월별로 기록하고 전월과 비교합니다.',
    detail: '구간별 비중, 전월 대비 증감, 연간 추이까지 자동 계산됩니다.'
  },
  {
    icon: '📱',
    title: '거래처 전용 링크',
    desc: '농장마다 고유 링크 하나. 접속하면 본인 데이터만 바로 확인할 수 있습니다.',
    detail: '별도 앱 설치 없이 스마트폰으로 언제든지 확인 가능합니다.'
  },
]

const STATS = [
  { label: '평균 도체중', value: '86.0', unit: 'kg' },
  { label: '1등급+ 비율', value: '48.7', unit: '%' },
  { label: '지육율', value: '74.2', unit: '%' },
  { label: '평균 등지방', value: '22.1', unit: 'mm' },
]

function ScatterDemo() {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvas.width, H = canvas.height
    const PAD = { l:36, r:16, t:12, b:32 }
    const xMin=65, xMax=105, yMin=5, yMax=40

    const toX = v => PAD.l + (v-xMin)/(xMax-xMin)*(W-PAD.l-PAD.r)
    const toY = v => H-PAD.b - (v-yMin)/(yMax-yMin)*(H-PAD.t-PAD.b)

    ctx.clearRect(0,0,W,H)

    ctx.strokeStyle='rgba(0,0,0,0.06)'; ctx.lineWidth=1
    for(let x=70;x<=100;x+=10){ ctx.beginPath();ctx.moveTo(toX(x),PAD.t);ctx.lineTo(toX(x),H-PAD.b);ctx.stroke() }
    for(let y=10;y<=35;y+=5){ ctx.beginPath();ctx.moveTo(PAD.l,toY(y));ctx.lineTo(W-PAD.r,toY(y));ctx.stroke() }

    ctx.fillStyle='rgba(220,50,50,0.06)'; ctx.strokeStyle='rgba(220,50,50,0.7)'; ctx.lineWidth=1.5
    ctx.fillRect(toX(83),toY(25),toX(93)-toX(83),toY(17)-toY(25))
    ctx.strokeRect(toX(83),toY(25),toX(93)-toX(83),toY(17)-toY(25))
    ctx.fillStyle='rgba(220,50,50,0.8)'; ctx.font='bold 9px sans-serif'
    ctx.fillText('1등급+',toX(83)+4,toY(25)+12)

    ;[[80,83,15,28],[83,93,15,17],[83,93,25,28],[93,98,15,28]].forEach(([x0,x1,y0,y1])=>{
      ctx.fillStyle='rgba(55,138,221,0.05)'; ctx.strokeStyle='rgba(55,138,221,0.5)'; ctx.lineWidth=1
      ctx.fillRect(toX(x0),toY(y1),toX(x1)-toX(x0),toY(y0)-toY(y1))
      ctx.strokeRect(toX(x0),toY(y1),toX(x1)-toX(x0),toY(y0)-toY(y1))
    })

    const pts=[
      [87,22,1],[91,21,1],[89,19,1],[86,17,1],[92,23,1],[88,20,1],
      [90,21,1],[85,17,1],[91,22,1],[89,18,1],[87,20,1],[84,19,1],[86,21,1],
      [94,25,0],[84,15,0],[80,25,0],[95,29,0],[82,28,0],[96,22,0],
      [78,22,0],[88,27,0],[93,26,0],[85,28,0],[88,15,0],[92,26,0],
    ]
    pts.forEach(([x,y,plus])=>{
      ctx.beginPath(); ctx.arc(toX(x),toY(y),4,0,Math.PI*2)
      ctx.fillStyle = plus ? 'rgba(226,75,74,0.85)' : 'rgba(55,138,221,0.75)'
      ctx.fill()
      ctx.strokeStyle = plus ? 'rgba(163,45,45,0.9)' : 'rgba(24,95,165,0.9)'
      ctx.lineWidth=1; ctx.stroke()
    })

    ctx.fillStyle='#999'; ctx.font='9px sans-serif'; ctx.textAlign='center'
    for(let x=70;x<=100;x+=10) ctx.fillText(x,toX(x),H-PAD.b+12)
    ctx.textAlign='right'
    for(let y=10;y<=35;y+=5) ctx.fillText(y,PAD.l-4,toY(y)+3)
    ctx.textAlign='center'; ctx.fillStyle='#aaa'
    ctx.fillText('도체중 (kg)',W/2,H-2)
  },[])

  return <canvas ref={canvasRef} width={320} height={180} style={{width:'100%',height:'auto',display:'block'}}/>
}

export default function IntroPage() {
  const [visible, setVisible] = useState({})
  const refs = useRef([])

  useEffect(()=>{
    if (!('IntersectionObserver' in window)) {
      const v = {}
      FEATURES.forEach((_,i) => { v[i] = true })
      setVisible(v)
      return
    }
    const obs = new IntersectionObserver(entries=>{
      entries.forEach(e=>{ if(e.isIntersecting) setVisible(v=>({...v,[e.target.dataset.idx]:true})) })
    },{threshold:0.1})
    refs.current.filter(Boolean).forEach(r=> obs.observe(r))
    return ()=>obs.disconnect()
  },[])

  return (
    <div style={{fontFamily:"'Noto Sans KR',sans-serif",background:'#f8f7f4',minHeight:'100vh',color:'#1a1a18'}}>

      <div style={{background:'#0F1F15',color:'white',padding:'52px 24px 48px',textAlign:'center',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',inset:0,backgroundImage:'radial-gradient(circle at 25% 60%, rgba(220,30,30,0.08) 0%, transparent 55%), radial-gradient(circle at 75% 30%, rgba(29,158,117,0.12) 0%, transparent 55%)'}}/>
        <div style={{position:'relative'}}>
          <div style={{display:'inline-flex',alignItems:'center',gap:10,background:'rgba(255,255,255,0.07)',border:'0.5px solid rgba(255,255,255,0.12)',borderRadius:12,padding:'8px 18px',marginBottom:28}}>
            <div style={{width:28,height:28,borderRadius:'50%',background:'#E8211A',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <svg viewBox="0 0 20 20" width="16" height="16" fill="none">
                <path d="M4 12 Q10 18 16 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
              </svg>
            </div>
            <div style={{textAlign:'left'}}>
              <div style={{fontSize:9,color:'rgba(255,255,255,0.45)',letterSpacing:'0.08em'}}>happy feed</div>
              <div style={{fontSize:15,fontWeight:700,color:'white',letterSpacing:'-0.3px',lineHeight:1}}>hafeed</div>
            </div>
            <div style={{width:1,height:24,background:'rgba(255,255,255,0.12)',margin:'0 4px'}}/>
            <div style={{fontSize:12,color:'rgba(255,255,255,0.6)'}}>고려산업주식회사</div>
          </div>

          <div style={{width:68,height:68,borderRadius:'50%',background:'linear-gradient(135deg,#1D9E75,#E8211A)',margin:'0 auto 14px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,fontWeight:700,color:'white',boxShadow:'0 8px 28px rgba(0,0,0,0.3)'}}>박</div>
          <h1 style={{fontSize:26,fontWeight:700,margin:'0 0 4px',letterSpacing:'-0.3px'}}>박현진</h1>
          <p style={{fontSize:13,color:'rgba(255,255,255,0.5)',margin:'0 0 28px'}}>영업과장 · 영업1본부</p>
          <p style={{fontSize:15,lineHeight:1.85,color:'rgba(255,255,255,0.82)',maxWidth:380,margin:'0 auto 32px'}}>
            믿어주시면 <span style={{color:'#5DCAA5',fontWeight:700}}>양돈 관리 시스템</span>으로<br/>
            출하 성적을 데이터로 함께 관리해드립니다.
          </p>
          <a href="tel:01033385512" style={{display:'inline-block',background:'#1D9E75',color:'white',borderRadius:10,padding:'12px 36px',fontSize:14,fontWeight:700,textDecoration:'none',boxShadow:'0 4px 16px rgba(29,158,117,0.4)'}}>
            📞 전화 상담하기
          </a>
        </div>
      </div>

      <div style={{maxWidth:520,margin:'0 auto',padding:'28px 20px 0'}}>
        <p style={{fontSize:11,color:'#bbb',textAlign:'center',marginBottom:12}}>실제 거래처 출하 성적 예시</p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8,marginBottom:24}}>
          {STATS.map((s,i)=>(
            <div key={i} style={{background:'white',borderRadius:12,padding:'13px 15px',border:'0.5px solid rgba(0,0,0,0.07)'}}>
              <div style={{fontSize:10,color:'#aaa',marginBottom:3}}>{s.label}</div>
              <div style={{fontSize:22,fontWeight:700}}>{s.value}<span style={{fontSize:12,fontWeight:400,color:'#888',marginLeft:2}}>{s.unit}</span></div>
            </div>
          ))}
        </div>

        <div style={{background:'white',borderRadius:14,padding:'16px',border:'0.5px solid rgba(0,0,0,0.07)',marginBottom:8}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:2}}>도체중 vs 등지방 산점도</div>
          <div style={{fontSize:11,color:'#888',marginBottom:10}}>탕박도체 1등급·1등급+ 기준선 포함</div>
          <ScatterDemo/>
          <div style={{display:'flex',gap:10,flexWrap:'wrap',marginTop:8}}>
            {[['#E24B4A','1등급+'],['#378ADD','1등급 이하']].map(([c,l])=>(
              <div key={l} style={{display:'flex',alignItems:'center',gap:4,fontSize:10,color:'#888'}}>
                <div style={{width:7,height:7,borderRadius:'50%',background:c}}/>{l}
              </div>
            ))}
            {[['rgba(210,40,40,0.1)','rgba(210,40,40,0.7)','1등급+'],['rgba(55,138,221,0.08)','rgba(55,138,221,0.6)','1등급']].map(([bg,bd,l])=>(
              <div key={l} style={{display:'flex',alignItems:'center',gap:4,fontSize:10,color:'#888'}}>
                <div style={{width:11,height:7,borderRadius:2,background:bg,border:`1.5px solid ${bd}`}}/>{l}
              </div>
            ))}
          </div>
        </div>
        <p style={{fontSize:11,color:'#ccc',textAlign:'center',marginBottom:32}}>단순 수치가 아닌 전체 분포를 한눈에 확인</p>

        <h2 style={{fontSize:17,fontWeight:700,marginBottom:4,textAlign:'center'}}>제공하는 관리 서비스</h2>
        <p style={{fontSize:12,color:'#999',textAlign:'center',marginBottom:20}}>엑셀 업로드 한 번으로 모든 게 자동으로</p>
        {FEATURES.map((f,i)=>(
          <div key={i} ref={el=>{ refs.current[i]=el }} data-idx={String(i)}
            style={{background:'white',borderRadius:14,padding:'16px',border:'0.5px solid rgba(0,0,0,0.07)',marginBottom:10,
              opacity:visible[i]?1:0, transform:visible[i]?'translateY(0)':'translateY(18px)',
              transition:`opacity 0.45s ${i*0.07}s, transform 0.45s ${i*0.07}s`}}>
            <div style={{display:'flex',gap:12,alignItems:'flex-start'}}>
              <div style={{fontSize:22,flexShrink:0,lineHeight:1.2}}>{f.icon}</div>
              <div>
                <div style={{fontSize:13,fontWeight:700,marginBottom:4}}>{f.title}</div>
                <div style={{fontSize:12,color:'#444',lineHeight:1.7,marginBottom:6}}>{f.desc}</div>
                <div style={{fontSize:11,color:'#999',lineHeight:1.6,paddingTop:6,borderTop:'0.5px solid rgba(0,0,0,0.06)'}}>{f.detail}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{background:'#0F1F15',color:'white',padding:'36px 24px',marginTop:8}}>
        <div style={{maxWidth:520,margin:'0 auto'}}>
          <h2 style={{fontSize:17,fontWeight:700,marginBottom:4,textAlign:'center'}}>왜 다른가요?</h2>
          <p style={{fontSize:12,color:'rgba(255,255,255,0.4)',textAlign:'center',marginBottom:20}}>숫자 하나가 아닌, 전체 맥락을 드립니다</p>
          {[
            {label:'출하 성적 분석', a:'평균 86kg — 좋은지 나쁜지 알 수 없음', b:'86kg 중 어디에 몰려있고 등급선 밖이 몇 마리인지 한눈에'},
            {label:'데이터 관리', a:'파일이 쌓일수록 비교·분석이 어려움', b:'업로드하면 자동 저장·분석, 스마트폰으로 언제든 확인'},
          ].map((row,i)=>(
            <div key={i} style={{background:'rgba(255,255,255,0.04)',borderRadius:12,padding:'14px',marginBottom:10,border:'0.5px solid rgba(255,255,255,0.07)'}}>
              <div style={{fontSize:11,fontWeight:600,color:'#5DCAA5',marginBottom:10}}>{row.label}</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                <div style={{background:'rgba(255,255,255,0.04)',borderRadius:8,padding:'10px 11px'}}>
                  <div style={{fontSize:9,color:'rgba(255,255,255,0.3)',marginBottom:4}}>기존 방식</div>
                  <div style={{fontSize:11,color:'rgba(255,255,255,0.5)',lineHeight:1.65}}>{row.a}</div>
                </div>
                <div style={{background:'rgba(29,158,117,0.14)',borderRadius:8,padding:'10px 11px',border:'0.5px solid rgba(29,158,117,0.28)'}}>
                  <div style={{fontSize:9,color:'#5DCAA5',marginBottom:4}}>이 방식</div>
                  <div style={{fontSize:11,color:'rgba(255,255,255,0.8)',lineHeight:1.65}}>{row.b}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{background:'#f8f7f4',padding:'36px 24px 48px',textAlign:'center'}}>
        <div style={{maxWidth:400,margin:'0 auto'}}>
          <div style={{width:52,height:52,borderRadius:'50%',background:'linear-gradient(135deg,#1D9E75,#E8211A)',margin:'0 auto 14px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:700,color:'white'}}>박</div>
          <h2 style={{fontSize:18,fontWeight:700,marginBottom:4}}>박현진 영업과장</h2>
          <p style={{fontSize:12,color:'#888',marginBottom:6}}>고려산업주식회사 · 영업1본부</p>
          <p style={{fontSize:11,color:'#bbb',marginBottom:6}}>경남 창녕군 대합면 수장퇴산로 35</p>
          <p style={{fontSize:11,color:'#bbb',marginBottom:24}}>hjpark94@hafeed.com · www.hafeed.com</p>
          <a href="tel:01033385512" style={{display:'block',background:'#1D9E75',color:'white',borderRadius:12,padding:'14px',fontSize:15,fontWeight:700,textDecoration:'none',marginBottom:8,boxShadow:'0 4px 16px rgba(29,158,117,0.25)'}}>
            📞 010-3338-5512
          </a>
          <a href="mailto:hjpark94@hafeed.com" style={{display:'block',background:'white',color:'#555',borderRadius:12,padding:'13px',fontSize:13,fontWeight:500,textDecoration:'none',border:'0.5px solid rgba(0,0,0,0.10)'}}>
            ✉ hjpark94@hafeed.com
          </a>
          <div style={{marginTop:24,padding:'14px',background:'white',borderRadius:12,border:'0.5px solid rgba(0,0,0,0.08)'}}>
            <div style={{fontSize:11,color:'#bbb',marginBottom:2}}>happy feed</div>
            <div style={{fontSize:14,fontWeight:700,color:'#E8211A',letterSpacing:'-0.2px'}}>hafeed</div>
            <div style={{fontSize:11,color:'#888',marginTop:2}}>행복한 사료 해피드</div>
          </div>
        </div>
      </div>
    </div>
  )
}
