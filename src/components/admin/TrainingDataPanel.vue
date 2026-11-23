<template>
  <div>
    <div class="d-flex align-center flex-wrap ga-2 mb-4">
      <div>
        <div class="text-h6">학습 데이터</div>
        <div class="text-body-2 text-medium-emphasis">
          승인한 오분류 신고의 사진이 정답 라벨별 폴더로 모입니다. 모델 재학습에 그대로 사용할 수 있습니다.
        </div>
      </div>
      <v-spacer />
      <v-btn variant="text" prepend-icon="mdi-refresh" :loading="loading" @click="load">새로고침</v-btn>
      <v-btn
        color="primary"
        prepend-icon="mdi-download"
        :loading="exporting"
        :disabled="!summary?.total"
        @click="exportCsv"
      >
        매니페스트 CSV
      </v-btn>
    </div>

    <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-4" :text="error" />
    <v-skeleton-loader v-if="loading && !summary" type="paragraph, list-item-two-line@3" />

    <template v-else-if="summary">
      <v-row>
        <!-- 라벨별 개수: 클래스 불균형 확인용. 0개 라벨도 표시 -->
        <v-col cols="12" md="5">
          <div class="d-flex align-baseline mb-1">
            <span class="text-h4 font-weight-bold mr-1">{{ summary.total }}</span>
            <span class="text-body-1">개 샘플</span>
          </div>
          <div class="text-caption text-medium-emphasis mb-3">
            저장 위치 <code class="dataset-root">{{ summary.datasetRoot }}</code>
          </div>
          <RankedBars :rows="labelRows" unit="개" aria-label="라벨별 학습 샘플 수" />
          <v-alert
            v-if="emptyLabels.length && summary.total"
            type="info"
            variant="tonal"
            density="compact"
            class="mt-3"
            icon="mdi-information-outline"
          >
            샘플이 없는 라벨: {{ emptyLabels.join(', ') }}. 라벨 간 개수 차이가 크면 재학습 시 해당 종류의
            정확도가 떨어질 수 있습니다.
          </v-alert>
        </v-col>

        <!-- 최근 추가된 샘플 -->
        <v-col cols="12" md="7">
          <div class="text-subtitle-2 mb-2">최근 추가된 샘플</div>
          <div v-if="!samples.length" class="text-center text-medium-emphasis py-10">
            <v-icon icon="mdi-database-outline" size="44" class="mb-2" />
            <div class="text-body-2">
              아직 학습 데이터가 없습니다.<br />오분류 검수에서 <b>학습 데이터에 추가</b>를 켜고 승인해 보세요.
            </div>
          </div>
          <v-list v-else lines="two" class="pa-0">
            <v-list-item v-for="s in samples" :key="s.id" class="px-0">
              <template #prepend>
                <v-avatar size="48" rounded="lg" class="mr-3 bg-surface-container">
                  <v-img :src="s.imageUrl" :alt="`샘플 #${s.id}`" cover>
                    <template #error>
                      <div class="d-flex align-center justify-center fill-height">
                        <v-icon :icon="typeOf(s.label).icon" color="grey" />
                      </div>
                    </template>
                  </v-img>
                </v-avatar>
              </template>
              <v-list-item-title>
                <span class="text-medium-emphasis text-decoration-line-through">{{ typeOf(s.predictedLabel).label }}</span>
                <v-icon icon="mdi-arrow-right" size="small" class="mx-1 text-medium-emphasis" />
                <b>{{ typeOf(s.label).label }}</b>
              </v-list-item-title>
              <v-list-item-subtitle>
                <code class="dataset-key">{{ s.datasetKey }}</code>
                <span v-if="s.modelVersion"> · {{ s.modelVersion }}</span>
              </v-list-item-subtitle>
              <template #append>
                <span class="text-caption text-medium-emphasis mr-1 d-none d-sm-inline">{{ formatDate(s.createdAt) }}</span>
                <v-btn
                  icon="mdi-delete-outline"
                  size="small"
                  variant="text"
                  :aria-label="`샘플 #${s.id} 제외`"
                  @click="confirmRemove(s)"
                />
              </template>
            </v-list-item>
          </v-list>
        </v-col>
      </v-row>
    </template>

    <v-dialog v-model="removeDialog" max-width="420">
      <v-card title="학습 데이터에서 제외">
        <v-card-text>
          샘플 #{{ removeTarget?.id }}(<b>{{ typeOf(removeTarget?.label).label }}</b>)을 데이터셋에서 제외할까요?
          저장소의 복사본도 삭제되며, 원본 분류 기록은 유지됩니다.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="removeDialog = false">취소</v-btn>
          <v-btn color="error" variant="flat" :loading="removing" @click="remove">제외</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import {
  exportTrainingManifest,
  fetchTrainingSamples,
  fetchTrainingSummary,
  removeTrainingSample
} from '@/api/admin'
import { toErrorMessage } from '@/api/http'
import RankedBars from '@/components/common/RankedBars.vue'
import { formatDateTime } from '@/utils/format'
import { WASTE_TYPES, wasteTypeOf } from '@/constants/wasteTypes'

const props = defineProps({
  /** 값이 바뀌면 다시 불러온다 (다른 탭에서 승인으로 샘플이 추가된 경우) */
  refreshKey: { type: Number, default: 0 }
})
const emit = defineEmits(['notify'])

const summary = ref(null)
const samples = ref([])
const loading = ref(false)
const error = ref('')
const exporting = ref(false)
const removeDialog = ref(false)
const removeTarget = ref(null)
const removing = ref(false)

const typeOf = (v) => wasteTypeOf(v)

const labelRows = computed(() =>
  WASTE_TYPES.map((t) => ({
    key: t.value,
    label: t.label,
    icon: t.icon,
    count: summary.value?.countsByLabel?.[t.value] ?? 0
  }))
)
const emptyLabels = computed(() => labelRows.value.filter((r) => r.count === 0).map((r) => r.label))

// ISO 문자열과 Jackson 배열([y, M, d, h, m]) 둘 다 처리하는 공용 포맷터
const formatDate = formatDateTime

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [s, list] = await Promise.all([fetchTrainingSummary(), fetchTrainingSamples(0, 20)])
    summary.value = s
    samples.value = list
  } catch (e) {
    error.value = toErrorMessage(e)
  } finally {
    loading.value = false
  }
}

async function exportCsv() {
  exporting.value = true
  try {
    const blob = await exportTrainingManifest()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ecotvy-training-manifest-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    error.value = toErrorMessage(e)
  } finally {
    exporting.value = false
  }
}

function confirmRemove(s) {
  removeTarget.value = s
  removeDialog.value = true
}

async function remove() {
  removing.value = true
  try {
    await removeTrainingSample(removeTarget.value.id)
    emit('notify', `샘플 #${removeTarget.value.id}를 학습 데이터에서 제외했습니다.`)
    removeDialog.value = false
    await load()
  } catch (e) {
    error.value = toErrorMessage(e)
    removeDialog.value = false
  } finally {
    removing.value = false
  }
}

watch(() => props.refreshKey, load)
onMounted(load)
</script>

<style scoped>
.dataset-root,
.dataset-key {
  font-size: 0.75rem;
  background: rgba(0, 0, 0, 0.05);
  padding: 1px 4px;
  border-radius: 4px;
  word-break: break-all;
}
</style>
