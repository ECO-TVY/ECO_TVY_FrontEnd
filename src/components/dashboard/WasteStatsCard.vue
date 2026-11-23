<template>
  <v-card class="h-100">
    <CardHeader
      icon="mdi-chart-bar"
      title="내 분류 통계"
      :subtitle="history.length ? `종류별 분류 횟수 · 최근 ${history.length}건 기준` : '종류별 분류 횟수'"
    />

    <v-card-text class="px-6 pb-6">
      <v-skeleton-loader v-if="loading" type="text@6" />
      <ErrorState v-else-if="error" :message="error" @retry="emit('retry')" />
      <EmptyState v-else-if="!rows.length" icon="mdi-chart-bar" text="아직 분류한 기록이 없어요." dense />
      <RankedBars v-else :rows="rows" unit="회" aria-label="종류별 분류 횟수" />
    </v-card-text>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'
import RankedBars from '@/components/common/RankedBars.vue'
import CardHeader from '@/components/common/CardHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import { wasteTypeOf } from '@/constants/wasteTypes'

const props = defineProps({
  history: { type: Array, default: () => [] },
  loading: Boolean,
  error: { type: String, default: '' }
})
const emit = defineEmits(['retry'])

// 기록이 있는 종류만 표시
const rows = computed(() => {
  const counts = {}
  for (const h of props.history) counts[h.wasteType] = (counts[h.wasteType] || 0) + 1
  return Object.entries(counts).map(([value, count]) => {
    const t = wasteTypeOf(value)
    return { key: value, label: t.label, icon: t.icon, count }
  })
})
</script>
