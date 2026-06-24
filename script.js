// 탭 전환
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    tab.classList.add('active');
    document.getElementById(tab.dataset.tab).classList.add('active');

    // 주식 탭 클릭 시 시세 로드
    if (tab.dataset.tab === 'stock') {
      const activeMarket = document.querySelector('.sub-tab.active')?.dataset.market || 'kr';
      if (activeMarket === 'us') fetchUsStockPrices();
      else fetchKrStockPrices();
    }
    // 기타 탭 클릭 시 시세 로드
    if (tab.dataset.tab === 'etc') {
      fetchMetalPrices();
    }
  });
});

// ============================================
// 정렬 / 검색 상태 + 공용 헬퍼
// ============================================
let coinSort = 'default', coinQuery = '';
let stockSort = 'default', stockQuery = '';

// mode: 'default'|'up'|'down'|'price'
function sortRows(rows, mode, changeOf, priceOf) {
  const r = rows.slice();
  if (mode === 'up') r.sort((a, b) => (changeOf(b) || 0) - (changeOf(a) || 0));
  else if (mode === 'down') r.sort((a, b) => (changeOf(a) || 0) - (changeOf(b) || 0));
  else if (mode === 'price') r.sort((a, b) => (priceOf(b) || 0) - (priceOf(a) || 0));
  return r; // default: 원래 순서 유지
}

function setActiveChip(containerId, btn) {
  document.querySelectorAll('#' + containerId + ' .sort-chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
}

function renderActiveStock() {
  const market = document.querySelector('.sub-tab.active')?.dataset.market || 'kr';
  if (market === 'us') renderUsList();
  else renderKrList();
}

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

// 가격 포맷팅 (소수점 자동 조절)
function formatPrice(price, currency = 'USD') {
  if (currency === 'KRW') {
    const krwPrice = price * usdToKrw;
    if (krwPrice >= 1000) {
      return '₩' + Math.round(krwPrice).toLocaleString();
    } else if (krwPrice >= 1) {
      return '₩' + krwPrice.toFixed(2);
    } else {
      return '₩' + krwPrice.toFixed(6);
    }
  } else {
    if (price >= 1) {
      return '$' + price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
    } else if (price >= 0.0001) {
      return '$' + price.toFixed(6);
    } else {
      return '$' + price.toFixed(10);
    }
  }
}

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
  const rateEl = document.getElementById('tk-fx-price');
  if (rateEl) {
    rateEl.textContent = `₩${usdToKrw.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  }
}

// 상단 티커 칩 갱신 (비트코인/지수 공용)
// key: 'btc'|'kospi'|'kosdaq'|'sp500'|'nasdaq'|'dow', prefix: '$' 면 달러표기
function updateTickerChip(key, price, change, prefix) {
  const priceEl = document.getElementById(`tk-${key}-price`);
  const chgEl = document.getElementById(`tk-${key}-chg`);
  if (priceEl && price != null && !isNaN(price)) {
    priceEl.textContent = prefix === '$'
      ? `$${Math.round(price).toLocaleString()}`
      : price.toLocaleString(undefined, {maximumFractionDigits: 2});
  }
  if (chgEl && typeof change === 'number' && !isNaN(change)) {
    chgEl.textContent = `${change >= 0 ? '▲' : '▼'}${Math.abs(change).toFixed(2)}%`;
    chgEl.className = 'chip-chg ' + (change >= 0 ? 'up' : 'down');
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

let lastCoinData = null;
function renderCryptoList(data) {
  if (data) lastCoinData = data;
  else data = lastCoinData;
  if (!data) return;

  const cryptoList = document.getElementById('crypto-list');

  // 심볼 순서대로 매핑
  const priceMap = {};
  data.forEach(item => {
    priceMap[item.symbol] = item;
  });

  // 상단 티커: 비트코인 (필터/정렬과 무관하게 항상 갱신)
  const btc = priceMap['BTCUSDT'];
  if (btc) updateTickerChip('btc', parseFloat(btc.lastPrice), parseFloat(btc.priceChangePercent), '$');

  // 검색 + 정렬
  let rows = COIN_LIST.map(coin => ({ coin, ticker: priceMap[coin.symbol] })).filter(r => r.ticker);
  const q = coinQuery.trim().toLowerCase();
  if (q) {
    rows = rows.filter(r =>
      r.coin.name.toLowerCase().includes(q) ||
      r.coin.symbol.toLowerCase().includes(q)
    );
  }
  rows = sortRows(rows, coinSort,
    r => parseFloat(r.ticker.priceChangePercent),
    r => parseFloat(r.ticker.lastPrice)
  );

  cryptoList.innerHTML = rows.map(({ coin, ticker }) => {
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
          <div class="price">${formatPrice(price, 'KRW')}</div>
          <div class="price-usd">${formatPrice(price, 'USD')}</div>
          <div class="change ${change >= 0 ? 'up' : 'down'}">
            ${change >= 0 ? '+' : ''}${change.toFixed(2)}%
          </div>
        </div>
      </div>
    `;
  }).join('') || '<div class="notice"><p>검색 결과 없음</p></div>';

  document.querySelector('.last-update').textContent =
    `업데이트: ${new Date().toLocaleTimeString('ko-KR')}`;
}

