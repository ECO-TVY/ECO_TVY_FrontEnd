<template>
  <v-container class="py-6" max-width="800">
    <div class="d-flex align-center mb-4">
      <v-btn icon="mdi-arrow-left" variant="text" :to="{ name: 'home' }" aria-label="대시보드로" class="mr-1" />
      <h1 class="text-h5 font-weight-bold">분류 기록</h1>
    </div>

    <!-- 종류 필터: 서버 필터가 없어 불러온 기록 안에서만 거른다 -->
    <v-chip-group v-model="filter" class="mb-2" selected-class="text-primary" mandatory>
      <v-chip value="ALL" variant="outlined" filter>전체</v-chip>
      <v-chip
        v-for="t in typesInHistory"
        :key="t.value"
        :value="t.value"
        :prepend-icon="t.icon"
        variant="outlined"
        filter
      >
        {{ t.label }} {{ counts[t.value] }}
      </v-chip>
    </v-chip-group>

    <v-alert v-if="firstError" type="error" variant="tonal" class="mb-4">
      {{ firstError }}
      <template #append>
        <v-btn variant="text" size="small" @click="reload">다시 시도</v-btn>
      </template>
    </v-alert>

    <v-card v-else rounded="lg">
      <v-infinite-scroll :key="scrollKey" empty-text="" @load="loadMore">
        <template v-if="!items.length && !loading">
          <div class="text-center text-medium-emphasis py-12">
            <v-icon icon="mdi-history" size="48" class="mb-2" />
            <div class="text-body-2 mb-4">아직 분류한 기록이 없어요.</div>
            <v-btn color="primary" :to="{ name: 'home' }" prepend-icon="mdi-camera-outline">
              첫 사진 분류하기
            </v-btn>
          </div>
        </template>

        <template v-for="group in groups" :key="group.key">
          <v-list-subheader class="group-header">{{ group.label }}</v-list-subheader>
          <v-list class="pa-2 pt-0" lines="two">
            <HistoryListItem
              v-for="h in group.items"
              :key="h.id"
              :item="h"
              time-only
              :reported="reportedIds.has(h.id)"
              @click="openDetail(h)"
            />
          </v-list>
        </template>

        <div v-if="filter !== 'ALL' && items.length && !groups.length" class="text-center text-medium-emphasis py-8 text-body-2">
          불러온 기록 중 해당 종류가 없어요.
        </div>

        <template #loading>
          <v-skeleton-loader type="list-item-avatar-two-line@3" class="w-100" />
        </template>
        <template #error="{ props: retryProps }">
          <div class="d-flex flex-column align-center py-4 text-body-2">
            <span class="mb-2 text-medium-emphasis">기록을 더 불러오지 못했어요.</span>
            <v-btn variant="tonal" size="small" v-bind="retryProps">다시 시도</v-btn>
          </div>
        </template>
        <template #empty>
          <div v-if="items.length" class="text-caption text-medium-emphasis py-4">모든 기록을 불러왔어요.</div>
        </template>
      </v-infinite-scroll>
    </v-card>

    <HistoryDetailSheet v-model="detailOpen" :item="selected" @reported="onReported" />
  </v-container>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { fetchHistory } from '@/api/endpoints'
import { toErrorMessage } from '@/api/http'
import { WASTE_TYPES } from '@/constants/wasteTypes'
import { dayKey, formatDayGroup } from '@/utils/format'
import HistoryListItem from '@/components/history/HistoryListItem.vue'
import HistoryDetailSheet from '@/components/history/HistoryDetailSheet.vue'

const PAGE_SIZE = 20

const items = ref([])
const page = ref(0)
const loading = ref(true) // 첫 로드 전 "기록 없음"이 깜빡이지 않도록
const firstError = ref('')
const scrollKey = ref(0)
const filter = ref('ALL')
const detailOpen = ref(false)
const selected = ref(null)
// 기록 응답에 신고 여부가 없어 이번 세션에서 신고한 것만 표시
const reportedIds = reactive(new Set())

const counts = computed(() => {
  const c = {}
  for (const h of items.value) c[h.wasteType] = (c[h.wasteType] || 0) + 1
  return c
})
const typesInHistory = computed(() => WASTE_TYPES.filter((t) => counts.value[t.value]))

const groups = computed(() => {
  const list = filter.value === 'ALL' ? items.value : items.value.filter((h) => h.wasteType === filter.value)
  const out = []
  for (const h of list) {
    const key = dayKey(h.createdAt)
    let g = out[out.length - 1]
    if (!g || g.key !== key) {
      g = { key, label: formatDayGroup(h.createdAt), items: [] }
      out.push(g)
    }
    g.items.push(h)
  }
  return out
})

/** v-infinite-scroll 콜백: done('ok' | 'empty' | 'error') */
async function loadMore({ done }) {
  loading.value = true
  try {
    const batch = await fetchHistory(page.value, PAGE_SIZE)
    // 같은 기록이 두 번 들어오지 않게 (새 분류로 페이지 경계가 밀리는 경우)
    const seen = new Set(items.value.map((h) => h.id))
    items.value.push(...batch.filter((h) => !seen.has(h.id)))
    page.value++
    // 전체 개수를 주지 않는 API라 받은 개수가 size보다 적으면 끝으로 본다
    done(batch.length < PAGE_SIZE ? 'empty' : 'ok')
  } catch (e) {
    if (!items.value.length) firstError.value = toErrorMessage(e)
    done('error')
  } finally {
    loading.value = false
  }
}

function reload() {
  items.value = []
  page.value = 0
  firstError.value = ''
  loading.value = true
  scrollKey.value++ // v-infinite-scroll 상태 초기화
}

function openDetail(h) {
  selected.value = h
  detailOpen.value = true
}

function onReported(id) {
  reportedIds.add(id)
}
</script>

<style scoped>
.group-header {
  position: sticky;
  top: 0;
  z-index: 1;
  background: rgb(var(--v-theme-surface));
  font-weight: 600;
}
</style>
