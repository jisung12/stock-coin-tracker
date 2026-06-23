// Alpha Vantage API Key
const ALPHA_API_KEY = 'N00513KH6IL4U3BX';

// 6시간 슬롯: 0시, 6시, 12시, 18시
const SLOTS = [0, 6, 12, 18];

function getCurrentSlot(hour) {
  for (let i = SLOTS.length - 1; i >= 0; i--) {
    if (hour >= SLOTS[i]) return SLOTS[i];
  }
  return 0;
}

function getKSTHour() {
  // 한국 시간 기준
  const now = new Date();
  const kst = new Date(now.getTime() + (9 * 60 * 60 * 1000));
  return kst.getUTCHours();
}

function getKSTDate() {
  const now = new Date();
  const kst = new Date(now.getTime() + (9 * 60 * 60 * 1000));
  return kst.toISOString().split('T')[0];
}

export default {
  async fetch(request, env) {
    // CORS 헤더
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const kstHour = getKSTHour();
      const kstDate = getKSTDate();
      const currentSlot = getCurrentSlot(kstHour);
      const cacheKey = `market_${kstDate}_${currentSlot}`;

      // 캐시 확인
      const cached = await env.CACHE.get(cacheKey, 'json');
      if (cached) {
        return new Response(JSON.stringify({
          success: true,
          data: cached.data,
          lastUpdate: cached.lastUpdate,
          fromCache: true
        }), { headers: corsHeaders });
      }

      // 새로 가져오기
      const data = await fetchAllData();
      const lastUpdate = new Date().toISOString();

      // KV에 저장 (6시간 TTL)
      await env.CACHE.put(cacheKey, JSON.stringify({
        data,
        lastUpdate
      }), { expirationTtl: 6 * 60 * 60 });

      return new Response(JSON.stringify({
        success: true,
        data,
        lastUpdate,
        fromCache: false
      }), { headers: corsHeaders });

    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), { status: 500, headers: corsHeaders });
    }
  }
};

async function fetchAllData() {
  const result = {
    metals: {},
    oil: {},
    indices: {}
  };

  // 귀금속 (metals.dev - 무료, 제한 없음)
  try {
    const metalRes = await fetch('https://api.metals.dev/v1/latest?api_key=demo&currency=USD&unit=toz');
    const metalData = await metalRes.json();
    if (metalData?.metals) {
      result.metals = {
        gold: metalData.metals.gold || 0,
        silver: metalData.metals.silver || 0,
        platinum: metalData.metals.platinum || 0,
        palladium: metalData.metals.palladium || 0,
        copper: metalData.metals.copper || 0,
      };
    }
  } catch (e) {
    result.metals = { gold: 0, silver: 0, platinum: 0, palladium: 0, copper: 0 };
  }

  await sleep(500);

  // WTI
  try {
    const wtiRes = await fetch(`https://www.alphavantage.co/query?function=WTI&interval=daily&apikey=${ALPHA_API_KEY}`);
    const wtiData = await wtiRes.json();
    result.oil.wti = parseFloat(wtiData?.data?.[0]?.value) || 0;
  } catch (e) {
    result.oil.wti = 0;
  }

  await sleep(1500);

  // Brent
  try {
    const brentRes = await fetch(`https://www.alphavantage.co/query?function=BRENT&interval=daily&apikey=${ALPHA_API_KEY}`);
    const brentData = await brentRes.json();
    result.oil.brent = parseFloat(brentData?.data?.[0]?.value) || 0;
  } catch (e) {
    result.oil.brent = 0;
  }

  await sleep(1500);

  // SPY (S&P 500)
  try {
    const spyRes = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=SPY&apikey=${ALPHA_API_KEY}`);
    const spyData = await spyRes.json();
    const quote = spyData?.['Global Quote'];
    result.indices.spy = {
      price: parseFloat(quote?.['05. price']) || 0,
      change: parseFloat(quote?.['10. change percent']?.replace('%', '')) || 0
    };
  } catch (e) {
    result.indices.spy = { price: 0, change: 0 };
  }

  await sleep(1500);

  // QQQ (NASDAQ)
  try {
    const qqqRes = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=QQQ&apikey=${ALPHA_API_KEY}`);
    const qqqData = await qqqRes.json();
    const quote = qqqData?.['Global Quote'];
    result.indices.qqq = {
      price: parseFloat(quote?.['05. price']) || 0,
      change: parseFloat(quote?.['10. change percent']?.replace('%', '')) || 0
    };
  } catch (e) {
    result.indices.qqq = { price: 0, change: 0 };
  }

  await sleep(1500);

  // DIA (Dow Jones)
  try {
    const diaRes = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=DIA&apikey=${ALPHA_API_KEY}`);
    const diaData = await diaRes.json();
    const quote = diaData?.['Global Quote'];
    result.indices.dia = {
      price: parseFloat(quote?.['05. price']) || 0,
      change: parseFloat(quote?.['10. change percent']?.replace('%', '')) || 0
    };
  } catch (e) {
    result.indices.dia = { price: 0, change: 0 };
  }

  return result;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
