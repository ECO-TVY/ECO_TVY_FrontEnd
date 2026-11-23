import { reactive } from 'vue'

/**
 * 앱 전역 알림(스낵바). App.vue에 하나만 그리고, 어느 화면에서든 notify()로 띄운다.
 *
 *   const { notify } = useNotify()
 *   notify('저장했습니다.')
 *   notify('Lv.4 달성!', { type: 'celebrate' })
 *   notify('삭제했습니다.', { action: { label: '실행 취소', onClick: undo } })
 */
const state = reactive({
  show: false,
  text: '',
  type: 'default', // default | success | error | celebrate
  icon: '',
  timeout: 3000,
  action: null,
  key: 0
})

const ICONS = {
  success: 'mdi-check-circle-outline',
  error: 'mdi-alert-circle-outline',
  celebrate: 'mdi-party-popper'
}

export function notify(text, { type = 'default', timeout, action = null } = {}) {
  // 이미 떠 있으면 key를 바꿔 새 알림으로 교체 (타이머 재시작)
  Object.assign(state, {
    text,
    type,
    icon: ICONS[type] || '',
    timeout: timeout ?? (type === 'celebrate' ? 4500 : action ? 6000 : 3000),
    action,
    show: true,
    key: state.key + 1
  })
}

export function useNotify() {
  return { state, notify }
}
