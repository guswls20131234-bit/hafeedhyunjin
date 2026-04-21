// Vercel Edge Function - 돼지 경락가격 API 프록시
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET')

  const SERVICE_KEY = '9c0a474a9ce8fadbde7cdec55ee6dff7d0c4d6df8816e2e71ac04e4589121c99'

  // 오늘 날짜 (YYYYMMDD)
  const today = new Date()
  const yyyymmdd = `${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}${String(today.getDate()).padStart(2,'0')}`

  // 어제 날짜도 준비 (주말/공휴일 대비)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yyyymmddYest = `${yesterday.getFullYear()}${String(yesterday.getMonth()+1).padStart(2,'0')}${String(yesterday.getDate()).padStart(2,'0')}`

  try {
    // 돼지 경락가격 API 호출
    async function fetchPrice(date) {
      const url = `http://data.ekape.or.kr/openapi-data/service/user/grade/auct/pig?serviceKey=${SERVICE_KEY}&yyyymmdd=${date}&numOfRows=100&pageNo=1`
      const response = await fetch(url)
      const text = await response.text()
      return text
    }

    let xml = await fetchPrice(yyyymmdd)

    // 데이터 없으면 어제 시도
    if (!xml.includes('<avgAmt>') && !xml.includes('<auctDataList>')) {
      xml = await fetchPrice(yyyymmddYest)
    }

    // XML 파싱 (간단하게 정규식으로)
    const extractAll = (tag, str) => {
      const regex = new RegExp(`<${tag}>(.*?)</${tag}>`, 'g')
      const results = []
      let m
      while ((m = regex.exec(str)) !== null) results.push(m[1])
      return results
    }
    const extract = (tag, str) => { const r = extractAll(tag, str); return r[0] || '' }

    // 전체 데이터에서 지역별 평균가 추출
    // 제주 제외 (jemisangId 등 제주 코드 제외)
    const items = xml.split('<item>').slice(1)
    
    let totalAmt = 0
    let totalCnt = 0

    for (const item of items) {
      const auctPlaceNm = extract('auctPlaceNm', item)
      const avgAmt = parseFloat(extract('avgAmt', item)) || 0
      const auctCnt = parseFloat(extract('auctCnt', item)) || 0
      
      // 제주 제외
      if (auctPlaceNm.includes('제주') || auctPlaceNm.includes('濟州')) continue
      if (avgAmt === 0 || auctCnt === 0) continue

      totalAmt += avgAmt * auctCnt
      totalCnt += auctCnt
    }

    const avgPrice = totalCnt > 0 ? Math.round(totalAmt / totalCnt) : 0

    // 날짜 표시용
    const dateStr = xml.includes(yyyymmdd) ? yyyymmdd : yyyymmddYest
    const displayDate = `${dateStr.slice(0,4)}-${dateStr.slice(4,6)}-${dateStr.slice(6,8)}`

    if (avgPrice === 0) {
      // 데이터 없을 때 최근 3일 재시도
      return res.status(200).json({ price: null, date: null, message: '오늘 경락 데이터 없음' })
    }

    res.status(200).json({
      price: avgPrice,
      date: displayDate,
      count: totalCnt,
      unit: '원/kg'
    })

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

