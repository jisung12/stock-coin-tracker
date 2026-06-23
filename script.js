// 탭 전환
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    tab.classList.add('active');
    document.getElementById(tab.dataset.tab).classList.add('active');

    // 주식 탭 클릭 시 시세 로드
    if (tab.dataset.tab === 'stock') {
      fetchStockPrices();
    }
  });
});

// ============================================
// 코인 시세 (Binance API)
// ============================================
// 시총 상위 30개 (스테이블코인 제외, Binance 기준)
const COIN_LIST = [
  { symbol: 'BTCUSDT', name: 'Bitcoin' },
  { symbol: 'ETHUSDT', name: 'Ethereum' },
  { symbol: 'BNBUSDT', name: 'BNB' },
  { symbol: 'XRPUSDT', name: 'XRP' },
  { symbol: 'SOLUSDT', name: 'Solana' },
  { symbol: 'ADAUSDT', name: 'Cardano' },
  { symbol: 'DOGEUSDT', name: 'Dogecoin' },
  { symbol: 'TRXUSDT', name: 'TRON' },
  { symbol: 'AVAXUSDT', name: 'Avalanche' },
  { symbol: 'LINKUSDT', name: 'Chainlink' },
  { symbol: 'TONUSDT', name: 'Toncoin' },
  { symbol: 'SHIBUSDT', name: 'Shiba Inu' },
  { symbol: 'DOTUSDT', name: 'Polkadot' },
  { symbol: 'BCHUSDT', name: 'Bitcoin Cash' },
  { symbol: 'NEARUSDT', name: 'NEAR Protocol' },
  { symbol: 'LTCUSDT', name: 'Litecoin' },
  { symbol: 'UNIUSDT', name: 'Uniswap' },
  { symbol: 'PEPEUSDT', name: 'Pepe' },
  { symbol: 'APTUSDT', name: 'Aptos' },
  { symbol: 'ICPUSDT', name: 'Internet Computer' },
  { symbol: 'ETCUSDT', name: 'Ethereum Classic' },
  { symbol: 'XLMUSDT', name: 'Stellar' },
  { symbol: 'FILUSDT', name: 'Filecoin' },
  { symbol: 'ATOMUSDT', name: 'Cosmos' },
  { symbol: 'ARBUSDT', name: 'Arbitrum' },
  { symbol: 'IMXUSDT', name: 'Immutable' },
  { symbol: 'HBARUSDT', name: 'Hedera' },
  { symbol: 'OPUSDT', name: 'Optimism' },
  { symbol: 'INJUSDT', name: 'Injective' },
  { symbol: 'SUIUSDT', name: 'Sui' },
];

// 코인 아이콘 URL (primary)
function getCoinIcon(symbol) {
  const coin = symbol.replace('USDT', '').toLowerCase();
  return `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons/svg/color/${coin}.svg`;
}

// 코인 아이콘 URL (fallback)
function getCoinIconFallback(symbol) {
  const coin = symbol.replace('USDT', '').toLowerCase();
  return `https://cryptofonts.com/img/icons/${coin}.svg`;
}

// 환율 (USD → KRW)
let usdToKrw = 1400; // 기본값

async function fetchExchangeRate() {
  try {
    const response = await fetch('https://api.exchangerate.fun/latest?base=USD');
    const data = await response.json();
    usdToKrw = data.rates.KRW;
    updateRateDisplay();
  } catch (error) {
    console.log('환율 조회 실패, 기본값 사용');
    updateRateDisplay();
  }
}

function updateRateDisplay() {
  const rateEl = document.getElementById('current-rate');
  if (rateEl) {
    rateEl.textContent = `₩${usdToKrw.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  }
}

async function fetchCryptoPrices() {
  const cryptoList = document.getElementById('crypto-list');

  try {
    // 모든 코인 시세 한번에 가져오기
    const symbols = COIN_LIST.map(c => `"${c.symbol}"`).join(',');
    const response = await fetch(
      `https://api.binance.com/api/v3/ticker/24hr?symbols=[${symbols}]`
    );

    if (!response.ok) throw new Error('API 요청 실패');

    const data = await response.json();

    // 심볼 순서대로 매핑
    const priceMap = {};
    data.forEach(item => {
      priceMap[item.symbol] = item;
    });

    cryptoList.innerHTML = COIN_LIST.map(coin => {
      const ticker = priceMap[coin.symbol];
      if (!ticker) return '';

      const price = parseFloat(ticker.lastPrice);
      const change = parseFloat(ticker.priceChangePercent);

      const coinSymbol = coin.symbol.replace('USDT', '');
      const fallbackUrl = getCoinIconFallback(coin.symbol);
      return `
        <div class="price-item">
          <div class="coin-info">
            <img src="${getCoinIcon(coin.symbol)}" alt="${coinSymbol}" class="coin-icon" onerror="this.onerror=null; this.src='${fallbackUrl}'; this.onerror=function(){this.style.display='none'; this.nextElementSibling.style.display='flex';}">
            <div class="stock-icon fallback-icon" style="display:none">${coin.name.charAt(0)}</div>
            <div>
              <div class="coin-name">${coin.name}</div>
              <div class="coin-symbol">${coinSymbol}</div>
            </div>
          </div>
          <div class="price-info">
            <div class="price">₩${Math.round(price * usdToKrw).toLocaleString()}</div>
            <div class="price-usd">$${price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            <div class="change ${change >= 0 ? 'up' : 'down'}">
              ${change >= 0 ? '+' : ''}${change.toFixed(2)}%
            </div>
          </div>
        </div>
      `;
    }).join('');

    document.querySelector('.last-update').textContent =
      `마지막 업데이트: ${new Date().toLocaleTimeString('ko-KR')}`;

  } catch (error) {
    cryptoList.innerHTML = `
      <div class="notice">
        <p>⚠️ 데이터를 불러올 수 없습니다</p>
        <p style="font-size: 0.85rem; color: #666;">${error.message}</p>
      </div>
    `;
  }
}

