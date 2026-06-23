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
// 코인 시세 (CoinGecko API)
// ============================================
async function fetchCryptoPrices() {
  const cryptoList = document.getElementById('crypto-list');

  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets?' +
      'vs_currency=krw&order=market_cap_desc&per_page=10&sparkline=false'
    );

    if (!response.ok) throw new Error('API 요청 실패');

    const data = await response.json();

    cryptoList.innerHTML = data.map(coin => `
      <div class="price-item">
        <div class="coin-info">
          <img src="${coin.image}" alt="${coin.name}" class="coin-icon">
          <div>
            <div class="coin-name">${coin.name}</div>
            <div class="coin-symbol">${coin.symbol}</div>
          </div>
        </div>
        <div class="price-info">
          <div class="price">₩${coin.current_price.toLocaleString()}</div>
          <div class="change ${coin.price_change_percentage_24h >= 0 ? 'up' : 'down'}">
            ${coin.price_change_percentage_24h >= 0 ? '+' : ''}${coin.price_change_percentage_24h.toFixed(2)}%
          </div>
        </div>
      </div>
    `).join('');

    document.querySelector('.last-update').textContent =
      `마지막 업데이트: ${new Date().toLocaleTimeString('ko-KR')}`;

  } catch (error) {
    cryptoList.innerHTML = `<div class="notice"><p>데이터를 불러올 수 없습니다</p><p>${error.message}</p></div>`;
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
