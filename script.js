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
  { symbol: 'BTCUSDT', name: 'Bitcoin', icon: '₿' },
  { symbol: 'ETHUSDT', name: 'Ethereum', icon: 'Ξ' },
  { symbol: 'BNBUSDT', name: 'BNB', icon: 'B' },
  { symbol: 'XRPUSDT', name: 'XRP', icon: 'X' },
  { symbol: 'SOLUSDT', name: 'Solana', icon: 'S' },
  { symbol: 'ADAUSDT', name: 'Cardano', icon: 'A' },
  { symbol: 'DOGEUSDT', name: 'Dogecoin', icon: 'D' },
  { symbol: 'TRXUSDT', name: 'TRON', icon: 'T' },
  { symbol: 'AVAXUSDT', name: 'Avalanche', icon: 'A' },
  { symbol: 'LINKUSDT', name: 'Chainlink', icon: 'L' },
  { symbol: 'TONUSDT', name: 'Toncoin', icon: 'T' },
  { symbol: 'SHIBUSDT', name: 'Shiba Inu', icon: 'S' },
  { symbol: 'DOTUSDT', name: 'Polkadot', icon: 'D' },
  { symbol: 'BCHUSDT', name: 'Bitcoin Cash', icon: 'B' },
  { symbol: 'NEARUSDT', name: 'NEAR Protocol', icon: 'N' },
  { symbol: 'LTCUSDT', name: 'Litecoin', icon: 'L' },
  { symbol: 'UNIUSDT', name: 'Uniswap', icon: 'U' },
  { symbol: 'PEPEUSDT', name: 'Pepe', icon: 'P' },
  { symbol: 'APTUSDT', name: 'Aptos', icon: 'A' },
  { symbol: 'ICPUSDT', name: 'Internet Computer', icon: 'I' },
  { symbol: 'ETCUSDT', name: 'Ethereum Classic', icon: 'E' },
  { symbol: 'XLMUSDT', name: 'Stellar', icon: 'X' },
  { symbol: 'FILUSDT', name: 'Filecoin', icon: 'F' },
  { symbol: 'ATOMUSDT', name: 'Cosmos', icon: 'A' },
  { symbol: 'ARBUSDT', name: 'Arbitrum', icon: 'A' },
  { symbol: 'IMXUSDT', name: 'Immutable', icon: 'I' },
  { symbol: 'HBARUSDT', name: 'Hedera', icon: 'H' },
  { symbol: 'OPUSDT', name: 'Optimism', icon: 'O' },
  { symbol: 'INJUSDT', name: 'Injective', icon: 'I' },
  { symbol: 'SUIUSDT', name: 'Sui', icon: 'S' },
];

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

      return `
        <div class="price-item">
          <div class="coin-info">
            <div class="stock-icon">${coin.icon}</div>
            <div>
              <div class="coin-name">${coin.name}</div>
              <div class="coin-symbol">${coin.symbol.replace('USDT', '')}</div>
            </div>
          </div>
          <div class="price-info">
            <div class="price">$${price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
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

// 새로고침 버튼
document.getElementById('refresh-crypto').addEventListener('click', fetchCryptoPrices);

// 초기 로드
fetchCryptoPrices();

// 30초마다 자동 새로고침
setInterval(fetchCryptoPrices, 30000);