// ============================================
// 주식 시세 (Cloudflare Worker → 한국투자증권 API)
// ============================================

// 서브탭 전환
document.querySelectorAll('.sub-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.sub-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const market = btn.dataset.market;
    const krList = document.getElementById('stock-kr-list');
    const usList = document.getElementById('stock-us-list');

    if (market === 'kr') {
      krList.style.display = '';
      usList.style.display = 'none';
      document.getElementById('stock-info-text').textContent = '코스피 상위 30 · 한국투자증권 API';
      fetchKrStockPrices();
    } else {
      krList.style.display = 'none';
      usList.style.display = '';
      document.getElementById('stock-info-text').textContent = 'S&P 500 상위 30 · 한국투자증권 API';
      fetchUsStockPrices();
    }
  });
});

let lastKrData = null;
async function fetchKrStockPrices() {
  const list = document.getElementById('stock-kr-list');
  list.innerHTML = '<div class="loading">로딩 중...</div>';

  try {
    const res = await fetch(`${WORKER_URL}/stocks/kr`);
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'API 오류');
    lastKrData = result;
    renderKrList();
  } catch (error) {
    list.innerHTML = `<div class="notice"><p>데이터를 불러올 수 없습니다</p><p style="font-size:0.85rem;color:#666">${error.message}</p></div>`;
  }
}

function renderKrList() {
  if (!lastKrData) return;
  const list = document.getElementById('stock-kr-list');

  const priceMap = {};
  lastKrData.data.forEach(item => { priceMap[item.code] = item; });

  let rows = CONFIG.WATCHLIST_KR.map(stock => ({ stock, item: priceMap[stock.code] }));
  const q = stockQuery.trim().toLowerCase();
  if (q) rows = rows.filter(r => r.stock.name.toLowerCase().includes(q) || r.stock.code.includes(q));
  rows = sortRows(rows, stockSort,
    r => (r.item && r.item.success && typeof r.item.change === 'number') ? r.item.change : null,
    r => (r.item && r.item.success) ? r.item.price : null
  );

  list.innerHTML = rows.map(({ stock, item }) => {
    if (!item?.success) return `
        <div class="price-item">
          <div class="coin-info">
            <div><div class="coin-name">${stock.name}</div><div class="coin-symbol">${stock.code}</div></div>
          </div>
          <div class="price-info"><div class="price" style="color:#888">조회 불가</div></div>
        </div>`;
    return `
        <div class="price-item">
          <div class="coin-info">
            <div><div class="coin-name">${stock.name}</div><div class="coin-symbol">${stock.code}</div></div>
          </div>
          <div class="price-info">
            <div class="price">₩${item.price.toLocaleString()}</div>
            <div class="change ${item.change >= 0 ? 'up' : 'down'}">${item.change >= 0 ? '+' : ''}${item.change.toFixed(2)}%</div>
          </div>
        </div>`;
  }).join('') || '<div class="notice"><p>검색 결과 없음</p></div>';

  if (lastKrData.lastUpdate) {
    document.getElementById('stock-last-update').textContent = `업데이트: ${new Date(lastKrData.lastUpdate).toLocaleTimeString('ko-KR')}`;
  }
}

