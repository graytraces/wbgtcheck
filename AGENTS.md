# wbgtcheck — WBGT 열안전 플래너

미국 고교 코치·마칭밴드 지도자용 WBGT(습구흑구온도) 열안전 플래닝 도구. NWS 시간대별 WBGT 예보를 주(州) 협회 정책 플래그(Texas UIL Class 2/3 · Georgia GHSA · NATA 범용 폴백)로 번역해 판정 카드·타임라인·팀 단톡용 공유 카드로 보여준다. 열 축에 더해 산불철 **공기질(AQI) 게이트**가 부가 축으로 붙는다(AirNow 관측 → WA/OR/CA 협회 규정, 아래 규칙 ⑦) — 공기질은 열 깃발을 절대 완화하지 않는다. **측정기·컴플라이언스 도구가 아니라 플래닝 도구다** — 이 포지셔닝이 제품의 법적·안전 경계선이다.

- 도메인: wbgtcheck.com
- GA4: G-NL5JKVRNS1
- 레포: https://github.com/graytraces/wbgtcheck
- GSC: sc-domain 등록됨
- 판정 문서(스펙 원천): `../20260809_wbgt_research_verdict.md` · 판독 일정은 `../STATUS.md` 참조

## Tech Stack

| 영역 | 기술 |
|---|---|
| 프레임워크 | Vite 7 + React 19 + TypeScript |
| 스타일링 | Tailwind CSS v4 — 커스텀 토큰(5색 깃발 팔레트) + Anton 디스플레이 폰트(latin 서브셋 셀프호스팅) |
| 국제화 | i18next (**EN + ES만** — 아래 고유 규칙 ⑤) |
| 데이터 | NWS api.weather.gov (`/api/wbgt` 워커 프록시) + Liljegren 폴백(thermofeel 포팅) · AirNow reportingarea.dat (`/api/aqi` 워커 프록시) |
| 배포 | Cloudflare Workers (GitHub push → Workers Builds 자동 빌드/배포) |
| 분석 | Google Analytics 4 (G-NL5JKVRNS1) — 이벤트: `verdict_view` / `share_card` / `location_set` |
| 테스트 | Vitest (+ thermofeel 회귀 픽스처) |

## 폴더 구조

```
wbgtcheck/
├── scripts/prerender.mjs     # 32개 로케일 HTML + sitemap 생성 (policyData/airPolicyData 직접 import)
└── src/
    ├── App.tsx               # 라우터 (bare path → /:lang 리다이렉트)
    ├── i18n.ts               # EN + ES
    ├── seo.ts                # pageSEO 레지스트리 (path: 우선 표기 — 감사 스크립트 규약)
    ├── worker.ts             # Type A 워커 + /api/wbgt NWS 프록시(600초 캐시) + /api/aqi AirNow 프록시(3600초 캐시)
    ├── index.css             # 디자인 토큰 — 깃발 5색이 곧 디자인 시스템
    ├── data/
    │   ├── policyData.js     # ★ 열 정책 수치 단일 소스 (plain JS — prerender와 React 공유)
    │   ├── policyOracle.ts   # 타입 래퍼 + classifyWbgt/isBorderline
    │   ├── airPolicyData.js  # ★ 공기질 제2 오라클 (EPA AQI·WA·OR·CA·NFHS — 열 오라클과 격리)
    │   ├── airPolicyOracle.ts # 타입 래퍼 + classifyAirBand (오름차순 밴드 역방향 탐색)
    │   └── stateDirectory.js/.ts  # /states 주별 분류 (research/primary 검증 라벨)
    ├── lib/
    │   ├── liljegren.ts      # thermofeel Liljegren WBGT 포팅 (Apache-2.0 — NOTICE 참조)
    │   ├── solar.ts          # NOAA 태양위치 + Kasten-Czeplak 운량 감쇠 (추정 경로 전용)
    │   └── guidelineSentences.js  # 지침 문장 조립 (prerender·React 공유)
    ├── utils/                # nws(시계열 확장·추정 폴백) · airnow(reportingarea.dat 파서) · verdict · geocode · shareCard · flagStyles · analytics
    ├── hooks/                # useWbgt(위치·정책·페치 상태머신) · useAirQuality(관측 staleness 추적) · useTheme
    ├── components/           # VerdictCard · TodayTimeline · WeekStrip · PolicyBandsTable · AirQualityGate · AirDataSources · ShareCardButton …
    ├── pages/                # Home · 주별 가이드 8종(TX·GA·SC·TN·IA·NC·NY·VA) · 공기질 3종(WA·OR·CA) · WbgtVsHeatIndex · States · PrivacyPolicy · Disclaimer
    ├── test/fixtures/        # thermofeel 회귀 CSV (입력 50케이스 + 기대값)
    └── locales/              # en.json · es.json (구조 패리티 테스트 가드)
```

