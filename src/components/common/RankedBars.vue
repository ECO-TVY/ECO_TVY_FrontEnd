<template>
  <!-- 순위 가로 막대: 한 가지 색, 많은 순. 이름과 값을 텍스트로 함께 표시해 색에 의존하지 않음 -->
  <ul class="bars" :aria-label="ariaLabel">
    <v-tooltip
      v-for="row in computedRows"
      :key="row.key"
      location="top"
      :text="`${row.label} · ${row.count}${unit} · ${row.share}%`"
    >
      <template #activator="{ props: tip }">
        <li class="bar-row" v-bind="tip" tabindex="0">
          <span class="bar-label">
            <v-icon v-if="row.icon" :icon="row.icon" size="small" class="mr-1 text-medium-emphasis" />
            {{ row.label }}
          </span>
          <span class="bar-track">
            <span v-if="row.count > 0" class="bar-fill" :style="{ width: `${row.width}%` }" />
          </span>
          <span class="bar-value" :class="{ 'text-disabled': row.count === 0 }">{{ row.count }}</span>
        </li>
      </template>
    </v-tooltip>
  </ul>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  /** [{ key, label, icon?, count }] */
  rows: { type: Array, required: true },
  unit: { type: String, default: '' },
  ariaLabel: { type: String, default: '' }
})

const computedRows = computed(() => {
  const total = props.rows.reduce((s, r) => s + r.count, 0)
  const max = Math.max(0, ...props.rows.map((r) => r.count))
  return [...props.rows]
    .sort((a, b) => b.count - a.count)
    .map((r) => ({
      ...r,
      share: total ? Math.round((r.count / total) * 100) : 0,
      width: max ? (r.count / max) * 100 : 0
    }))
})
</script>

<style scoped>
.bars {
  list-style: none;
  padding: 0;
  margin: 0;
}
.bar-row {
  display: grid;
  grid-template-columns: 104px 1fr 40px;
  align-items: center;
  gap: 12px;
  /* 행 전체가 hover 영역 → 얇은 막대보다 넓은 hit target */
  padding: 7px 4px;
  border-radius: 6px;
  cursor: default;
}
.bar-row:hover,
.bar-row:focus-visible {
  background: rgba(var(--v-theme-on-surface), 0.04);
  outline: none;
}
.bar-label {
  font-size: 0.875rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.bar-track {
  height: 12px;
  display: block;
}
.bar-fill {
  display: block;
  height: 100%;
  min-width: 4px;
  background: rgb(var(--v-theme-chart-1)); /* 테마 토큰: 배경 대비 3:1 이상 (light/dark 각각) */
  /* 기준선(왼쪽)은 직각, 데이터 끝(오른쪽)만 4px 라운드 */
  border-radius: 0 4px 4px 0;
}
.bar-value {
  text-align: right;
  font-size: 0.875rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
</style>
