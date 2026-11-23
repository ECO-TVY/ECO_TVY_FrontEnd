<template>
  <v-container class="py-6 dashboard" max-width="1200">
    <v-row>
      <!-- 모바일에서는 핵심 작업(분류)이 먼저, 데스크톱에서는 프로필이 왼쪽 -->
      <v-col cols="12" md="4" order="2" order-md="1">
        <ProfileCard
          :user="me.data"
          :loading="me.loading"
          :error="me.error"
          :compact="smAndDown"
          @edit="openEdit(false)"
          @retry="retryMe"
        />
      </v-col>
      <v-col cols="12" md="8" order="1" order-md="2">
        <ClassifyCard @classified="onClassified" />
      </v-col>

      <v-col cols="12" order="3">
        <RecentHistoryCard
          :items="history.data.slice(0, RECENT_COUNT)"
          :loading="history.loading"
          :error="history.error"
          @select="openDetail"
          @retry="loadHistory"
        />
      </v-col>

      <v-col cols="12" md="6" order="4">
        <NearbyPointsCard
          :points="points.data"
          :radius-km="RADIUS_KM"
          :loading="points.loading"
          :error="points.error"
          :needs-address="points.needsAddress"
          :center="center"
          @set-address="openEdit(true)"
          @retry="loadPoints"
        />
      </v-col>
      <v-col cols="12" md="6" order="5">
        <WasteStatsCard
          :history="history.data"
          :loading="history.loading"
          :error="history.error"
          @retry="loadHistory"
        />
      </v-col>
    </v-row>

    <ProfileEditDialog v-model="editOpen" :user="me.data" :focus-address="editForAddress" @saved="onProfileSaved" />
    <HistoryDetailSheet v-model="detailOpen" :item="detailItem" />
  </v-container>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useDisplay } from 'vuetify'
import { fetchDisposalPoints, fetchHistory, fetchMe } from '@/api/endpoints'
import { toErrorMessage } from '@/api/http'
import { useAuthStore } from '@/stores/auth'
import { notify } from '@/composables/useNotify'
import ProfileCard from '@/components/dashboard/ProfileCard.vue'
import ClassifyCard from '@/components/dashboard/ClassifyCard.vue'
import WasteStatsCard from '@/components/dashboard/WasteStatsCard.vue'
import NearbyPointsCard from '@/components/dashboard/NearbyPointsCard.vue'
import RecentHistoryCard from '@/components/dashboard/RecentHistoryCard.vue'
import ProfileEditDialog from '@/components/dashboard/ProfileEditDialog.vue'
import HistoryDetailSheet from '@/components/history/HistoryDetailSheet.vue'

const RADIUS_KM = 2
const RECENT_COUNT = 5
// 통계 전용 API가 없어 최근 기록을 받아 화면에서 집계한다
const STATS_SAMPLE_SIZE = 100

const authStore = useAuthStore()
const { smAndDown } = useDisplay()

// 카드별로 따로 로딩/에러를 가져서 한 API가 실패해도 나머지는 보이게
const me = reactive({ data: authStore.user, loading: true, error: '' })
const history = reactive({ data: [], loading: true, error: '' })
const points = reactive({ data: [], loading: true, error: '', needsAddress: false })

const editOpen = ref(false)
const editForAddress = ref(false)
const detailOpen = ref(false)
const detailItem = ref(null)

const center = computed(() => {
  const { latitude, longitude } = me.data || {}
  return latitude != null && longitude != null ? { latitude, longitude } : null
})

async function load(state, fn) {
  state.loading = true
  state.error = ''
  try {
    state.data = await fn()
  } catch (error) {
    state.error = toErrorMessage(error)
  } finally {
    state.loading = false
  }
}

const loadMe = () =>
  load(me, fetchMe).then(() => {
    if (!me.error) authStore.setUser(me.data)
  })
const loadHistory = () => load(history, () => fetchHistory(0, STATS_SAMPLE_SIZE))

async function loadPoints() {
  const { latitude, longitude } = me.data || {}
  points.needsAddress = false
  if (latitude == null || longitude == null) {
    points.loading = false
    points.error = ''
    points.needsAddress = !me.error
    return
  }
  await load(points, () => fetchDisposalPoints(latitude, longitude, RADIUS_KM))
}

function openDetail(item) {
  detailItem.value = item
  detailOpen.value = true
}

function openEdit(forAddress) {
  editForAddress.value = forAddress
  editOpen.value = true
}

async function retryMe() {
  await loadMe()
  loadPoints()
}

async function onProfileSaved() {
  notify('내 정보가 저장되었습니다.', { type: 'success' })
  // 주소가 바뀌었을 수 있으므로 내 정보 → 배출 장소 순으로 다시 불러온다
  await loadMe()
  loadPoints()
}

async function onClassified() {
  // 레벨·횟수와 기록·통계 갱신
  const prevLevel = me.data?.level
  loadHistory()
  await loadMe()
  // 레벨이 오르는 순간을 알려 준다 (프로그레스 바만 조용히 바뀌지 않도록)
  const nextLevel = me.data?.level
  if (prevLevel != null && nextLevel > prevLevel) {
    notify(`Lv.${nextLevel} 달성! 분리배출 고수에 한 걸음 더 가까워졌어요.`, { type: 'celebrate' })
  }
}

onMounted(async () => {
  loadHistory()
  await loadMe()
  loadPoints()
})
</script>
