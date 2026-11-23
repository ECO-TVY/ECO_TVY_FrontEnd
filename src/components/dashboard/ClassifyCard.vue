<template>
  <v-card class="h-100">
    <CardHeader
      icon="mdi-camera-outline"
      title="쓰레기 분류하기"
      subtitle="사진을 고르면 AI가 바로 종류와 우리 동네 배출 방법을 알려드려요."
    >
      <template #append>
        <v-btn
          v-if="file && !classifying"
          variant="text"
          size="small"
          prepend-icon="mdi-restore"
          @click="reset"
        >
          새 사진
        </v-btn>
      </template>
    </CardHeader>

    <v-card-text class="px-6 pb-6">
      <v-row>
        <!-- 이미지 선택 영역 -->
        <v-col cols="12" sm="5">
          <div
            class="dropzone"
            :class="{ 'dropzone--over': dragOver, 'dropzone--filled': previewUrl, 'dropzone--busy': classifying }"
            role="button"
            tabindex="0"
            :aria-label="previewUrl ? '다른 사진 선택' : '분류할 사진 선택'"
            :aria-disabled="classifying"
            @click="pickFile('album')"
            @keydown.enter.prevent="pickFile('album')"
            @keydown.space.prevent="pickFile('album')"
            @dragover.prevent="dragOver = !classifying"
            @dragleave.prevent="dragOver = false"
            @drop.prevent="onDrop"
          >
            <img v-if="previewUrl" :src="previewUrl" alt="선택한 사진 미리보기" class="preview" />
            <div v-else class="text-center text-medium-emphasis pa-4">
              <v-icon icon="mdi-cloud-upload-outline" size="40" class="mb-2" />
              <div class="text-body-2">{{ isTouch ? '눌러서 사진을 선택하세요' : '클릭하거나 사진을 끌어다 놓으세요' }}</div>
              <div class="text-caption">JPG, PNG · 최대 20MB</div>
            </div>
            <!-- 분석 중 스캔 효과 (모션 줄이기 설정이면 정지) -->
            <div v-if="classifying" class="scan" aria-hidden="true"><span class="scan-line" /></div>
          </div>

          <!-- capture가 있으면 모바일에서 카메라만 열리므로 앨범용 input은 capture 없이 따로 둔다 -->
          <input ref="fileInput" type="file" accept="image/*" class="d-none" @change="onFileChange" />
          <input
            ref="cameraInput"
            type="file"
            accept="image/*"
            capture="environment"
            class="d-none"
            @change="onFileChange"
          />
          <!-- 터치 기기에서만: 촬영 / 앨범 선택을 명시적으로 분리 -->
          <div v-if="isTouch" class="d-flex ga-2 mt-3">
            <v-btn
              class="flex-1-1"
              :variant="file ? 'tonal' : 'flat'"
              color="primary"
              prepend-icon="mdi-camera-outline"
              :disabled="classifying"
              @click="pickFile('camera')"
            >
              촬영
            </v-btn>
            <v-btn
              class="flex-1-1"
              variant="tonal"
              color="primary"
              prepend-icon="mdi-image-multiple-outline"
              :disabled="classifying"
              @click="pickFile('album')"
            >
              앨범
            </v-btn>
          </div>
        </v-col>

        <!-- 결과 영역 -->
        <v-col cols="12" sm="7" aria-live="polite">
          <!-- 1) 분석 중: 실제 진행 단계(업로드 → 서버 처리)만 보여준다 -->
          <div v-if="classifying" class="progress-panel">
            <div class="d-flex align-center mb-3">
              <v-progress-circular
                :model-value="stage === 'upload' ? uploadPct : undefined"
                :indeterminate="stage !== 'upload'"
                color="primary"
                size="40"
                width="4"
                class="mr-3"
              >
                <span v-if="stage === 'upload'" class="text-caption">{{ uploadPct }}</span>
              </v-progress-circular>
              <div>
                <div class="text-subtitle-1 font-weight-bold">{{ stageText }}</div>
                <div class="text-body-2 text-medium-emphasis">{{ stageSub }}</div>
              </div>
            </div>
            <ol class="stages text-body-2">
              <li v-for="s in STAGES" :key="s.key" :class="stageClass(s.key)">
                <v-icon :icon="stageIcon(s.key)" size="18" class="mr-2" />{{ s.label }}
              </li>
            </ol>
            <v-btn variant="text" size="small" class="mt-2 px-1" prepend-icon="mdi-close" @click="cancel">
              취소
            </v-btn>
          </div>

          <!-- 2) 오류: 같은 사진으로 바로 재시도 -->
          <v-alert v-else-if="errorMessage" type="error" variant="tonal" class="mb-3">
            <div class="text-body-2">{{ errorMessage }}</div>
            <v-btn
              v-if="retryable && file"
              size="small"
              variant="flat"
              color="error"
              class="mt-2"
              prepend-icon="mdi-refresh"
              @click="classify"
            >
              다시 시도
            </v-btn>
          </v-alert>

          <!-- 3) 결과 -->
          <div v-else-if="result" class="result">
            <div class="d-flex align-center mb-3">
              <v-avatar color="primary-container" size="48" class="mr-3">
                <v-icon :icon="resultType.icon" color="primary" size="28" />
              </v-avatar>
              <div class="min-w-0">
                <div class="text-caption text-medium-emphasis">분류 결과</div>
                <div class="text-h5 font-weight-bold">
                  {{ result.wasteTypeDisplayName || resultType.label }}
                </div>
              </div>
              <v-spacer />
              <v-chip
                :color="lowConfidence ? 'warning' : 'primary'"
                variant="tonal"
                size="small"
                :prepend-icon="lowConfidence ? 'mdi-alert-outline' : 'mdi-check-decagram-outline'"
              >
                신뢰도 {{ percent(result.confidence) }}
              </v-chip>
            </div>

            <!-- 신뢰도가 낮으면 결과를 단정하지 않고 확인을 요청 -->
            <v-alert
              v-if="lowConfidence"
              type="warning"
              color="warning"
              variant="tonal"
              density="compact"
              class="mb-3"
              icon="mdi-help-circle-outline"
            >
              AI가 확신하지 못했어요. 결과가 다르다면 아래에서 실제 종류를 알려주세요.
            </v-alert>

            <DisposalStatus :day="result.disposalDay" :time="result.disposalTime" class="mb-4" />
            <DisposalGuide :guide="result.disposalGuide" class="mb-3" />

            <v-divider class="my-3" />
            <ReportPicker
              :classification-id="result.classificationId"
              :current-type="result.wasteType"
              :start-open="lowConfidence"
              :prompt="lowConfidence ? '이 사진은 실제로 어떤 종류인가요?' : '실제 종류를 골라 주세요.'"
              @reported="emit('reported')"
            />
          </div>

          <!-- 4) 처음 상태 -->
          <div
            v-else
            class="h-100 d-flex flex-column align-center justify-center text-medium-emphasis text-center py-8"
          >
            <v-icon icon="mdi-recycle" size="48" class="mb-2" />
            <div class="text-body-2">사진을 고르면 바로 분석을 시작해요.</div>
          </div>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { classifyWaste } from '@/api/endpoints'
