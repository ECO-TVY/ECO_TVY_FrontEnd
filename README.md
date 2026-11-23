# ECO_TVY FrontEnd

사진 한 장으로 쓰레기 종류를 분류하고, 등록한 주소 기준으로 **배출 요일·방법·가까운 배출 장소**를 알려주는 웹앱입니다.
Vue 3 + Vite + Vuetify 3. 백엔드는 `../ECO_TVY_Dashboard`(Spring Boot)입니다.

## 시작하기

```sh
cp .env.example .env   # API 주소, 카카오 JS 키 설정
npm install
npm run dev            # http://localhost:5173
```

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 (`dist/`, 서비스 워커 포함) |
| `npm run preview` | 빌드 결과 미리보기 |
| `npm run lint` | ESLint (자동 수정) |
| `npm run format` | Prettier |

### 환경 변수

| 이름 | 설명 |
|---|---|
| `VITE_API_BASE_URL` | 백엔드 주소. 기본 `http://localhost:8083` |
| `VITE_KAKAO_JS_KEY` | 카카오 지도 JavaScript 키. 없으면 주소 좌표 변환 대신 "현재 위치로 설정"을 안내하고, 배출 장소는 지도 없이 목록만 보여줍니다. 카카오 콘솔의 Web 플랫폼에 개발 주소를 등록해야 합니다. |

## 폴더 구조

```
src/
  api/          axios 인스턴스(http.js), 사용자 API(endpoints.js), 관리자 API(admin.js)
  components/
    common/     CardHeader, EmptyState, ErrorState, AddressPicker, RankedBars
    dashboard/  대시보드 카드 (분류, 프로필, 기록, 배출 장소, 통계)
    history/    기록 목록 항목, 기록 상세 시트
    waste/      배출 상태 배너, 배출 방법, 오분류 신고 (분류 결과·기록 상세 공용)
    admin/      관리자 탭 패널
  composables/  useNotify(전역 알림), useThemePreference(라이트/다크)
  constants/    쓰레기 종류, 신뢰도 기준값
  stores/       auth(로그인), pendingPhoto(하단 [촬영] → 분류 카드 전달)
  utils/        format(날짜·퍼센트), schedule(배출 요일 해석), address(우편번호·카카오)
  views/        화면 단위 (라우트)
build/
  mdiIcons.js   아이콘 자동 등록 Vite 플러그인 (아래 참고)
```

## 개발 규칙

### 색은 테마 토큰으로
`plugins/vuetify.js`에 라이트/다크 토큰이 정의돼 있습니다. 팔레트 이름(`green-darken-2`)이나 hex 대신 토큰을 쓰세요.

- 템플릿: `color="primary"`, `class="bg-surface-container"`, `color="warning"`
- CSS: `rgb(var(--v-theme-primary))`, `rgba(var(--v-theme-on-surface), 0.04)`
- 옅은 배경 + 진한 글자 조합은 `primary-container` / `on-primary-container` (info, warning도 같은 형태)

이렇게 하면 다크 모드가 자동으로 따라옵니다. 대비 기준(WCAG AA)은 토큰 값에 맞춰 두었습니다.

### 아이콘은 이름만 쓰면 됨
`<v-icon icon="mdi-recycle" />`처럼 [Material Design Icons](https://pictogrammers.com/library/mdi/) 이름을 그대로 쓰세요.
`build/mdiIcons.js`가 코드에서 쓰인 이름만 모아 `src/plugins/icons.generated.js`(자동 생성, git 제외)를 만들고 SVG로 번들합니다.
아이콘 폰트 전체(약 1MB)를 내려받지 않습니다. 없는 이름을 쓰면 빌드가 실패하고, 개발 서버에서는 경고가 뜹니다.

- 아이콘 이름은 문자열 리터럴로 쓰세요. `` `mdi-${name}` ``처럼 조합하면 찾지 못합니다.

### 알림, 빈 상태, 오류
- 알림: `import { notify } from '@/composables/useNotify'` → `notify('저장했습니다.', { type: 'success' })`
- 카드 안의 빈 상태: `EmptyState`. 오류: `ErrorState`. 오류에는 가능하면 `@retry`를 연결하세요.

### 배출 요일 형식
"오늘 배출 가능" 판단(`utils/schedule.js`)은 `월·수·금`, `월~금`, `매일`, `평일`, `주말` 형식과 `18:00 ~ 24:00`, `20:00 ~ 06:00` 같은 시간을 해석합니다.
해석할 수 없는 표현(예: "격주 화요일")은 판단하지 않고 원문만 보여줍니다.

## 배포 (PWA)

`npm run build` 결과물에는 웹 앱 매니페스트와 서비스 워커(`sw.js`)가 포함되어 홈 화면에 설치할 수 있습니다.

- 정적 파일(앱 화면)만 캐시하고 **API 응답은 캐시하지 않습니다.**
- Spring Boot가 `dist`를 함께 서빙하는 경우 `/api`, `/swagger`, `/v3/api-docs`, `/actuator`, `/oauth2` 경로로의 페이지 이동은 서비스 워커가 가로채지 않습니다. 다른 서버 경로가 생기면 `vite.config.js`의 `navigateFallbackDenylist`에 추가하세요.
- 새 버전을 배포하면 다음 방문 때 자동으로 업데이트됩니다.

## 브라우저 지원

최신 Chrome, Safari(iOS 포함), Edge, Firefox. 카메라 촬영과 현재 위치는 HTTPS(또는 localhost)에서만 동작합니다.
