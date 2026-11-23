/**
 * 배출 요일/시간 문자열 → "지금 버려도 되나?" 판단.
 *
 * 배출 규정은 관리자가 자유 텍스트로 입력한다 (예: "월·수·금", "월~금", "매일", "18:00 ~ 24:00").
 * 확실히 해석되는 형태만 판단하고, 애매하면 null/unknown을 돌려 원문만 보여준다.
 * (오판으로 "오늘 가능"이라 안내하는 것보다 판단을 안 하는 편이 낫다)
 */

const DAY_CHARS = '일월화수목금토' // Date.getDay() 순서
const DAY_NAMES = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']

/** @returns {Set<number>|null} 요일 인덱스(0=일) 집합. 해석 불가면 null */
export function parseDisposalDays(text) {
  if (!text) return null
  let s = text.replace(/\s+/g, '').replace(/요일/g, '').replace(/매주/g, '')
  if (!s) return null

  const days = new Set()
  const addRange = (a, b) => {
    for (let i = a; ; i = (i + 1) % 7) {
      days.add(i)
      if (i === b) break
    }
  }

  // 키워드
  s = s.replace(/매일/g, () => (addRange(0, 6), ''))
  s = s.replace(/평일/g, () => (addRange(1, 5), ''))
  s = s.replace(/주말/g, () => (days.add(0), days.add(6), ''))
  // 범위: 월~금, 월-금
  s = s.replace(/([일월화수목금토])[~\-–]([일월화수목금토])/g, (_, a, b) => {
    addRange(DAY_CHARS.indexOf(a), DAY_CHARS.indexOf(b))
    return ''
  })
  // 나열: 월·수·금, 월,수,금, 월/수/금, 월수금
  s = s.replace(/[일월화수목금토]/g, (c) => (days.add(DAY_CHARS.indexOf(c)), ''))

  // 남은 문자가 구분자뿐이어야 해석 성공으로 본다
  if (s.replace(/[·,/、및]/g, '') !== '' || days.size === 0) return null
  return days
}

/** "18:00 ~ 24:00" → { start: 1080, end: 1440 } (분). 해석 불가면 null */
export function parseDisposalTime(text) {
  if (!text) return null
  const times = [...text.matchAll(/(\d{1,2})\s*[:시]\s*(\d{2})?/g)].map(
    ([, h, m]) => Number(h) * 60 + Number(m || 0)
  )
  if (!times.length || times.some((t) => t > 24 * 60)) return null
  return { start: times[0], end: times[1] ?? null }
}

// 24:00은 그대로 "24:00"으로 (자정 마감을 "00:00까지"로 보이면 혼란)
const fmtMin = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

/**
 * @returns {{ kind: 'now'|'today'|'later'|'unknown', title: string, detail: string }}
 *   now: 지금 배출 가능 / today: 오늘 이따가 / later: 다른 날 / unknown: 판단 불가
 */
export function disposalStatus(dayText, timeText, now = new Date()) {
  const days = parseDisposalDays(dayText)
  if (!days) {
    return { kind: 'unknown', title: dayText || '배출 요일 정보 없음', detail: timeText || '' }
  }
  const time = parseDisposalTime(timeText)
  const today = now.getDay()
  const minutes = now.getHours() * 60 + now.getMinutes()
  const overnight = time?.end != null && time.end <= time.start // 예: 20:00 ~ 06:00

  // 전날 시작한 야간 배출 시간대에 아직 있는 경우
  if (overnight && days.has((today + 6) % 7) && minutes < time.end) {
    return { kind: 'now', title: '지금 배출할 수 있어요', detail: `${fmtMin(time.end)}까지` }
  }

  if (days.has(today)) {
    if (!time) return { kind: 'now', title: '오늘 배출하는 날이에요', detail: timeText || '' }
    const endToday = overnight || time.end == null ? 24 * 60 : time.end
    if (minutes < time.start) {
      return { kind: 'today', title: `오늘 ${fmtMin(time.start)}부터 배출할 수 있어요`, detail: timeText }
    }
    if (minutes < endToday) {
      return {
        kind: 'now',
        title: '지금 배출할 수 있어요',
        detail: time.end != null ? `${overnight ? '내일 ' : ''}${fmtMin(time.end)}까지` : ''
      }
    }
  }

  // 다음 배출일
  for (let i = 1; i <= 7; i++) {
    const d = (today + i) % 7
    if (days.has(d)) {
      const when = i === 1 ? '내일' : `${DAY_NAMES[d]}(${i}일 후)`
      return {
        kind: 'later',
        title: `다음 배출일은 ${when}이에요`,
        detail: time ? `${fmtMin(time.start)}부터` : timeText || ''
      }
    }
  }
  return { kind: 'unknown', title: dayText, detail: timeText || '' }
}

/** 화면 표시 순서 (월요일 시작) */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]
export const DAY_SHORT = DAY_CHARS.split('') // ['일','월',…]

/**
 * 요일 인덱스 집합 → 규정 문자열. parseDisposalDays와 짝 (항상 다시 해석 가능한 형식으로 만든다)
 * {1,3,5} → '월·수·금', 전체 → '매일', 월~금 → '평일', 토·일 → '주말'
 */
export function formatDisposalDays(days) {
  const set = new Set(days)
  if (set.size === 0) return ''
  if (set.size === 7) return '매일'
  const has = (arr) => arr.length === set.size && arr.every((d) => set.has(d))
  if (has([1, 2, 3, 4, 5])) return '평일'
  if (has([0, 6])) return '주말'
  return WEEK_ORDER.filter((d) => set.has(d))
    .map((d) => DAY_CHARS[d])
    .join('·')
}
