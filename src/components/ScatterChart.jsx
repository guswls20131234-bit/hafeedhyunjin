import { useEffect, useRef } from 'react'
import { Chart, ScatterController, LinearScale, PointElement, Tooltip } from 'chart.js'

Chart.register(ScatterController, LinearScale, PointElement, Tooltip)

function isGradePlus(cw, bf) { return cw >= 83 && cw < 93 && bf >= 17 && bf < 25 }

const gradeBoxPlugin = {
  id: 'gradeBox',
  beforeDatasetsDraw(chart) {
    const { ctx, scales: { x, y } } = chart
    function drawBox(x0, x1, y0, y1, clr, fill, lbl) {
      const px1 = x.getPixelForValue(x0), px2 = x.getPixelForValue(x1)
      const py1 = y.getPixelForValue(y1), py2 = y.getPixelForValue(y0)
      ctx.save()
      ctx.fillStyle = fill; ctx.fillRect(px1, py1, px2 - px1, py2 - py1)
      ctx.strokeStyle = clr; ctx.lineWidth = 2; ctx.strokeRect(px1, py1, px2 - px1, py2 - py1)
      ctx.fillStyle = clr; ctx.font = '500 11px Noto Sans KR, sans-serif'; ctx.fillText(lbl, px1 + 5, py1 + 14)
      ctx.restore()
    }
    drawBox(83, 93, 17, 25, 'rgba(210,40,40,0.8)',   'rgba(210,40,40,0.07)',   '1등급+')
    drawBox(80, 83, 15, 28, 'rgba(55,138,221,0.7)',  'rgba(55,138,221,0.06)',  '1등급')
    drawBox(83, 93, 15, 17, 'rgba(55,138,221,0.7)',  'rgba(55,138,221,0.06)',  '1등급')
    drawBox(83, 93, 25, 28, 'rgba(55,138,221,0.7)',  'rgba(55,138,221,0.06)',  '1등급')
    drawBox(93, 98, 15, 28, 'rgba(55,138,221,0.7)',  'rgba(55,138,221,0.06)',  '1등급')
  }
}

export default function ScatterChart({ data }) {
  const canvasRef = useRef(null)
  const chartRef  = useRef(null)
  const ttRef     = useRef(null)
  const wrapRef   = useRef(null)

  useEffect(() => {
    if (!canvasRef.current) return
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null }

    const points = data.map(d => ({
      x: d.cw, y: d.bf,
      id: d.pig_id, sex: d.sex, lw: d.lw, price: d.price, date: d.date,
      plus: isGradePlus(d.cw, d.bf)
    }))

    const wrap = wrapRef.current
    canvasRef.current.width  = wrap?.offsetWidth || 600
    canvasRef.current.height = 300

    chartRef.current = new Chart(canvasRef.current, {
      type: 'scatter',
      data: { datasets: [{ label: '출하', data: points, pointRadius: 6, pointHoverRadius: 9,
        pointBackgroundColor: points.map(p => p.plus ? 'rgba(226,75,74,0.8)' : 'rgba(55,138,221,0.75)'),
        pointBorderColor:     points.map(p => p.plus ? 'rgba(163,45,45,0.9)' : 'rgba(24,95,165,0.9)'),
        pointBorderWidth: 1.5 }] },
      plugins: [gradeBoxPlugin],
      options: {
        responsive: false, maintainAspectRatio: false, animation: { duration: 300 },
        plugins: { legend: { display: false }, tooltip: { enabled: false, external: (ctx) => customTT(ctx, ttRef, wrapRef) } },
        scales: {
          x: { min: 65, max: 110, title: { display: true, text: '도체중 (kg)', font: { size: 12 }, color: '#888' }, grid: { color: 'rgba(128,128,128,0.1)' }, ticks: { stepSize: 5, font: { size: 11 }, color: '#888' } },
          y: { min: 5,  max: 40,  title: { display: true, text: '등지방 두께 (mm)', font: { size: 12 }, color: '#888' }, grid: { color: 'rgba(128,128,128,0.1)' }, ticks: { stepSize: 5, font: { size: 11 }, color: '#888' } }
        }
      }
    })
    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, [data])

  return (
    <div ref={wrapRef} className="chart-wrap">
      <canvas ref={canvasRef} />
      <div className="tt" ref={ttRef}>
        <div className="tt-title" id="tt-title-inner"></div>
        <div className="tt-row"  id="tt-body-inner"></div>
      </div>
    </div>
  )
}

function customTT(context, ttRef, wrapRef) {
  const tt = ttRef.current; if (!tt) return
  if (context.tooltip.opacity === 0) { tt.style.display = 'none'; return }
  const dp = context.tooltip.dataPoints?.[0]; if (!dp) return
  const r = dp.raw
  tt.querySelector('#tt-title-inner').textContent = (r.pig_id || '개체') + ' · ' + r.date
  tt.querySelector('#tt-body-inner').innerHTML =
    `도체중: <b>${r.x} kg</b><br>등지방: <b>${r.y} mm</b>` +
    (r.lw    ? `<br>생체중: <b>${Number(r.lw).toFixed(1)} kg</b>` : '') +
    (r.sex   ? `<br>암수: <b>${r.sex}</b>` : '') +
    (r.price ? `<br>생돈대: <b>${Number(r.price).toLocaleString()}원</b>` : '') +
    `<br>등급: <b>${r.plus ? '1등급+' : '1등급 이하'}</b>`
  tt.style.display = 'block'
  const wrap = wrapRef.current
  let left = context.tooltip.caretX + 12
  if (left + 180 > (wrap?.offsetWidth || 600)) left = context.tooltip.caretX - 185
  tt.style.left = left + 'px'; tt.style.top = (context.tooltip.caretY - 20) + 'px'
}
