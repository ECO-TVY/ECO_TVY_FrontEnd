// Styles
import 'vuetify/styles'

// Vuetify
import { h } from 'vue'
import { createVuetify } from 'vuetify'
import { en, ko } from 'vuetify/locale'
import { aliases, mdi as mdiSvg } from 'vuetify/iconsets/mdi-svg'
import iconPaths from './icons.generated'

/**
 * 아이콘: 화면 코드는 icon="mdi-recycle"처럼 이름으로 쓰고, 실제로는 SVG로 그린다.
 * icons.generated.js는 build/mdiIcons.js(Vite 플러그인)가 코드에 쓰인 아이콘만 모아 만든다.
 */
const mdiByName = {
  component: (props) => {
    const path = iconPaths[props.icon]
    if (!path && import.meta.env.DEV) console.warn(`[icons] 등록되지 않은 아이콘: ${props.icon}`)
    return h(mdiSvg.component, { ...props, icon: path ?? '' })
  }
}

/**
 * 디자인 토큰. 화면에서는 'green-darken-2' 같은 팔레트 이름 대신 이 이름(primary, primary-container…)을 쓴다.
 * CSS에서는 rgb(var(--v-theme-<name>)) 로 참조.
 *
 * 대비 기준 (WCAG AA 4.5:1):
 *  - light primary #2E7D32 위 흰 글자 5.1:1
 *  - *-container 배경 위 on-*-container 글자 7:1 이상
 */
const light = {
  dark: false,
  colors: {
    primary: '#2E7D32',
    'on-primary': '#FFFFFF',
    secondary: '#00695C',
    success: '#2E7D32',
    warning: '#B45309',
    error: '#C62828',
    info: '#1565C0',
    background: '#F4F6F4',
    surface: '#FFFFFF',
    // 사진 자리표시자, 통계 타일 등 옅은 면
    'surface-container': '#EDF0ED',
    'primary-container': '#E3F1E4',
    'on-primary-container': '#1B5E20',
    'info-container': '#E3F0FC',
    'on-info-container': '#0D47A1',
    'warning-container': '#FFF1E0',
    'on-warning-container': '#8A3B00',
    // 데이터 시각화 막대 (흰 배경 대비 3:1 이상)
    'chart-1': '#388E3C'
  }
}

const dark = {
  dark: true,
  colors: {
    primary: '#81C784',
    'on-primary': '#0B3D0F',
    secondary: '#4DB6AC',
    success: '#81C784',
    warning: '#FFB74D',
    error: '#EF9A9A',
    info: '#90CAF9',
    background: '#121512',
    surface: '#1B1F1B',
    'surface-container': '#262B26',
    'primary-container': '#1F3A22',
    'on-primary-container': '#C8E6C9',
    'info-container': '#14304D',
    'on-info-container': '#BBDEFB',
    'warning-container': '#3D2A12',
    'on-warning-container': '#FFD8A8',
    'chart-1': '#66BB6A'
  }
}

export const THEME_STORAGE_KEY = 'ecotvy.theme' // 'light' | 'dark' | 'system'

function initialTheme() {
  let pref = 'system'
  try {
    pref = localStorage.getItem(THEME_STORAGE_KEY) || 'system'
  } catch {
    // storage 차단 환경 → 시스템 설정 따름
  }
  if (pref === 'light' || pref === 'dark') return pref
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default createVuetify({
  // 데이터 테이블·페이지네이션 등 컴포넌트 기본 문구를 한국어로
  locale: {
    locale: 'ko',
    fallback: 'en',
    messages: { ko, en }
  },
  theme: {
    defaultTheme: initialTheme(),
    themes: { light, dark }
  },
  icons: {
    defaultSet: 'mdi',
    aliases, // 컴포넌트 내부 아이콘($close 등)은 'svg:' 경로로 지정돼 있음
    sets: { mdi: mdiByName, svg: mdiSvg }
  },
  // 화면마다 반복하던 속성을 기본값으로
  defaults: {
    VCard: { rounded: 'lg' },
    VBtn: { class: 'text-none' }, // 영문 버튼 대문자 변환 끔 (자간은 global.css)
    VTextField: { color: 'primary' },
    VTextarea: { color: 'primary' },
    VSelect: { color: 'primary' },
    VCheckbox: { color: 'primary' },
    VSwitch: { color: 'primary' },
    VTabs: { color: 'primary' },
    VProgressLinear: { color: 'primary' },
    VProgressCircular: { color: 'primary' }
  }
})
