import axios from 'axios'

/**
 * 백엔드(Spring Boot) API 클라이언트.
 * 주소는 .env의 VITE_API_BASE_URL로 바꿀 수 있다.
 */
const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8083',
  timeout: 15000
})

/**
 * 토큰 첨부 / 401 처리 인터셉터 등록.
 * store·router를 직접 import하면 순환 참조가 생기므로 main.js에서 주입한다.
 */
export function setupInterceptors(authStore, router) {
  http.interceptors.request.use((config) => {
    if (authStore.token) {
      config.headers.Authorization = `Bearer ${authStore.token}`
    }
    return config
  })

  http.interceptors.response.use(
    (response) => response,
    (error) => {
      const status = error.response?.status
      const isLoginRequest = error.config?.url?.includes('/api/users/login')

      // 토큰 만료/위조 → 로그아웃 후 로그인 화면으로 (로그인 요청 자체의 401은 화면에서 처리)
      if (status === 401 && !isLoginRequest && authStore.token) {
        authStore.logout()
        const current = router.currentRoute.value
        if (current.name !== 'login') {
          router.push({ name: 'login', query: { redirect: current.fullPath } })
        }
      }
      // 초기 비밀번호 미변경(3006) → 변경 화면으로 (화면 상태가 서버와 어긋난 경우 대비)
      if (status === 403 && error.response?.data?.errorCode === '3006') {
        authStore.markPasswordChangeRequired()
        if (router.currentRoute.value.name !== 'change-password') {
          router.push({ name: 'change-password' })
        }
      }
      return Promise.reject(error)
    }
  )
}

/** 백엔드 ApiResponse 에러를 화면에 보여줄 문장으로 변환 */
export function toErrorMessage(error) {
  if (!error.response) {
    return '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'
  }
  const { errorCode, message } = error.response.data || {}
  // 코드별 고정 문구. 여기 없는 코드(1000 입력값 오류, 6002, 9000 등)는 서버가 보낸 구체적 메시지를 그대로 보여준다
  const messages = {
    3001: '이미 가입된 이메일입니다.',
    3002: '올바른 이메일 형식이 아닙니다.',
    3003: '비밀번호는 영문과 숫자를 포함해 8자 이상이어야 합니다.',
    2000: '로그인이 필요합니다.',
    2002: '로그인 정보가 유효하지 않습니다. 다시 로그인해 주세요.',
    2003: '로그인이 만료되었습니다. 다시 로그인해 주세요.',
    2004: '이메일 또는 비밀번호가 올바르지 않습니다.'
  }
  return messages[errorCode] || message || '요청을 처리하지 못했습니다.'
}

export default http
