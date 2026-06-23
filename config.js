// 한국투자증권 API 설정
// API 키 발급 후 아래 값들을 채워주세요
const CONFIG = {
  // 한국투자증권 API (https://apiportal.koreainvestment.com)
  KIS: {
    APP_KEY: '',      // 앱 키
    APP_SECRET: '',   // 앱 시크릿
    // 실전: https://openapi.koreainvestment.com:9443
    // 모의: https://openapivts.koreainvestment.com:29443
    BASE_URL: 'https://openapi.koreainvestment.com:9443',
  },

  // 관심 종목 (종목코드)
  WATCHLIST: [
    { code: '005930', name: '삼성전자' },
    { code: '000660', name: 'SK하이닉스' },
    { code: '035420', name: 'NAVER' },
    { code: '035720', name: '카카오' },
    { code: '051910', name: 'LG화학' },
    { code: '006400', name: '삼성SDI' },
    { code: '003670', name: '포스코퓨처엠' },
    { code: '005380', name: '현대차' },
    { code: '000270', name: '기아' },
    { code: '068270', name: '셀트리온' },
  ]
};
