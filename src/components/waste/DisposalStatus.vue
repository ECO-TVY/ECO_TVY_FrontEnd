<template>
  <!-- "지금 버려도 되나?"를 맨 먼저 답한다. 해석 불가한 규정은 원문만 보여준다 -->
  <div class="status" :class="`status--${status.kind}`" role="status">
    <v-icon :icon="meta.icon" class="status-icon" size="24" />
    <div class="min-w-0">
      <div class="text-subtitle-1 font-weight-bold">{{ status.title }}</div>
      <div v-if="subline" class="text-body-2 status-sub">{{ subline }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { disposalStatus } from '@/utils/schedule'

const props = defineProps({
  day: { type: String, default: '' },
  time: { type: String, default: '' }
})

const status = computed(() => disposalStatus(props.day, props.time))

const META = {
  now: { icon: 'mdi-check-circle' },
  today: { icon: 'mdi-clock-outline' },
  later: { icon: 'mdi-calendar-arrow-right' },
  unknown: { icon: 'mdi-calendar-clock' }
}
const meta = computed(() => META[status.value.kind])

// 판단 결과 아래에 원래 규정 문구를 같이 보여줘 근거를 확인할 수 있게
const subline = computed(() => {
  const s = status.value
  if (s.kind === 'unknown') return s.detail
  const rule = [props.day, props.time].filter(Boolean).join(' · ')
  // detail이 시간 원문과 같으면 규정에 이미 들어 있으므로 중복 표시하지 않는다
  const detail = props.time && s.detail === props.time ? '' : s.detail
  return [detail, rule ? `규정: ${rule}` : ''].filter(Boolean).join(' · ')
})
</script>

<style scoped>
.status {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid transparent;
}
.status-icon {
  margin-top: 1px;
  flex-shrink: 0;
}
.status-sub {
  opacity: 0.85;
}
.min-w-0 {
  min-width: 0;
}
/* 테마 토큰: *-container 배경 + on-*-container 글자 (대비 7:1 이상, 다크 모드 대응) */
.status--now {
  background: rgb(var(--v-theme-primary-container));
  color: rgb(var(--v-theme-on-primary-container));
  border-color: rgba(var(--v-theme-primary), 0.25);
}
.status--today {
  background: rgb(var(--v-theme-info-container));
  color: rgb(var(--v-theme-on-info-container));
  border-color: rgba(var(--v-theme-info), 0.25);
}
.status--later,
.status--unknown {
  background: rgb(var(--v-theme-surface-container));
  color: rgb(var(--v-theme-on-surface));
  border-color: rgba(var(--v-border-color), var(--v-border-opacity));
}
</style>
