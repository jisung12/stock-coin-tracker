// 탭 전환
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    tab.classList.add('active');
    document.getElementById(tab.dataset.tab).classList.add('active');
  });
});

// 코인 시세 가져오기 (CoinGecko API - 무료, 키 불필요)
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

    // 업데이트 시간 표시
    document.querySelector('.last-update').textContent =
      `마지막 업데이트: ${new Date().toLocaleTimeString('ko-KR')}`;

  } catch (error) {
    cryptoList.innerHTML = `<div class="notice"><p>데이터를 불러올 수 없습니다</p><p>${error.message}</p></div>`;
  }
}

// 새로고침 버튼
document.getElementById('refresh-crypto').addEventListener('click', fetchCryptoPrices);

// 초기 로드
fetchCryptoPrices();

// 30초마다 자동 새로고침
setInterval(fetchCryptoPrices, 30000);
