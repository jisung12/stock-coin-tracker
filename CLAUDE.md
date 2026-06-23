# MARKET WATCH - 실시간 시세 웹사이트

## 프로젝트 정보
- **GitHub**: https://github.com/jisung12/stock-coin-tracker
- **사이트**: https://stock-coin-tracker.pages.dev
- **Worker API**: https://market-data-api.jysung1210.workers.dev

---

## 현재 완료된 것

### 1. 코인 탭
- Binance API로 시총 상위 30개 코인 실시간 시세
- 30초마다 자동 갱신
- 클릭 시 상세 페이지 (TradingView 차트, 15m/1H/4H/1D/1W/1M 봉)
- 5초 로컬스토리지 캐시 (새로고침 스팸 방지)

### 2. 주식 탭
- 한국투자증권 API 연동 준비됨
- `config.js`에 APP_KEY, APP_SECRET 입력하면 작동
- 관심 종목 10개 하드코딩됨

### 3. 기타 탭
- Cloudflare Worker + KV로 6시간 단위 캐싱 (00, 06, 12, 18시)
- **유가**: WTI, Brent (Alpha Vantage)
- **미국 지수**: S&P 500(SPY), NASDAQ 100(QQQ), Dow Jones(DIA) - ETF 기준
- Alpha Vantage API 키: `N00513KH6IL4U3BX` (하루 25회 제한)

### 4. 환율
- exchangerate.fun API (1시간마다 갱신)
- 상단에 USD/KRW 표시

---

## 파일 구조

```
stock-coin-tracker/
├── index.html          # 메인 HTML
├── style.css           # 스타일
├── script.js           # 프론트엔드 로직
├── config.js           # API 키 설정 (한투)
├── worker.js           # Cloudflare Worker (기타 탭 API)
├── wrangler.toml       # Worker 설정
└── CLAUDE.md           # 이 파일
```

---

## 배포 방법

```bash
# 프론트엔드 (Cloudflare Pages)
npx wrangler pages deploy . --project-name=stock-coin-tracker

# Worker API
npx wrangler deploy
```

---

## 다음 할 일

1. **한국투자증권 API 연동**
   - 윈도우에서 계좌 개설 후 API 키 발급
   - `config.js`에 키 입력

2. **귀금속(금/은) 추가** (선택)
   - metals.dev 키 만료됨
   - 다른 무료 API 찾아서 Worker에 추가 필요

---

## 기술 스택

- **프론트**: Vanilla JS, CSS (Glassmorphism)
- **코인 API**: Binance
- **주식 API**: 한국투자증권
- **기타 API**: Alpha Vantage (Worker에서 호출)
- **차트**: TradingView Lightweight Charts
- **호스팅**: Cloudflare Pages + Workers + KV

---

## 참고

- Alpha Vantage 하루 25회 제한 → 6시간 캐싱으로 최대 20회/일 사용
- 환율은 exchangerate.fun에서 1시간 단위로 가져옴
- 코인 아이콘: CryptoFont (메인) + cryptocurrency-icons (폴백)