## 주요 명령어

```bash
npm run dev      # 개발 서버 — 워커 없이 NWS 직접 호출 (dev 전용 폴백)
npm run build    # tsc + vite build + prerender (32 HTML + sitemap)
npm test         # tsc --noEmit + vitest (18파일 218테스트)
npm run preview  # 빌드 결과 미리보기
```

## VALID_TOOLS Slug / 라우트

`src/utils/routeValidation.ts`에 정의. 새 페이지 추가 시 반드시 slug 등록 — Worker가 `isValidPath()`로 pre-validation하므로 누락 시 Googlebot 포함 모든 요청에 404.

| 경로 | 설명 |
|------|------|
| `/` | Accept-Language 감지 → `/:lang` 302 (Worker) |
| `/api/wbgt?lat=&lon=` | NWS points→gridpoint 프록시 (Worker 전용 — 페이지 아님) |
| `/api/aqi?lat=&lon=` | AirNow reportingarea.dat 프록시 (Worker 전용 — 시간당 갱신 원본을 엣지 캐시, 클라이언트에 2 MB 원본 미전송) |
| `/:lang` | Home — 판정 카드 + 타임라인 + 주간 뷰 + 공유 카드 |
| `/:lang/texas` | UIL 가이드 (Class 2/3 임계값 표 · 측정 규칙 · 앱 허용 인용) |
| `/:lang/georgia` | GHSA 가이드 (기기 전용 경고 · By-law 2.67 표) |
| `/:lang/south-carolina` | SCHSL 가이드 (기기 의무 · 15분 range-hold · 임계값 표) |
| `/:lang/tennessee` | TSSAA 가이드 (WBGT/열지수 택일 · 앱은 열지수 한정 · 양쪽 표) |
| `/:lang/iowa` | Iowa 가이드 (Category 2 표 · **권고**이지 의무 아님 · 마칭밴드 분기) |
| `/:lang/north-carolina` | NCHSAA 가이드 (2025-26 핸드북 2컬럼 차트 · 기기 측정 · 도구 연동 제외 고지) |
| `/:lang/new-york` | NYSPHSAA 가이드 (**열지수** 사다리 — WBGT 아님 · 앱+ZIP 명시) |
| `/:lang/virginia` | Virginia 주법 가이드 (임계값 없음 — 교육구가 정함 · 얼음 80°F) |
| `/:lang/wbgt-vs-heat-index` | WBGT/습구/열지수 구분 교육 페이지 |
| `/:lang/washington-air-quality` | WA DOH 334-332 공기질 가이드 (지속시간 3열 × 4밴드 · 2026-05 개정판) |
| `/:lang/oregon-air-quality` | OSAA 공기질 가이드 (밴드별 조치 + 가시거리 폴백 표) |
| `/:lang/california-air-quality` | CIF Bylaw 503.K(2) 가이드 (AQI 단일 임계값) |
| `/:lang/states` | 주별 3분류 표 (앱 허용/기기 전용/미확인) + 주별 가이드 링크 허브 |
| `/:lang/privacy` · `/:lang/disclaimer` | 법적 페이지 (sitemap 제외) |

