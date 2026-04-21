// Vercel Serverless Function - 돼지 경락가격 API 프록시
const http = require('http')

const SERVICE_KEY = '9c0a474a9ce8fadbde7cdec55ee6dff7d0c4d6df8816e2e71ac04e4589121c99'

function fetchHttp(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => resolve(data))
    }).on('error', reject)
  })
}

function getDateStr(offsetDays = 0) {
  const d = new Date()
  d.setDate(d.getDate() - offsetDays)
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`
}

function extract(tag, str) {
  const m = str.match(new RegExp(`<${tag}>(.*?)</${tag}>`))
  return m ? m[1] : ''
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  for (let offset = 0; offset <= 4; offset++) {
    const yyyymmdd = getDateStr(offset)
    const url = `http://data.ekape.or.kr/openapi-data/service/user/grade/auct/pig?serviceKey=${SERVICE_KEY}&yyyymmdd=${yyyymmdd}&numOfRows=100&pageNo=1`

    try {
      const xml = await fetchHttp(url)
      const items = xml.split('<item>').slice(1)
      
      let totalAmt = 0, totalCnt = 0

      for (const item of items) {
        const auctPlaceNm = extract('auctPlaceNm', item)
        const avgAmt = parseFloat(extract('avgAmt', item)) || 0
        const auctCnt = parseFloat(extract('auctCnt', item)) || 0
        if (auctPlaceNm.includes('제주')) continue
        if (avgAmt === 0 || auctCnt === 0) continue
        totalAmt += avgAmt * auctCnt
        totalCnt += auctCnt
      }

      if (totalCnt > 0) {
        const avgPrice = Math.round(totalAmt / totalCnt)
        const displayDate = `${yyyymmdd.slice(0,4)}-${yyyymmdd.slice(4,6)}-${yyyymmdd.slice(6,8)}`
        return res.status(200).json({ price: avgPrice, date: displayDate, count: totalCnt, unit: '원/kg' })
      }
    } catch (e) {
      continue
    }
  }

  res.status(200).json({ price: null, date: null, message: '데이터 없음' })
}