import { toErrorMessage } from '@/api/http'
import { LOW_CONFIDENCE, wasteTypeOf } from '@/constants/wasteTypes'
import { percent } from '@/utils/format'
import DisposalStatus from '@/components/waste/DisposalStatus.vue'
import DisposalGuide from '@/components/waste/DisposalGuide.vue'
import ReportPicker from '@/components/waste/ReportPicker.vue'
import CardHeader from '@/components/common/CardHeader.vue'
import { usePendingPhotoStore } from '@/stores/pendingPhoto'

const emit = defineEmits(['classified', 'reported'])

const MAX_BYTES = 20 * 1024 * 1024 // 백엔드 spring.servlet.multipart.max-file-size
// 서버 처리가 이 시간을 넘으면 "오래 걸리고 있어요" 안내
const SLOW_MS = 10000

const STAGES = [
  { key: 'upload', label: '사진 업로드' },
  { key: 'analyze', label: 'AI 분석 · 우리 동네 배출 규정 확인' }
]

const fileInput = ref(null)
const cameraInput = ref(null)
// 마우스 없는 터치 기기(폰·태블릿)에서만 촬영 버튼 노출. 데스크톱에서 capture는 무시되어 의미 없음
const isTouch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches

const file = ref(null)
const previewUrl = ref('')
const dragOver = ref(false)
const classifying = ref(false)
const errorMessage = ref('')
// 분류 요청 자체가 실패했을 때만 "다시 시도" (파일 형식 오류 등은 재시도 의미 없음)
const retryable = ref(false)
const result = ref(null)

const stage = ref('upload') // upload | analyze
const uploadPct = ref(0)
const slow = ref(false)
let controller = null
let slowTimer = null

const resultType = computed(() => wasteTypeOf(result.value?.wasteType))
const lowConfidence = computed(() => result.value?.confidence != null && result.value.confidence < LOW_CONFIDENCE)

const stageText = computed(() => (stage.value === 'upload' ? '사진을 올리는 중' : 'AI가 분석하는 중'))
const stageSub = computed(() => {
  if (stage.value === 'upload') return `${uploadPct.value}% 업로드됨`
  return slow.value ? '평소보다 오래 걸리고 있어요. 조금만 기다려 주세요.' : '보통 몇 초면 끝나요.'
})
const stageIndex = (key) => STAGES.findIndex((s) => s.key === key)
const stageClass = (key) => {
  const diff = stageIndex(key) - stageIndex(stage.value)
  return diff < 0 ? 'stage--done' : diff === 0 ? 'stage--active' : 'stage--todo'
}
const stageIcon = (key) => {
  const diff = stageIndex(key) - stageIndex(stage.value)
  return diff < 0 ? 'mdi-check-circle' : diff === 0 ? 'mdi-circle-slice-5' : 'mdi-circle-outline'
}