lang은 `en`·`es` 2종. 라우트 추가 시 아래 "새 페이지 추가 체크리스트"를 따를 것.

## 이 레포 고유 규칙 (가장 중요 — 위반 시 안전·법적 리스크)

### ① 정책 수치 오라클 — `src/data/policyData.js` 단일 소스 (열 축)
- 모든 임계값·활동 수정 지침 수치는 **`policyData.js`에만** 존재한다. 각 블록에 1차 출처 URL + 확인일 주석 필수 (UIL 차트 · GHSA By-law 2.67 · NATA 2015 Table 5 · SCHSL 2024-04 · TSSAA 2024-10 · Iowa 합동 가이드 · NCHSAA 2025-26 핸드북 · NYSPHSAA 2023-05 · Va. Code §22.1-271.10, 전부 2026-08-09 검증).
- **최신성 조항**: `verifiedOn`은 "그날 읽음"이 아니라 **"그날 그 문서가 협회 현행 정본임을 확인함"**을 뜻한다. 재검증 때는 수치 대조 전에 문서 자체가 대체되지 않았는지(신판 핸드북·개정판 발행)부터 확인할 것 — NC는 2015년 폐기 문서를 인용한 채 4곳이 완화 방향으로 틀려 있었다(2026-08 리뷰 게이트에서 적발, 현행 핸드북으로 재구축). 시즌 전(매년 5월) 전체 출처 블록 순회 재검증이 README 백로그에 있다.
- **로케일 JSON에 임계값 숫자 리터럴 금지** — 카피는 `{{보간}}`으로만 수치를 받는다. `oracleCopy.test.ts`가 숫자 리터럴 존재 자체를 실패시킨다. 원문 인용에 수치가 있으면 인용문 자체를 상수화할 것 (`SCHSL_TOP_BOUNDARY_TEXT_QUOTE`가 그 예).
- plain JS인 이유: `scripts/prerender.mjs`와 React가 **동일 객체**를 import해 prerender↔post-JS DOM 드리프트를 구조적으로 차단 (위키 prerender-wrs-prosewipe 패턴).
- 새 주(州) 임계값은 협회 1차 문서를 fetch해 검증하기 전에는 **절대 추가 금지**. `verified: 'primary'` 행(TX·GA·SC·TN·IA·NC·NY·VA)만 수치를 실을 수 있고, 나머지는 research 분류 + "협회 확인 필요" 뱃지가 강제된다.
- **모든 주가 이 사이트의 5색 깃발 모델에 맞지는 않는다.** NC는 임계값 계열(80/85/88/90)도 다르고 자체 색코드 이름이 이 사이트 깃발과 의미가 충돌하며, NY는 애초에 열지수 척도다. 둘은 `POLICIES`에서 **의도적으로 제외**되어 자체 표로만 렌더된다 — `policyOracle.test.ts`가 이 제외를 핀으로 고정한다. 맞지 않는 주를 억지로 `classifyWbgt`에 넣지 말 것.
- 출처가 아무 말도 하지 않는 구간에 "정상 활동"을 지어내지 말 것. TSSAA green 밴드처럼 `extraKeys: ['guideline.notAddressedBelow']`로 침묵을 명시한다.
- PDF가 Type3 subset 폰트를 쓰면 텍스트 추출이 조용히 틀린 글자를 낸다(TSSAA가 그렇다). 그 경우 pymupdf로 페이지를 PNG 렌더해 **눈으로 읽고** 수치를 옮길 것.

