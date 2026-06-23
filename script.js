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

// 코인 아이콘 URL (CryptoFont - 최신 코인 지원)
function getCoinIcon(symbol) {
  const coin = symbol.replace('USDT', '').toLowerCase();
  return `https://cryptofonts.com/img/icons/${coin}.svg`;
}

// 코인 아이콘 URL (fallback)
function getCoinIconFallback(symbol) {
  const coin = symbol.replace('USDT', '').toLowerCase();
  return `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons/svg/color/${coin}.svg`;
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

// 캐시 설정 (5초 내 재요청 방지)
const CACHE_DURATION = 5000;

async function fetchCryptoPrices() {
  const cryptoList = document.getElementById('crypto-list');

  // 캐시 확인
  const cached = localStorage.getItem('cryptoCache');
  const cacheTime = localStorage.getItem('cryptoCacheTime');

  if (cached && cacheTime && (Date.now() - parseInt(cacheTime)) < CACHE_DURATION) {
    // 캐시 사용
    renderCryptoList(JSON.parse(cached));
    return;
  }

  try {
    // 모든 코인 시세 한번에 가져오기
    const symbols = COIN_LIST.map(c => `"${c.symbol}"`).join(',');
    const response = await fetch(
      `https://api.binance.com/api/v3/ticker/24hr?symbols=[${symbols}]`
    );

    if (!response.ok) throw new Error('API 요청 실패');

    const data = await response.json();

    // 캐시 저장
    localStorage.setItem('cryptoCache', JSON.stringify(data));
    localStorage.setItem('cryptoCacheTime', Date.now().toString());

    renderCryptoList(data);

  } catch (error) {
    document.getElementById('crypto-list').innerHTML = `
      <div class="notice">
        <p>⚠️ 데이터를 불러올 수 없습니다</p>
        <p style="font-size: 0.85rem; color: #666;">${error.message}</p>
      </div>
    `;
  }
}

function renderCryptoList(data) {
  const cryptoList = document.getElementById('crypto-list');

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
      <div class="price-item" onclick="showDetail('${coin.symbol}', '${coin.name}')">
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
    `업데이트: ${new Date().toLocaleTimeString('ko-KR')}`;
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

// 초기 로드
(async () => {
  await fetchExchangeRate();
  fetchCryptoPrices();
})();

// 30초마다 코인 시세 새로고침
setInterval(fetchCryptoPrices, 30000);

// 1시간마다 환율 새로고침
setInterval(fetchExchangeRate, 60 * 60 * 1000);

// ============================================
// 상세 페이지 (차트)
// ============================================
let chart = null;
let candleSeries = null;
let currentSymbol = null;
let currentPeriod = '4h';

// 상세 페이지 표시
async function showDetail(symbol, name) {
  currentSymbol = symbol;
  const coinSymbol = symbol.replace('USDT', '');

  // 화면 전환
  document.getElementById('main-view').style.display = 'none';
  document.getElementById('detail-view').style.display = 'block';

  // 코인 정보 표시
  document.getElementById('detail-icon').src = getCoinIcon(symbol);
  document.getElementById('detail-name').textContent = name;
  document.getElementById('detail-symbol').textContent = coinSymbol;

  // 현재 가격 정보 가져오기
  await updateDetailPrice(symbol);

  // 차트 생성 (DOM 렌더링 후 약간 지연)
  setTimeout(async () => {
    createChart();
    await loadChartData(currentPeriod);
  }, 50);
}

// 가격 정보 업데이트
async function updateDetailPrice(symbol) {
  try {
    const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`);
    const data = await response.json();

    const price = parseFloat(data.lastPrice);
    const change = parseFloat(data.priceChangePercent);
    const high = parseFloat(data.highPrice);
    const low = parseFloat(data.lowPrice);
    const volume = parseFloat(data.quoteVolume);

    document.getElementById('detail-price').textContent = `₩${Math.round(price * usdToKrw).toLocaleString()}`;

    const changeEl = document.getElementById('detail-change');
    changeEl.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
    changeEl.className = `detail-change ${change >= 0 ? 'up' : 'down'}`;

    document.getElementById('stat-high').textContent = `₩${Math.round(high * usdToKrw).toLocaleString()}`;
    document.getElementById('stat-low').textContent = `₩${Math.round(low * usdToKrw).toLocaleString()}`;
    document.getElementById('stat-volume').textContent = `$${(volume / 1000000).toFixed(1)}M`;
  } catch (error) {
    console.error('가격 정보 조회 실패:', error);
  }
}

// 차트 생성
function createChart() {
  const container = document.getElementById('chart-container');
  container.innerHTML = '';

  // 라이브러리 체크
  if (typeof LightweightCharts === 'undefined') {
    container.innerHTML = '<p style="color:#888;text-align:center;padding:50px;">차트 로딩 실패</p>';
    return;
  }

  const width = container.clientWidth || window.innerWidth - 70;

  chart = LightweightCharts.createChart(container, {
    width: width,
    height: 350,
    layout: {
      background: { type: 'solid', color: 'transparent' },
      textColor: 'rgba(255, 255, 255, 0.5)',
    },
    grid: {
      vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
      horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
    },
    rightPriceScale: {
      borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    timeScale: {
      borderColor: 'rgba(255, 255, 255, 0.1)',
      timeVisible: true,
    },
    localization: {
      dateFormat: 'yyyy-MM-dd',
    },
  });

  candleSeries = chart.addCandlestickSeries({
    upColor: '#00ff88',
    downColor: '#ff4757',
    borderUpColor: '#00ff88',
    borderDownColor: '#ff4757',
    wickUpColor: '#00ff88',
    wickDownColor: '#ff4757',
  });

  // 반응형
  window.addEventListener('resize', () => {
    if (chart && container.clientWidth > 0) {
      chart.applyOptions({ width: container.clientWidth });
    }
  });
}

// 차트 데이터 로드
async function loadChartData(period) {
  if (!currentSymbol) return;

  // 봉 단위별 설정
  const settings = {
    '15m': { interval: '15m', limit: 96 },    // 15분봉 96개
    '1h': { interval: '1h', limit: 72 },      // 1시간봉 72개 (3일)
    '4h': { interval: '4h', limit: 90 },      // 4시간봉 90개 (15일)
    '1d': { interval: '1d', limit: 60 },      // 일봉 60개 (2달)
  };

  const { interval, limit } = settings[period];

  try {
    const response = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=${currentSymbol}&interval=${interval}&limit=${limit}`
    );
    const data = await response.json();

    const chartData = data.map(candle => ({
      time: candle[0] / 1000,
      open: parseFloat(candle[1]),
      high: parseFloat(candle[2]),
      low: parseFloat(candle[3]),
      close: parseFloat(candle[4]),
    }));

    candleSeries.setData(chartData);
    chart.timeScale().fitContent();
  } catch (error) {
    console.error('차트 데이터 로드 실패:', error);
  }
}

// 뒤로가기
document.getElementById('back-btn').addEventListener('click', () => {
  document.getElementById('detail-view').style.display = 'none';
  document.getElementById('main-view').style.display = 'block';

  if (chart) {
    chart.remove();
    chart = null;
  }
});

// 기간 선택
document.querySelectorAll('.chart-period').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.chart-period').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentPeriod = btn.dataset.period;
    loadChartData(currentPeriod);
  });
});
