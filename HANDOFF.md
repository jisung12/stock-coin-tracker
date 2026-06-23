# 작업 인수 문서 (회사 → 집)

> 이 파일은 집 PC에서 `git pull` 후 Claude(또는 본인)가 읽고 현재 상황을 100% 파악하기 위한 핸드오프 문서다.
> 작성: 2026-06-24, 회사 PC 작업 세션. GitHub: https://github.com/jisung12/stock-coin-tracker (PUBLIC)

---

## 0. 집 Claude가 가장 먼저 알아야 할 3줄

1. 이 GitHub 레포는 한동안 **실제 배포본보다 구버전**이었다. 오늘 회사에서 라이브 프론트로 동기화 + 미장 버그 수정 + push 했다(커밋 `fc40e89`).
2. **`worker.js`(진짜 한투 버전)는 이 집 PC에만 있다.** GitHub 어느 브랜치에도 없고, 라이브에서 복구도 불가능하다. 즉 백업이 이 PC 하나뿐이다.
3. 집에서 할 일: **(1) `git pull` → (2) 로컬 worker.js에 한투 키가 하드코딩됐는지 확인 → (3) 그 결과에 따라 안전하게 커밋.** (아래 5번 체크리스트대로)

---

## 1. 전체 상황 (왜 이렇게 됐나)

- 이 프로젝트는 Cloudflare Pages(프론트) + Cloudflare Workers(`market-data-api`, API 프록시) 구조다.
- 어제(2026-06-23) 집에서 큰 작업을 했다: 미장을 한투(한국투자증권) 해외주식 API로 가져오게 만들고, 국내/미국 종목 30개씩으로 확장하고, 워커에 크론까지 걸었다.
- 그런데 그 작업을 **`wrangler deploy`(Cloudflare 배포)만 하고 `git push`(GitHub)를 안 했다.** 배포와 깃 푸시는 완전히 별개 동작이다. 그래서 라이브 사이트는 최신인데 GitHub은 구버전인 불일치가 생겼다.
- 회사에서 클론했더니 구버전(Alpha Vantage로 미장 가져오던 시절, 종목 10개)이 받아졌다. 그래서 "미장이 왜 안 나오지"를 디버깅하다 이 불일치를 발견했다.

### 버전 비교

| 항목 | GitHub 구버전(클론본) | 실제 배포본(라이브) |
|------|----------------------|---------------------|
| 미장 소스 | Alpha Vantage | **한투 해외주식 API** |
| config.js | 한투 키 칸 비어있음, 종목 10개 | 키 없음, `WATCHLIST_KR`/`WATCHLIST_US` 30개씩 |
| worker.js | Alpha Vantage 버전(구버전) | 한투 프록시 + `scheduled()` 크론 (← **이 PC에만 있음**) |
| 크론 | 없음 | **매 1분(`* * * * *`)** |

---

## 2. 오늘 회사에서 한 작업 (커밋 `fc40e89`)

1. 라이브 사이트에서 실제 프론트 4개 파일(index.html, style.css, config.js, script.js)을 내려받아 구버전 레포 파일을 교체.
2. **미장 안 나오던 버그 수정** (`script.js`의 미국주식 렌더 부분):
   - 원인: 워커 `/stocks/us`가 가격은 주는데 등락률 `change`를 `null`로 준다. 프론트가 `item.change.toFixed()`를 호출 → `TypeError` → 미장 리스트 전체 렌더가 깨져서 "데이터 불러올 수 없습니다"가 떴다.
   - 수정: 워커가 같이 주는 전일종가 `base`로 등락률을 직접 계산(`(price-base)/base*100`), 그래도 없으면 `-` 표시. null 가드 추가.
3. GitHub `main`에 push (`fc40e89`).
4. 프론트만 Cloudflare Pages에 재배포(`wrangler pages deploy`). 미장 복구 확인(브라우저로 30종목 렌더 + 등락률 정상 + 콘솔 에러 없음).

> 주의: 회사에서는 **워커는 일절 건드리지 않았다.** 레포의 worker.js는 신뢰 불가 구버전이라 손대지 않았다.

---

## 3. "어제 worker.js를 왜 커밋 안 했을까" 분석

확인된 사실:
- 이 레포는 **PUBLIC**이다.
- 라이브 `config.js`에는 한투 키가 **없다.** 즉 **한투 APP_KEY/APP_SECRET은 워커 쪽에 있다.**

→ 가장 유력한 해석: **worker.js에 한투 키가 하드코딩돼 있어서, public 레포에 올리면 실 증권계좌 키가 그대로 노출되기 때문에 일부러(혹은 무의식적으로) 푸시를 피했을 가능성이 크다.**

근거 보강: 구버전 worker.js를 보면 Alpha Vantage 키를 코드에 그대로 박아뒀다(`const ALPHA_API_KEY = '...'`). 같은 스타일이라면 한투 키도 worker.js에 하드코딩됐을 개연성이 높다. 그렇다면 public 레포에 커밋하면 안 되는 게 맞다.

