<template>
  <v-container class="py-6" max-width="1200">
    <div class="d-flex align-center mb-4">
      <h1 class="text-h5 font-weight-bold">관리자 대시보드</h1>
      <v-spacer />
      <v-btn variant="text" prepend-icon="mdi-refresh" :loading="summary.loading" @click="loadSummary">
        지표 새로고침
      </v-btn>
    </div>

    <!-- 핵심 지표: 숫자 하나가 요점이므로 차트 대신 stat tile -->
    <ErrorState v-if="summary.error" :message="summary.error" :retrying="summary.loading" class="mb-4" @retry="loadSummary" />
    <v-row class="mb-2">
      <v-col v-for="tile in tiles" :key="tile.key" cols="6" md="3">
        <v-card
          rounded="lg"
          class="h-100"
          :link="!!tile.tab"
          :aria-label="tile.tab ? `${tile.label}: ${tile.value} — ${tile.tabLabel} 탭으로 이동` : undefined"
          @click="tile.tab && (tab = tile.tab)"
        >
          <v-card-text class="pa-5">
            <div class="d-flex align-center text-body-2 text-medium-emphasis mb-2">
              <v-icon :icon="tile.icon" size="small" class="mr-1" />
              {{ tile.label }}
            </div>
            <v-skeleton-loader v-if="summary.loading && !summary.data" type="heading" />
            <div v-else class="text-h4 font-weight-bold tile-value">
              {{ tile.value }}<span v-if="tile.unit" class="text-body-1 ml-1">{{ tile.unit }}</span>
            </div>
            <v-chip
              v-if="tile.key === 'pending' && summary.data?.pendingMisclassifications > 0"
              size="x-small"
              color="warning"
              variant="tonal"
              class="mt-2"
              prepend-icon="mdi-alert-circle-outline"
            >
              검수 필요
            </v-chip>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-card rounded="lg">
      <v-tabs v-model="tab" color="primary" show-arrows>
        <v-tab value="reports" prepend-icon="mdi-flag-outline">
          오분류 검수
          <v-badge
            v-if="summary.data?.pendingMisclassifications"
            :content="summary.data.pendingMisclassifications"
            color="warning"
            inline
          />
        </v-tab>
        <v-tab value="training" prepend-icon="mdi-database-outline">학습 데이터</v-tab>
        <v-tab value="rules" prepend-icon="mdi-calendar-clock">배출 규정</v-tab>
        <v-tab value="models" prepend-icon="mdi-robot-outline">AI 모델</v-tab>
        <v-tab value="users" prepend-icon="mdi-account-group-outline">사용자</v-tab>
      </v-tabs>
      <v-divider />
      <v-card-text class="pa-4 pa-sm-6">
        <v-window v-model="tab">
          <v-window-item value="reports">
            <MisclassificationPanel @changed="onReportsChanged" @notify="notify" />
          </v-window-item>
          <v-window-item value="training">
            <TrainingDataPanel :refresh-key="trainingRefreshKey" @notify="notify" />
          </v-window-item>
          <v-window-item value="rules">
            <LocationRulesPanel :default-address="authStore.user?.address || ''" @notify="notify" />
          </v-window-item>
          <!-- 탭과 같은 순서여야 전환 애니메이션 방향이 맞다 -->
          <v-window-item value="models">
            <AIModelsPanel @changed="loadSummary" @notify="notify" />
          </v-window-item>
          <v-window-item value="users">
            <UsersPanel @changed="loadSummary" @notify="notify" />
          </v-window-item>
        </v-window>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchAdminDashboard } from '@/api/admin'
import { toErrorMessage } from '@/api/http'
import { useAuthStore } from '@/stores/auth'
import { notify as showNotice } from '@/composables/useNotify'
import ErrorState from '@/components/common/ErrorState.vue'
import MisclassificationPanel from '@/components/admin/MisclassificationPanel.vue'
import LocationRulesPanel from '@/components/admin/LocationRulesPanel.vue'
import AIModelsPanel from '@/components/admin/AIModelsPanel.vue'
import TrainingDataPanel from '@/components/admin/TrainingDataPanel.vue'
import UsersPanel from '@/components/admin/UsersPanel.vue'

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

// 선택한 탭을 주소(?tab=)에 남겨 새로고침·링크 공유 시 같은 탭이 열리게
const TABS = ['reports', 'training', 'rules', 'models', 'users']
const tab = ref(TABS.includes(route.query.tab) ? route.query.tab : 'reports')
watch(tab, (t) => router.replace({ query: { ...route.query, tab: t } }))
// 승인으로 학습 데이터가 늘었을 때 학습 데이터 탭이 다시 불러오도록
const trainingRefreshKey = ref(0)

function onReportsChanged({ addedToTraining } = {}) {
  loadSummary()
  if (addedToTraining) trainingRefreshKey.value++
}
const summary = reactive({ data: null, loading: false, error: '' })

const fmt = (n) => (n == null ? '-' : Number(n).toLocaleString('ko-KR'))

const tiles = computed(() => {
  const d = summary.data || {}
  return [
    { key: 'users', label: '전체 사용자', icon: 'mdi-account-group-outline', value: fmt(d.totalUsers), unit: '명' },
    { key: 'today', label: '오늘 분류', icon: 'mdi-recycle', value: fmt(d.todayClassifications), unit: '건' },
    {
      key: 'pending',
      label: '검수 대기 신고',
      icon: 'mdi-flag-outline',
      value: fmt(d.pendingMisclassifications),
      unit: '건',
      tab: 'reports',
      tabLabel: '오분류 검수'
    },
    {
      key: 'model',
      label: '사용 중인 모델',
      icon: 'mdi-robot-outline',
      value: d.activeModelVersion && d.activeModelVersion !== 'N/A' ? d.activeModelVersion : '없음',
      tab: 'models',
      tabLabel: 'AI 모델'
    }
  ]
})

async function loadSummary() {
  summary.loading = true
  summary.error = ''
  try {
    summary.data = await fetchAdminDashboard()
  } catch (e) {
    summary.error = toErrorMessage(e)
  } finally {
    summary.loading = false
  }
}

/** 각 패널의 'notify' 이벤트(문구) → 전역 알림 */
function notify(text) {
  showNotice(text, { type: 'success' })
}

onMounted(loadSummary)
</script>

<style scoped>
.tile-value {
  font-variant-numeric: tabular-nums;
  word-break: break-all;
}
</style>