// ============================================
// 주식 시세 (한국투자증권 API)
// ============================================
let kisToken = null;
let kisTokenExpiry = null;

// 토큰 발급
async function getKisToken() {
  // 이미 유효한 토큰이 있으면 재사용
  if (kisToken && kisTokenExpiry && new Date() < kisTokenExpiry) {
    return kisToken;
  }

  const response = await fetch(`${CONFIG.KIS.BASE_URL}/oauth2/tokenP`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      appkey: CONFIG.KIS.APP_KEY,
      appsecret: CONFIG.KIS.APP_SECRET
    })
  });

  const data = await response.json();
  kisToken = data.access_token;
  // 토큰 유효기간 설정 (보통 24시간이지만 안전하게 23시간)
  kisTokenExpiry = new Date(Date.now() + 23 * 60 * 60 * 1000);

  return kisToken;
}

// 개별 종목 시세 조회
async function getStockPrice(stockCode) {
  const token = await getKisToken();

  const response = await fetch(
    `${CONFIG.KIS.BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price?` +
    `FID_COND_MRKT_DIV_CODE=J&FID_INPUT_ISCD=${stockCode}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'appkey': CONFIG.KIS.APP_KEY,
        'appsecret': CONFIG.KIS.APP_SECRET,
        'tr_id': 'FHKST01010100'
      }
    }
  );

  return response.json();
}

// 주식 시세 가져오기
async function fetchStockPrices() {
  const stockList = document.getElementById('stock-list');

  // API 키 확인
  if (!CONFIG.KIS.APP_KEY || !CONFIG.KIS.APP_SECRET) {
    stockList.innerHTML = `
      <div class="notice">
        <p>⚠️ API 키가 설정되지 않았습니다</p>
        <p>config.js 파일에 APP_KEY와 APP_SECRET을 입력해주세요</p>
        <p style="margin-top: 15px; font-size: 0.8rem; color: #555;">
          1. <a href="https://apiportal.koreainvestment.com" target="_blank" style="color: #2563eb;">한국투자증권 개발자센터</a> 가입<br>
          2. API 키 발급<br>
          3. config.js에 키 입력
        </p>
      </div>
    `;
    return;
  }

  stockList.innerHTML = '<div class="loading">로딩 중...</div>';

  try {
    const results = await Promise.all(
      CONFIG.WATCHLIST.map(async (stock) => {
        const data = await getStockPrice(stock.code);
        return { ...stock, data: data.output };
      })
    );

    stockList.innerHTML = results.map(stock => {
      const price = parseInt(stock.data.stck_prpr);
      const change = parseFloat(stock.data.prdy_ctrt);

      return `
        <div class="price-item">
          <div class="coin-info">
            <div class="stock-icon">${stock.name.charAt(0)}</div>
            <div>
              <div class="coin-name">${stock.name}</div>
              <div class="coin-symbol">${stock.code}</div>
            </div>
          </div>
          <div class="price-info">
            <div class="price">₩${price.toLocaleString()}</div>
            <div class="change ${change >= 0 ? 'up' : 'down'}">
              ${change >= 0 ? '+' : ''}${change.toFixed(2)}%
            </div>
          </div>
        </div>
      `;
    }).join('');

  } catch (error) {
    stockList.innerHTML = `
      <div class="notice">
        <p>데이터를 불러올 수 없습니다</p>
        <p>${error.message}</p>
      </div>
    `;
  }
}

// 새로고침 버튼 (3초 쿨다운)
let lastRefresh = 0;
const COOLDOWN = 3000; // 3초

document.getElementById('refresh-crypto').addEventListener('click', () => {
  const now = Date.now();
  if (now - lastRefresh < COOLDOWN) {
    const remaining = Math.ceil((COOLDOWN - (now - lastRefresh)) / 1000);
    return; // 쿨다운 중이면 무시
  }
  lastRefresh = now;
  fetchCryptoPrices();
});

// 초기 로드
(async () => {
  await fetchExchangeRate();
  fetchCryptoPrices();
})();

// 30초마다 코인 시세 새로고침
setInterval(fetchCryptoPrices, 30000);

// 1시간마다 환율 새로고침
setInterval(fetchExchangeRate, 60 * 60 * 1000);