**단, 이건 추정이다.** 집의 실제 worker.js가
- (A) 한투 키를 코드에 하드코딩했는지, 아니면
- (B) 이미 Cloudflare Secret(`env.KIS_APP_KEY` 식)으로 빼놨는지

를 직접 열어 확인해야 결론이 난다. → 5번 체크리스트 1단계.

---

## 4. 그래서 worker.js를 커밋해도 되나? (판단)

**결론: 커밋해야 한다(백업이 이 PC 하나뿐이라 위험). 단, 키를 코드에서 제거한 뒤에.**

worker.js 안의 키 상태에 따라 갈린다:

- **(A) 키가 하드코딩돼 있으면 → 그대로 커밋 금지.** 두 가지 안전한 방법 중 택1:
  - **권장**: 키를 Cloudflare Workers Secret으로 이전 → 코드에서는 `env.KIS_APP_KEY` 식으로 참조하도록 수정 → 재배포 → 키가 빠진 worker.js를 커밋. (백업 + 노출 없음, 둘 다 달성)
    - 방법: `wrangler secret put KIS_APP_KEY`, `wrangler secret put KIS_APP_SECRET` (값 입력) → worker.js의 하드코딩 부분을 `env.*`로 교체.
  - **차선**: GitHub 레포를 **private로 전환**한 뒤 키 포함 worker.js를 커밋. (간단하지만 한 번 커밋되면 깃 히스토리에 영구히 남으니, 나중에 public 전환 시 위험)
- **(B) 이미 `env.*`(Secret)로 빼놨으면 → 바로 커밋/푸시해도 안전.**

추가: 구버전 worker.js에 박힌 Alpha Vantage 키(`N00513KH6IL4U3BX`)는 이미 public에 노출된 상태다. 무료/저위험 키라 급하진 않지만, 신경 쓰이면 폐기/교체 고려.

---

## 5. 집에서 따라야 할 순서 (집 Claude용 체크리스트)

```
[ ] 1. git pull        # 오늘 회사 작업(fc40e89) 받기. worker.js는 내가 안 건드렸으니
                       #    이 PC의 로컬 worker.js(진짜)는 그대로 남아있을 것.
[ ] 2. 로컬 worker.js 열어서 한투 키 하드코딩 여부 확인 (3번/4번 분석 참고)
[ ] 3. (키 하드코딩이면) Cloudflare Secret으로 이전 + env 참조로 수정 + 재배포
       (이미 Secret이면 이 단계 건너뜀)
[ ] 4. worker.js + wrangler.toml(크론/triggers 포함)을 커밋 → push
       # 이때 레포의 구버전 worker.js를 진짜 버전으로 덮어쓰게 됨 (정상)
[ ] 5. scheduled() 핸들러 점검: 크론이 매 1분인데 매번 실제로 한투를 때리는지,
       아니면 내부에서 시간 게이팅하는지 확인. 한투 호출량/제한 관점에서 과한지 판단.
```

### git pull 시 충돌 가능성
- 회사에서 frontend 4개 파일만 수정/푸시했다. 이 PC가 그 4개를 그동안 또 고쳤다면 충돌날 수 있다. 그럴 땐 라이브 = 회사 버전이 최신이므로 회사 버전 기준으로 머지하면 된다(미장 버그 수정이 들어있음).
- 이 PC에 **푸시 안 된 로컬 커밋**이 있을 수도 있다(어제 커밋은 했는데 push만 안 한 경우). `git log origin/main..HEAD`로 확인.

---

## 6. 절대 금지 / 꼭 기억할 것

- **`wrangler deploy`(워커 배포)를 구버전 레포 상태에서 실행 금지.** 운영 중인 한투 워커를 구버전 Alpha Vantage 워커로 덮어써서 국장·미장 다 죽는다. 워커 배포는 반드시 이 PC의 진짜 worker.js 기준으로만.
- 프론트 배포는 `wrangler pages deploy <폴더> --project-name=stock-coin-tracker` 만 사용.
- 라이브 정보: 프론트 `stock-coin-tracker.pages.dev`, 워커 `market-data-api.jysung1210.workers.dev` (엔드포인트 `/stocks/kr`, `/stocks/us`).
- 한투는 **APP_KEY 하나로 국장+미장 둘 다** 된다(미장 = 해외주식 현재가 API, config의 `excd` NAS/NYS).
- 크론: 워커 `market-data-api`에 `* * * * *`(매 1분) 트리거가 2026-06-23 생성돼 살아있다.

---

## 7. 한 줄 요약

회사에서 미장 버그는 고쳐서 라이브·GitHub 둘 다 반영했다. 이제 집에서 할 일은 **이 PC에만 있는 진짜 worker.js를, 한투 키를 안전하게 처리한 뒤 GitHub에 백업(커밋·푸시)하는 것** 하나다.