### ② 안전 카피 불변식
- **"safe to practice" 류 단정 표현 금지** — 항상 "플래그 + 지침 + 현장 확인" 구조. 테스트가 문구 존재를 가드한다.
- 깃발은 **색 + 아이콘 + 텍스트 라벨 3중 표기** (`FlagBadge`/`flagStyles`) — 공유 카드 캔버스 포함. 색만으로 의미 전달 금지 (색각 안전).
- 보수 편향 고지(원격 추정 −1~−3 °C 저평가, Grundstein)와 "현장 확인" 문구는 판정 카드·공유 카드에 **상시** 노출. 수치는 `REMOTE_UNDERESTIMATE_MIN_C/MAX_C`에서 보간.
- GHSA류 기기 전용 주(`remoteEstimatesAllowed: 'device-required'`)에서는 "이 사이트는 컴플라이언스 수단이 아님" 경고가 판정 카드와 공유 카드에 자동 표기된다 — 이 분기를 제거하지 말 것.

### ③ Liljegren 포팅 — thermofeel (Apache-2.0) 유래
- `src/lib/liljegren.ts`는 ecmwf/thermofeel의 스칼라 포팅. 루트 `NOTICE` 파일을 유지할 것.
- 수정 시 `liljegren.test.ts`의 thermofeel 50케이스 회귀 픽스처(허용 오차 1e-4 K, 실측 5.7e-14 K)를 반드시 통과해야 한다. 연산 순서 변경도 회귀 대상.
- 추정 경로 산출물은 UI에서 **ESTIMATED 뱃지 필수** (`HourPoint.source === 'estimated'`).

### ④ NWS 호출은 워커 프록시(`/api/wbgt`) 경유
- 프로덕션 클라이언트가 api.weather.gov를 직접 호출하지 않는다 — NWS User-Agent 정책 준수 + 600초 엣지 캐시가 워커에 있다. `npm run dev`의 직접 호출은 dev 전용 폴백(`useWbgt.ts` 주석 참조).

### ⑤ EN + ES만 — 16로케일 매트릭스 의도적 미적용
- 미국 시장 제품이라 포트폴리오 표준 16개 언어를 **의도적으로** 적용하지 않았다. 무단 확장 금지 — 로케일 추가는 콘텐츠 전략 결정이지 기계 번역 작업이 아니다. `i18nParity.test.ts`가 EN↔ES 구조·플레이스홀더 패리티를 가드한다.

### ⑥ wrangler.jsonc `routes`로 커스텀 도메인 선언 (포트폴리오 예외)
- 다른 사이트들과 달리 대시보드 연결이 아니라 `wrangler.jsonc`의 `routes: [{ pattern, custom_domain: true }]`로 apex+www를 선언한다. Workers Builds가 배포 시 도메인을 함께 관리하므로 설정이 레포에 버전닝된다 — **대시보드에서 도메인을 중복 연결하지 말 것**.

### ⑦ 공기질(AQI) 축 — `src/data/airPolicyData.js` 제2 오라클, 열 축과 구조적 격리
- 공기질 수치·인용의 단일 소스는 `airPolicyData.js` (EPA AQI TAD · WA DOH 334-332 2026-05 개정판 · OSAA 핸드북 · CIF Bylaw 503.K(2) · NFHS SMAC 성명). 규칙 ①의 오라클 규칙(1차 출처 · 확인일 · 로케일 숫자 리터럴 금지 · 최신성 조항)이 그대로 적용된다.
- **열 오라클과 격리**: `airPolicyData.js`는 `policyData.js`를 import하거나 산술 결합할 수 없다 — `airQualityGate.test`의 구조 가드가 소스 파일을 직접 읽어 강제한다. 공기질 게이트는 **부가적(additive)** — 어떤 경우에도 열 깃발을 완화하지 않는다.
- EPA AQI 6색 RGB는 TAD Table 1-2의 **규정 색상**이다 — 사이트 디자인 토큰으로 재스타일 금지. `classifyAirBand`는 오름차순 밴드를 역방향 탐색한다(`classifyWbgt`와 반대 방향 — 혼용 주의).
- WA는 지속시간 축(15분-1시간 / 1-4시간 / 4시간 초과) 3열 표: `DEFAULT_ACTIVITY_ID = 'medium'`은 안전 핀 — 더 관대한 열이 기본값이 되도록 바꾸지 말 것(테스트가 고정).
- 관측 시각은 상시 표기하고 `AIR_OBSERVATION_STALE_MINUTES`(90분) 초과 시 경고한다 — 이 분기를 제거하지 말 것. 관측이 PM2.5가 아닌 폴백 지표면 별도 고지가 뜬다.

