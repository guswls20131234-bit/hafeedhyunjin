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

export function parseExcel(arrayBuffer) {
  const wb   = XLSX.read(arrayBuffer, { type: 'array', cellDates: false })
  const ws   = wb.Sheets[wb.SheetNames[0]]
  const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true })

  let headerRow = -1
  for (let i = 0; i < json.length; i++) {
    const r = json[i].map(c => String(c).trim().replace(/\s/g, '')).join('|')
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
    id:    find('거래처개체번호', '개체번호'),
    sex:   findSex(),
    lw:    find('생체중'),
    cw:    find('도체중'),
    bf:    find('등지방'),
    price: find('생돈대'),
    date:  find('출하일', '날짜', '일자'),
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
      date:  dateVal,
      id:    idx.id    !== undefined ? String(row[idx.id]    ?? '').trim() : '',
      sex,
      lw:    parseFloat(row[idx.lw]    ?? '') || 0,
      cw,
      bf,
      price: parseFloat(row[idx.price] ?? '') || 0,
    })
  }

  if (!rows.length) throw new Error('유효한 데이터가 없습니다.')
  return { rows, sheetDate }
}
