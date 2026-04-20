import * as XLSX from 'xlsx'

function excelDateToStr(serial) {
  const utc = new Date(Math.round((serial - 25569) * 86400 * 1000))
  return `${utc.getUTCFullYear()}-${String(utc.getUTCMonth()+1).padStart(2,'0')}-${String(utc.getUTCDate()).padStart(2,'0')}`
}

function parseDateVal(v) {
  if (!v && v !== 0) return null
  if (typeof v === 'number' && v > 40000 && v < 60000) return excelDateToStr(v)
  if (typeof v === 'string') {
    const m = v.match(/(\d{4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})/)
    if (m) return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`
  }
  return null
}

// ── 생돈 구매 정산서 파싱 ──────────────────────────────
function parseJeongSanSeo(json) {
  let sheetDate   = new Date().toISOString().slice(0, 10)
  // Row3에서 육가공 업체명 + 시세/kg 읽기
  let sheetMeatco = ''
  let sheetPriceKg = 0

  // 상위 10행 스캔: 입고일자, 출하육가공, 전국단가, 자조금/감가 항목
  const settlement = {
    total_price: 0, jojogeum: 0, total_paid: 0,
    deduct_samgyup: 0, deduct_moksim: 0, deduct_fat: 0,
    deduct_weight: 0, deduct_grade: 0, deduct_huji: 0,
    grade_bonus: 0
  }

  for (let i = 0; i < Math.min(12, json.length); i++) {
    const row = json[i]
    for (let ci = 0; ci < row.length; ci++) {
      const h = String(row[ci] || '').trim().replace(/\s/g,'')
      const nextVal = () => {
        for (let k = ci+1; k < Math.min(ci+8, row.length); k++) {
          const val = parseFloat(row[k])
          if (!isNaN(val)) return val
        }
        return 0
      }
      // 날짜
      if (!sheetDate || sheetDate === new Date().toISOString().slice(0,10)) {
        const d = parseDateVal(row[ci])
        if (d) sheetDate = d
      }
      // 육가공
      if ((h.includes('출하육가공') || (h.includes('육가공') && !h.includes('감량'))) && !sheetMeatco) {
        for (let k = ci+1; k < Math.min(ci+10, row.length); k++) {
          const v = String(row[k] || '').trim()
          if (v && !v.replace(/\s/g,'').includes('육가공') && v.length > 1) { sheetMeatco = v; break }
        }
      }
      // 전국단가
      if (h.includes('전국단가') && !sheetPriceKg) {
        const val = nextVal(); if (val > 1000) sheetPriceKg = val
      }
      // 정산 항목
      if (h.includes('생돈대') && !h.includes('등급'))    settlement.total_price  = nextVal()
      if (h.includes('자조금'))                            settlement.jojogeum     = nextVal()
      if (h.includes('총지급액'))                          settlement.total_paid   = nextVal()
      if (h.includes('등급장려금'))                        settlement.grade_bonus  = nextVal()
      if (h.includes('삼겹감량'))                          settlement.deduct_samgyup = nextVal()
      if (h.includes('목심감량'))                          settlement.deduct_moksim  = nextVal()
      if (h.includes('등지방감량'))                        settlement.deduct_fat     = nextVal()
      if (h.includes('도체중감량'))                        settlement.deduct_weight  = nextVal()
      if (h.includes('등급감량'))                          settlement.deduct_grade   = nextVal()
      if (h.includes('후지감량'))                          settlement.deduct_huji    = nextVal()
    }
  }

  // 헤더 행 찾기: 순번 + 도체번호 + 성별
  let headerRow = -1
  for (let i = 0; i < json.length; i++) {
    const r = json[i].map(c => String(c||'').trim().replace(/\s/g,'')).join('|')
    if (r.includes('순번') && r.includes('도체번호') && r.includes('성별')) { headerRow = i; break }
  }
  if (headerRow === -1) throw new Error('정산서 헤더를 찾을 수 없습니다.')

  const headers = json[headerRow].map(c => String(c||'').trim().replace(/\s/g,''))
  const findCol = (...aliases) => {
    for (let ci = 0; ci < headers.length; ci++)
      if (aliases.some(a => headers[ci].includes(a))) return ci
    return undefined
  }

  const idxNo  = findCol('순번')
  const idxId  = findCol('도체번호')
  const idxSex = findCol('성별')
  const idxLw  = findCol('생체중')
  const idxCw  = findCol('도체중')
  const idxBf  = findCol('등지방')
  const idxPr  = findCol('생돈대')

  const rows = []
  for (let i = headerRow + 1; i < json.length; i++) {
    const row = json[i]
    if (!row || row.every(c => c === '' || c == null)) continue
    const no = row[idxNo]
    if (typeof no !== 'number' && isNaN(parseInt(no))) continue

    const cw = parseFloat(row[idxCw] ?? '')
    const bf = parseFloat(row[idxBf] ?? '')
    if (isNaN(cw) || isNaN(bf) || cw === 0 || bf === 0) continue

    const rawSex = String(row[idxSex] ?? '').trim()
    const sex = rawSex === '암' ? '암' : rawSex.includes('거세') ? '거세' : rawSex
    const price = parseFloat(row[idxPr] ?? '') || 0

    rows.push({
      date:   sheetDate,
      pig_id: idxId !== undefined ? String(row[idxId] ?? '').trim() : '',
      sex, lw: parseFloat(row[idxLw] ?? '') || 0, cw, bf, price,
      meatco: sheetMeatco,
      // 정산 항목은 rows 첫 번째에만 저장 (출하 단위 정보)
      ...(rows.length === 0 ? settlement : {})
    })
  }

  // 전국단가 없으면 생돈대÷도체중 평균으로 계산
  if (!sheetPriceKg) {
    const totalPrice = rows.reduce((a,r) => a + r.price, 0)
    const totalCw    = rows.reduce((a,r) => a + r.cw, 0)
    if (totalCw > 0) sheetPriceKg = Math.round(totalPrice / totalCw)
  }

  if (!rows.length) throw new Error('정산서에서 데이터를 찾을 수 없습니다.')
  return { rows, sheetDate, sheetMeatco, sheetPriceKg, settlement }
}

// ── 기존 우리 양식 파싱 ───────────────────────────────
function parseOurForm(json) {
  let headerRow = -1
  for (let i = 0; i < json.length; i++) {
    const r = json[i].map(c => String(c).trim().replace(/\s/g,'')).join('|')
    if (r.includes('도체중') && r.includes('등지방')) { headerRow = i; break }
  }
  if (headerRow === -1) throw new Error('헤더를 찾을 수 없습니다. 양식을 확인해 주세요.')

  const headers = json[headerRow].map(c => String(c).trim().replace(/\s|\(.*?\)/g, ''))
  const find = (...aliases) => {
    for (let ci = 0; ci < headers.length; ci++)
      if (aliases.some(a => headers[ci].includes(a))) return ci
    return undefined
  }
  const findSex = () => {
    for (let ci = 0; ci < headers.length; ci++) {
      const h = headers[ci]
      if (h.includes('암수') || h.includes('성별') || h === '암' || h === '수') return ci
    }
    return undefined
  }

  const idx = {
    id:     find('거래처개체번호', '개체번호'),
    sex:    findSex(),
    lw:     find('생체중'),
    cw:     find('도체중'),
    bf:     find('등지방'),
    price:  find('생돈대'),
    date:   find('출하일', '날짜', '일자'),
    meatco: find('육가공업체명', '육가공업체', '육가공'),
  }

  let sheetMeatco = '', sheetPriceKg = 0
  for (let i = 0; i < Math.min(headerRow, json.length); i++) {
    const row = json[i]
    for (let ci = 0; ci < row.length; ci++) {
      const h = String(row[ci]).trim().replace(/\s/g, '')
      if (h.includes('육가공') && !sheetMeatco)
        sheetMeatco = String(row[ci+2] || row[ci+1] || '').trim()
      if ((h.includes('시세') || h.includes('원/kg')) && !sheetPriceKg) {
        const val = parseFloat(row[ci+2] || row[ci+1] || 0)
        if (!isNaN(val)) sheetPriceKg = val
      }
    }
  }

  let sheetDate = new Date().toISOString().slice(0, 10)
  for (let i = 0; i < Math.min(headerRow, json.length); i++)
    for (const v of json[i]) { const d = parseDateVal(v); if (d) { sheetDate = d; break } }

  const rows = []
  for (let i = headerRow + 1; i < json.length; i++) {
    const row = json[i]
    if (!row || row.every(c => c === '' || c === null || c === undefined)) continue
    const cw = parseFloat(row[idx.cw] ?? ''), bf = parseFloat(row[idx.bf] ?? '')
    if (isNaN(cw) || isNaN(bf) || cw === 0 || bf === 0) continue
    let dateVal = sheetDate
    if (idx.date !== undefined) { const d = parseDateVal(row[idx.date]); if (d) dateVal = d }
    const rawSex = idx.sex !== undefined ? String(row[idx.sex] ?? '').trim() : ''
    const sex = rawSex === '암' || rawSex.startsWith('암') ? '암' : rawSex.includes('거세') ? '거세' : rawSex
    rows.push({
      date: dateVal,
      pig_id: idx.id !== undefined ? String(row[idx.id] ?? '').trim() : '',
      sex, lw: parseFloat(row[idx.lw] ?? '') || 0, cw, bf,
      price: parseFloat(row[idx.price] ?? '') || 0,
      meatco: idx.meatco !== undefined ? String(row[idx.meatco] ?? '').trim() : sheetMeatco,
    })
  }

  if (!rows.length) throw new Error('유효한 데이터가 없습니다.')
  return { rows, sheetDate, sheetMeatco, sheetPriceKg }
}

// ── 메인 export ───────────────────────────────────────
export function parseExcel(arrayBuffer) {
  const wb   = XLSX.read(arrayBuffer, { type: 'array', cellDates: false })
  const ws   = wb.Sheets[wb.SheetNames[0]]
  const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true })

  // 정산서 자동 감지
  const topText = json.slice(0, 6).flat().map(c => String(c||'').replace(/\s/g,'')).join('')
  const isJeongSan = topText.includes('생돈구매정산서') || topText.includes('생돈정산서')

  return isJeongSan ? parseJeongSanSeo(json) : parseOurForm(json)
}