function pickFile(source = 'album') {
  if (classifying.value) return
  ;(source === 'camera' ? cameraInput : fileInput).value.click()
}

function onFileChange(e) {
  setFile(e.target.files?.[0])
  e.target.value = '' // 같은 파일을 다시 골라도 change가 발생하도록
}

function onDrop(e) {
  dragOver.value = false
  if (!classifying.value) setFile(e.dataTransfer.files?.[0])
}

function setFile(f) {
  if (!f) return
  errorMessage.value = ''
  retryable.value = false
  if (!f.type.startsWith('image/')) {
    errorMessage.value = '이미지 파일만 올릴 수 있습니다.'
    return
  }
  if (f.size > MAX_BYTES) {
    errorMessage.value = '20MB 이하의 사진을 올려 주세요.'
    return
  }
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  file.value = f
  previewUrl.value = URL.createObjectURL(f)
  result.value = null
  // 사진을 고르면 곧바로 분류 (버튼 한 번 더 누르는 단계 제거)
  classify()
}

function clearTimers() {
  clearTimeout(slowTimer)
  slowTimer = null
}

async function classify() {
  if (!file.value || classifying.value) return
  classifying.value = true
  errorMessage.value = ''
  result.value = null
  stage.value = 'upload'
  uploadPct.value = 0
  slow.value = false
  controller = new AbortController()

  try {
    result.value = await classifyWaste(file.value, {
      signal: controller.signal,
      onUploadProgress(ratio) {
        uploadPct.value = Math.round(ratio * 100)
        if (ratio >= 1 && stage.value === 'upload') {
          stage.value = 'analyze'
          slowTimer = setTimeout(() => (slow.value = true), SLOW_MS)
        }
      }
    })
    emit('classified', result.value)
  } catch (error) {
    if (error.code === 'ERR_CANCELED') return // 사용자가 취소 → 조용히 종료
    retryable.value = true
    // 5xx는 대부분 AI 서버/S3 실패 → 백엔드의 일반 오류 문구보다 구체적으로 안내
    errorMessage.value =
      error.code === 'ECONNABORTED'
        ? '분석 시간이 너무 오래 걸려 중단했어요. 잠시 후 다시 시도해 주세요.'
        : error.response?.status >= 500
          ? '분류에 실패했습니다. AI 서버 상태를 확인하거나 잠시 후 다시 시도해 주세요.'
          : toErrorMessage(error)
  } finally {
    clearTimers()
    controller = null
    classifying.value = false
  }
}

function cancel() {
  controller?.abort()
}

function reset() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  file.value = null
  previewUrl.value = ''
  result.value = null
  errorMessage.value = ''
}

// 하단 내비게이션 [촬영]으로 찍은 사진이 들어오면 바로 분류 (다른 화면에서 찍은 경우 포함)
const pendingPhoto = usePendingPhotoStore()
// 분석 중에 새 사진이 들어오면 끝난 뒤에 이어서 처리
watch(
  () => [pendingPhoto.file, classifying.value],
  ([f, busy]) => {
    if (f && !busy) setFile(pendingPhoto.take())
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  controller?.abort()
  clearTimers()
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
})
</script>

<style scoped>
.dropzone {
  position: relative;
  aspect-ratio: 1 / 1;
  max-height: 260px; /* 모바일 전체 너비에서 정사각형이 너무 커지지 않도록 */
  width: 100%;
  border: 2px dashed rgba(var(--v-border-color), 0.3);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;
  transition:
    border-color 0.15s,
    background-color 0.15s;
}
.dropzone:hover,
.dropzone:focus-visible,
.dropzone--over {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.06);
  outline: none;
}
.dropzone--filled {
  border-style: solid;
}
.dropzone--busy {
  cursor: progress;
}
.preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 분석 중 스캔 효과 */
.scan {
  position: absolute;
  inset: 0;
  background: rgba(var(--v-theme-primary), 0.18);
  pointer-events: none;
}
.scan-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 3px;
  background: rgb(var(--v-theme-primary-container));
  box-shadow: 0 0 12px 4px rgba(var(--v-theme-primary), 0.6);
  animation: scan 1.6s ease-in-out infinite alternate;
}
@keyframes scan {
  from {
    top: 4%;
  }
  to {
    top: 94%;
  }
}
@media (prefers-reduced-motion: reduce) {
  .scan-line {
    animation: none;
    top: 50%;
  }
}

.progress-panel {
  padding: 8px 0;
}
.stages {
  list-style: none;
  padding: 0;
  margin: 0;
}
.stages li {
  display: flex;
  align-items: center;
  padding: 4px 0;
}
.stage--done {
  color: rgb(var(--v-theme-primary));
}
.stage--active {
  font-weight: 600;
}
.stage--todo {
  opacity: 0.5;
}
.min-w-0 {
  min-width: 0;
}
</style>
