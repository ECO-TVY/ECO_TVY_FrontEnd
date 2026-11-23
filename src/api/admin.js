import http from './http'

/** 관리자 API (/api/admin/** — 백엔드에서 ROLE_ADMIN만 허용) */
const unwrap = (res) => res.data.data

export const fetchAdminDashboard = () => http.get('/api/admin/dashboard').then(unwrap)

// 오분류 검수
export const fetchPendingReports = () => http.get('/api/admin/misclassifications').then(unwrap)
export const approveReport = (id, addToTrainingData) =>
  http.post(`/api/admin/misclassifications/${id}/approve`, null, { params: { addToTrainingData } })
export const rejectReport = (id, reason) =>
  http.post(`/api/admin/misclassifications/${id}/reject`, null, { params: { reason } })

// 지역별 배출 규정
export const fetchLocationRules = ({ city, district, dong }) =>
  http.get('/api/admin/location-rules', { params: { city, district, dong } }).then(unwrap)
export const createLocationRule = (rule) => http.post('/api/admin/location-rules', rule).then(unwrap)
export const updateLocationRule = (id, rule) =>
  http.put(`/api/admin/location-rules/${id}`, rule).then(unwrap)
export const deleteLocationRule = (id) => http.delete(`/api/admin/location-rules/${id}`)

// 학습 데이터
export const fetchTrainingSummary = () => http.get('/api/admin/training-data/summary').then(unwrap)
export const fetchTrainingSamples = (page = 0, size = 20) =>
  http.get('/api/admin/training-data', { params: { page, size } }).then(unwrap)
export const removeTrainingSample = (id) => http.delete(`/api/admin/training-data/${id}`)
/** 매니페스트 CSV를 Blob으로 받는다 (Authorization 헤더가 필요해 <a href> 대신 axios 사용) */
export const exportTrainingManifest = () =>
  http.get('/api/admin/training-data/export', { responseType: 'blob' }).then((res) => res.data)

// AI 모델
export const fetchAIModels = () => http.get('/api/admin/ai-models').then(unwrap)
export const registerAIModel = (model) => http.post('/api/admin/ai-models', model).then(unwrap)
export const updateAIModel = (version, model) =>
  http.put(`/api/admin/ai-models/${encodeURIComponent(version)}`, model).then(unwrap)
export const deleteAIModel = (version) => http.delete(`/api/admin/ai-models/${encodeURIComponent(version)}`)
export const activateAIModel = (version) =>
  http.post(`/api/admin/ai-models/${encodeURIComponent(version)}/activate`).then(unwrap)

// 사용자 / 관리자 계정
export const fetchAdminUsers = ({ query = '', page = 0, size = 20 } = {}) =>
  http.get('/api/admin/users', { params: { query: query || undefined, page, size } }).then(unwrap)
export const createAdminAccount = (account) => http.post('/api/admin/users', account).then(unwrap)
export const changeUserRole = (id, role) => http.patch(`/api/admin/users/${id}/role`, { role }).then(unwrap)
/** 임시 비밀번호로 초기화 → { temporaryPassword } (이 응답에서만 확인 가능) */
export const resetUserPassword = (id) => http.post(`/api/admin/users/${id}/password-reset`).then(unwrap)