## 배포

- git push → Cloudflare Workers Builds 자동 빌드/배포 (별도 deploy 명령 없음)
- push 전 로컬 검증 필수: `npm run build && npm test`
- 라이브 검증은 Playwright(post-JS DOM) — React SPA라 curl/WebFetch로는 빈 body만 보임 (위키 live-verify)

### 새 페이지 추가 체크리스트
1. `src/pages/NewPage.tsx` 생성 — `<SEO pageKey="..." />` 포함
2. `src/utils/routeValidation.ts` `VALID_TOOLS`(또는 `VALID_PAGES`)에 slug 추가
3. `src/seo.ts` `pageSEO`에 등록 (`path:` 우선 표기 유지)
4. `src/App.tsx` 라우터에 lazy 경로 추가
5. `scripts/prerender.mjs` `pages` 배열 + body 생성 분기 추가 (React와 동일 키·동일 데이터로)
6. `src/locales/en.json` + `es.json` 두 로케일 모두 추가 (패리티 테스트가 누락을 잡음)
7. `npm test` — seoRegistration/i18nParity/pagesRender 가드 통과 확인

## Anti-Patterns

- **JSON-LD `aggregateRating` 절대 금지** (포트폴리오 공통 — Manual Action 직행). `seoRegistration.test.ts`가 가드.
- FAQPage 스키마는 실제 FAQ UI가 렌더될 때만 — 현재 이 레포는 FAQ UI가 없어 의도적으로 미적용.
- Cloudflare CI 빌드 실패 방지: 패키지 추가 시 `package-lock.json` 동반 커밋, 테스트 파일에 미사용 변수 금지(`noUnusedLocals`).
- 공유 카드 캔버스에 투명 픽셀 남기지 말 것 — `drawShareCard`는 흰색 베이스 도색으로 시작한다(채팅 클라이언트 테마 비침 방지).

## 백로그 · 참조 문서

- 의도적 보류 항목(로케일 lazy-load · manifest i18n · black 깃발 글리프 · 데스크톱 2컬럼 · i18next 경량화): `README.md`의 "Backlog" 절 — 리스크 주석 없이 집어들지 말 것.
- 리뷰 게이트 백로그(KY 재시도 · SCHSL/NYSPHSAA 판본 확인 · TSSAA 2026-27 재확인 · CIF 열 규정 PDF 판독 불가 · **2027-05 시즌 전 출처 최신성 재검증**): `README.md`의 "AQI axis follow-ups" 절 끝의 2026-08-09 리뷰 게이트 기록.
- 제품 판정·주별 정책 테이블·리스크의 정본: `../20260809_wbgt_research_verdict.md`
- GSC 재측정·운영 판독 일정: `../STATUS.md`

## 📚 공유 LLM 위키 (작업 전 확인)
포트폴리오 공통 지식(패턴·gotcha·playbook·과거 결정)은 공유 위키에 정본(canonical)이 있다. 작업 전 관련 토픽을 먼저 확인할 것.
- 위치: `../analytics-collector/dev-env/wiki/` (진입점 `README.md`)
- 핵심 페이지: prerender-wrs-prosewipe(★prose-wipe) · i18n-locale · seo-deindex-recovery · gsc-pipeline-measurement · worker-build-standards · content-policy · live-verify · agent-workflow-gotchas
- 새 발견은 이 repo에 기록하고, 여러 프로젝트에 일반화되면 해당 위키 페이지로 승격한다.
