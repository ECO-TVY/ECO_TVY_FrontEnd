import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import http from '@/api/http'

const STORAGE_KEY = 'ecotvy.auth'

function loadSaved() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (saved?.token && saved.expiresAt > Date.now()) return saved
  } catch {
    // 저장값이 깨졌거나 storage 접근 불가 → 로그아웃 상태로 시작
  }
  return null
}

export const useAuthStore = defineStore('auth', () => {
  const saved = loadSaved()
  const token = ref(saved?.token ?? null)
  const expiresAt = ref(saved?.expiresAt ?? 0)
  const user = ref(saved?.user ?? null)

  const isAuthenticated = computed(() => !!token.value && expiresAt.value > Date.now())
  const isAdmin = computed(() => user.value?.role === 'ADMIN')

  function persist() {
    try {
      if (token.value) {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ token: token.value, expiresAt: expiresAt.value, user: user.value })
        )
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
    } catch {
      // storage 차단 환경: 메모리에서만 유지
    }
  }

  // 관리자가 만든 계정의 초기 비밀번호 → 바꾸기 전까지 다른 화면으로 못 가게 (서버도 3006으로 막음)
  const mustChangePassword = computed(() => user.value?.mustChangePassword === true)

  /** 로그인·비밀번호 변경 응답(LoginResponse)으로 세션 갱신 */
  function applySession({ accessToken, expiresIn, user: nextUser }) {
    token.value = accessToken
    expiresAt.value = Date.now() + expiresIn * 1000
    user.value = nextUser
    persist()
  }

  async function login(email, password) {
    const { data } = await http.post('/api/users/login', { email, password })
    applySession(data.data)
  }

  /** 비밀번호 변경 → 서버가 새 토큰을 주므로 세션을 교체 (기존 토큰의 '변경 필요' 표시도 사라짐) */
  async function changePassword(currentPassword, newPassword) {
    const { data } = await http.put('/api/users/me/password', { currentPassword, newPassword })
    applySession(data.data)
  }

  /** 서버가 3006(비밀번호 변경 필요)으로 막았을 때 화면 상태도 맞춘다 */
  function markPasswordChangeRequired() {
    if (user.value && !user.value.mustChangePassword) {
      user.value = { ...user.value, mustChangePassword: true }
      persist()
    }
  }

  /** /api/users/me 등으로 받은 최신 사용자 정보 반영 (닉네임·레벨 등) */
  function setUser(nextUser) {
    user.value = nextUser
    persist()
  }

  function logout() {
    token.value = null
    expiresAt.value = 0
    user.value = null
    persist()
  }

  return {
    token,
    user,
    isAuthenticated,
    isAdmin,
    mustChangePassword,
    login,
    logout,
    setUser,
    changePassword,
    markPasswordChangeRequired
  }
})