let lastUsData = null;
async function fetchUsStockPrices() {
  const list = document.getElementById('stock-us-list');
  list.innerHTML = '<div class="loading">로딩 중...</div>';

  try {
    const res = await fetch(`${WORKER_URL}/stocks/us`);
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'API 오류');
    lastUsData = result;
    renderUsList();
  } catch (error) {
    list.innerHTML = `<div class="notice"><p>데이터를 불러올 수 없습니다</p><p style="font-size:0.85rem;color:#666">${error.message}</p></div>`;
  }
}

// 미장 등락률: Worker가 change를 안 주면(null) 전일종가(base)로 직접 계산
function usChange(item) {
  if (typeof item.change === 'number') return item.change;
  return item.base ? (item.price - item.base) / item.base * 100 : null;
}

function renderUsList() {
  if (!lastUsData) return;
  const list = document.getElementById('stock-us-list');

  const priceMap = {};
  lastUsData.data.forEach(item => { priceMap[item.symb] = item; });

  let rows = CONFIG.WATCHLIST_US.map(stock => ({ stock, item: priceMap[stock.symb] }));
  const q = stockQuery.trim().toLowerCase();
  if (q) rows = rows.filter(r => r.stock.name.toLowerCase().includes(q) || r.stock.symb.toLowerCase().includes(q));
  rows = sortRows(rows, stockSort,
    r => (r.item && r.item.success) ? usChange(r.item) : null,
    r => (r.item && r.item.success) ? r.item.price : null
  );

  list.innerHTML = rows.map(({ stock, item }) => {
    if (!item?.success) return `
        <div class="price-item">
          <div class="coin-info">
            <div><div class="coin-name">${stock.name}</div><div class="coin-symbol">${stock.symb}</div></div>
          </div>
          <div class="price-info"><div class="price" style="color:#888">조회 불가</div></div>
        </div>`;
    const chg = usChange(item);
    const chgHtml = (chg === null)
      ? '<div class="change">-</div>'
      : `<div class="change ${chg >= 0 ? 'up' : 'down'}">${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%</div>`;
    return `
        <div class="price-item">
          <div class="coin-info">
            <div><div class="coin-name">${stock.name}</div><div class="coin-symbol">${stock.symb}</div></div>
          </div>
          <div class="price-info">
            <div class="price">$${item.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            <div class="price-usd">₩${Math.round(item.price * usdToKrw).toLocaleString()}</div>
            ${chgHtml}
          </div>
        </div>`;
  }).join('') || '<div class="notice"><p>검색 결과 없음</p></div>';

  if (lastUsData.lastUpdate) {
    document.getElementById('stock-last-update').textContent = `업데이트: ${new Date(lastUsData.lastUpdate).toLocaleTimeString('ko-KR')}`;
  }
}

// ============================================
// 기타 (Cloudflare Worker에서 가져오기)
// ============================================
const WORKER_URL = 'https://market-data-api.jysung1210.workers.dev';

