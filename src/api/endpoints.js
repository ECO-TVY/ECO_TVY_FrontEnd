import http from './http'

/** 백엔드 ApiResponse<T>에서 data만 꺼낸다 */
const unwrap = (res) => res.data.data

export const fetchMe = () => http.get('/api/users/me').then(unwrap)

export const fetchHistory = (page = 0, size = 20) =>
  http.get('/api/history', { params: { page, size } }).then(unwrap)

export const fetchDisposalPoints = (latitude, longitude, radiusKm = 2) =>
  http.get('/api/location/disposal-points', { params: { latitude, longitude, radiusKm } }).then(unwrap)

/**
 * @param {File} file
 * @param {{ onUploadProgress?: (ratio: number) => void, signal?: AbortSignal }} [options]
 *   onUploadProgress: 0~1 업로드 진행률 (서버 처리 시간은 포함 안 됨)
 *   signal: 취소용 AbortController.signal
 */
export function classifyWaste(file, { onUploadProgress, signal } = {}) {
  const form = new FormData()
  form.append('image', file)
  // AI 서버 + S3 업로드를 거치므로 기본 타임아웃보다 길게
  return http
    .post('/api/waste/classify', form, {
      timeout: 60000,
      signal,
      onUploadProgress: onUploadProgress
        ? (e) => e.total && onUploadProgress(e.loaded / e.total)
        : undefined
    })
    .then(unwrap)
}

export const reportMisclassification = (id, correctType) =>
  http.post(`/api/history/${id}/report`, null, { params: { correctType } }).then(unwrap)

export const updateProfile = ({ nickname, address, detailAddress }) =>
  http.put('/api/users/me/profile', { nickname, address, detailAddress }).then(unwrap)

export const updateLocation = (latitude, longitude) =>
  http.put('/api/users/me/location', null, { params: { latitude, longitude } })

// 비밀번호 재설정 (로그인 전)
export const requestPasswordReset = (email) =>
  http.post('/api/users/password-reset/request', { email }).then((res) => res.data.message)
export const confirmPasswordReset = (token, newPassword) =>
  http.post('/api/users/password-reset/confirm', { token, newPassword }).then(unwrap)
