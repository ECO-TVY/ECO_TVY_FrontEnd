import { computed, ref } from 'vue'
import { useTheme } from 'vuetify'
import { THEME_STORAGE_KEY } from '@/plugins/vuetify'

/**
 * 화면 테마 설정: 'system'(기기 설정 따름) | 'light' | 'dark'.
 * 브라우저별 편의 설정이라 localStorage에만 저장한다.
 */
const pref = ref(readPref())
const media = typeof window !== 'undefined' ? window.matchMedia?.('(prefers-color-scheme: dark)') : null
let listening = false

function readPref() {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

export function useThemePreference() {
  const theme = useTheme()

  const apply = () => {
    const name = pref.value === 'system' ? (media?.matches ? 'dark' : 'light') : pref.value
    theme.global.name.value = name
  }

  // 시스템 설정을 따르는 동안 기기 테마가 바뀌면 즉시 반영
  if (media && !listening) {
    listening = true
    media.addEventListener?.('change', () => pref.value === 'system' && apply())
  }

  function setPref(value) {
    pref.value = value
    try {
      if (value === 'system') localStorage.removeItem(THEME_STORAGE_KEY)
      else localStorage.setItem(THEME_STORAGE_KEY, value)
    } catch {
      // 저장 실패해도 이번 세션에는 적용
    }
    apply()
  }

  const isDark = computed(() => theme.global.current.value.dark)

  return { pref, setPref, isDark }
}