async function fetchMetalPrices() {
  const etcList = document.getElementById('etc-list');
  etcList.innerHTML = '<div class="loading">로딩 중...</div>';

  try {
    const response = await fetch(WORKER_URL);
    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'API 오류');
    }

    const { data, lastUpdate } = result;
    let html = '';

    // 1. 유가
    if (data.oil?.wti > 0) {
      html += `
        <div class="price-item">
          <div class="coin-info">
            <div class="stock-icon oil-icon">🛢️</div>
            <div>
              <div class="coin-name">WTI 원유</div>
              <div class="coin-symbol">배럴당</div>
            </div>
          </div>
          <div class="price-info">
            <div class="price">₩${Math.round(data.oil.wti * usdToKrw).toLocaleString()}</div>
            <div class="price-usd">$${data.oil.wti.toFixed(2)}/barrel</div>
          </div>
        </div>
      `;
    }
    if (data.oil?.brent > 0) {
      html += `
        <div class="price-item">
          <div class="coin-info">
            <div class="stock-icon oil-icon">🛢️</div>
            <div>
              <div class="coin-name">Brent 원유</div>
              <div class="coin-symbol">배럴당</div>
            </div>
          </div>
          <div class="price-info">
            <div class="price">₩${Math.round(data.oil.brent * usdToKrw).toLocaleString()}</div>
            <div class="price-usd">$${data.oil.brent.toFixed(2)}/barrel</div>
          </div>
        </div>
      `;
    }

    // 3. 미국 지수
    const indices = [
      { key: 'spy', name: 'S&P 500', emoji: '📊' },
      { key: 'qqq', name: 'NASDAQ 100', emoji: '💻' },
      { key: 'dia', name: 'Dow Jones', emoji: '🏭' },
    ];

    indices.forEach(idx => {
      const indexData = data.indices?.[idx.key];
      if (indexData?.price > 0) {
        html += `
          <div class="price-item">
            <div class="coin-info">
              <div class="stock-icon index-icon">${idx.emoji}</div>
              <div>
                <div class="coin-name">${idx.name}</div>
                <div class="coin-symbol">${idx.key.toUpperCase()} ETF</div>
              </div>
            </div>
            <div class="price-info">
              <div class="price">$${indexData.price.toFixed(2)}</div>
              <div class="change ${indexData.change >= 0 ? 'up' : 'down'}">
                ${indexData.change >= 0 ? '+' : ''}${indexData.change.toFixed(2)}%
              </div>
            </div>
          </div>
        `;
      }
    });

    etcList.innerHTML = html || '<div class="notice"><p>데이터를 불러올 수 없습니다</p></div>';

    // 업데이트 시간 표시
    const updateEl = document.querySelector('.last-update-etc');
    if (updateEl && lastUpdate) {
      const updateDate = new Date(lastUpdate);
      updateEl.textContent = `업데이트: ${updateDate.toLocaleString('ko-KR')}`;
    }

  } catch (error) {
    console.log('기타 데이터 조회 실패:', error);
    etcList.innerHTML = `
      <div class="notice">
        <p>데이터를 불러올 수 없습니다</p>
        <p style="font-size: 0.85rem; color: #666;">${error.message}</p>
      </div>
    `;
  }
}

// ============================================
// 정렬 / 검색 컨트롤 연결
// ============================================
(function setupSortSearch() {
  const coinSearch = document.getElementById('coin-search');
  if (coinSearch) coinSearch.addEventListener('input', e => { coinQuery = e.target.value; renderCryptoList(); });
  const coinSortEl = document.getElementById('coin-sort');
  if (coinSortEl) coinSortEl.addEventListener('click', e => {
    const btn = e.target.closest('.sort-chip'); if (!btn) return;
    coinSort = btn.dataset.sort; setActiveChip('coin-sort', btn); renderCryptoList();
  });

  const stockSearch = document.getElementById('stock-search');
  if (stockSearch) stockSearch.addEventListener('input', e => { stockQuery = e.target.value; renderActiveStock(); });
  const stockSortEl = document.getElementById('stock-sort');
  if (stockSortEl) stockSortEl.addEventListener('click', e => {
    const btn = e.target.closest('.sort-chip'); if (!btn) return;
    stockSort = btn.dataset.sort; setActiveChip('stock-sort', btn); renderActiveStock();
  });
})();

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

    document.getElementById('detail-price').textContent = formatPrice(price, 'KRW');

    const changeEl = document.getElementById('detail-change');
    changeEl.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
    changeEl.className = `detail-change ${change >= 0 ? 'up' : 'down'}`;

    document.getElementById('stat-high').textContent = formatPrice(high, 'KRW');
    document.getElementById('stat-low').textContent = formatPrice(low, 'KRW');
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
    crosshair: {
      mode: 0, // Normal mode - 마우스 자유롭게 따라다님
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
    '1w': { interval: '1w', limit: 52 },      // 주봉 52개 (1년)
    '1M': { interval: '1M', limit: 36 },      // 월봉 36개 (3년)
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

    // 가격에 따라 소수점 자릿수 결정
    const price = chartData[0]?.close || 1;
    let precision, minMove;
    if (price >= 1000) {
      precision = 2; minMove = 0.01;
    } else if (price >= 1) {
      precision = 4; minMove = 0.0001;
    } else if (price >= 0.001) {
      precision = 6; minMove = 0.000001;
    } else {
      precision = 8; minMove = 0.00000001;
    }

    candleSeries.applyOptions({
      priceFormat: { type: 'price', precision, minMove }
    });

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
