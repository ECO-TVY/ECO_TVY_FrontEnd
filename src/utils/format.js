/** 화면 공통 포맷터 */

export const percent = (v, empty = '-') => (v == null ? empty : `${Math.round(v * 100)}%`)

/** Jackson 설정에 따라 ISO 문자열 또는 [y, M, d, h, m, s] 배열로 올 수 있음 */
export function toDate(value) {
  if (!value) return null
  const date = Array.isArray(value)
    ? new Date(value[0], value[1] - 1, value[2], value[3] || 0, value[4] || 0, value[5] || 0)
    : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const dateTimeFormat = new Intl.DateTimeFormat('ko-KR', {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})
const timeFormat = new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit' })
const dayFormat = new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })

export function formatDateTime(value) {
  const d = toDate(value)
  return d ? dateTimeFormat.format(d) : ''
}

export function formatTime(value) {
  const d = toDate(value)
  return d ? timeFormat.format(d) : ''
}

/** 기록 그룹 머리글: 오늘 / 어제 / 11월 20일 (목) */
export function formatDayGroup(value, now = new Date()) {
  const d = toDate(value)
  if (!d) return '날짜 없음'
  const startOf = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diff = Math.round((startOf(now) - startOf(d)) / 86400000)
  if (diff === 0) return '오늘'
  if (diff === 1) return '어제'
  return dayFormat.format(d)
}

export function dayKey(value) {
  const d = toDate(value)
  return d ? `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}` : 'none'
}

/**
 * 배출 방법 문장을 체크리스트 항목으로 나눈다.
 * 줄바꿈·마침표·가운뎃점 기준. 나눌 수 없으면 한 항목짜리 배열.
 */
export function splitGuide(text) {
  if (!text) return []
  return text
    .split(/\n|(?<=[.!])\s+|\s*[·•]\s*/)
    .map((s) => s.trim().replace(/[.]$/, ''))
    .filter(Boolean)
}
