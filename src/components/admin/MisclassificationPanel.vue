<template>
  <div ref="rootEl">
    <div class="d-flex align-center mb-4">
      <div>
        <div class="text-h6">오분류 검수</div>
        <div class="text-body-2 text-medium-emphasis">
          사용자가 신고한 분류 결과를 확인하고 승인하면 모델 재학습 데이터로 쓸 수 있습니다.
        </div>
      </div>
      <v-spacer />
      <v-btn variant="text" prepend-icon="mdi-refresh" :loading="loading" :disabled="bulk.running" @click="load">
        새로고침
      </v-btn>
    </div>

    <!-- 모든 [승인]에 적용되는 옵션이라 목록 위, 눈에 띄는 곳에 둔다 -->
    <v-sheet
      v-if="reports.length"
      rounded="lg"
      border
      class="d-flex align-center flex-wrap ga-2 px-4 py-2 mb-3"
      :color="addToTrainingData ? 'primary-container' : undefined"
    >
      <v-switch
        v-model="addToTrainingData"
        density="compact"
        hide-details
        inset
        label="승인 시 학습 데이터에도 추가"
        :disabled="bulk.running"
      />
      <v-spacer />
      <span class="text-caption text-medium-emphasis">
        {{ addToTrainingData ? '승인한 사진이 정답 라벨 폴더로 복사됩니다.' : '승인만 하고 학습 데이터에는 넣지 않습니다.' }}
      </span>
    </v-sheet>

    <!-- 선택 / 일괄 처리 / 단축키 안내 -->
    <div v-if="reports.length" class="d-flex align-center flex-wrap ga-2 mb-3">
      <v-checkbox
        :model-value="allSelected"
        :indeterminate="someSelected && !allSelected"
        :label="selected.size ? `${selected.size}건 선택` : '전체 선택'"
        density="compact"
        hide-details
        :disabled="bulk.running"
        class="flex-grow-0"
        @update:model-value="toggleAll"
      />
      <v-btn
        v-if="selected.size"
        color="primary"
        variant="flat"
        :prepend-icon="addToTrainingData ? 'mdi-database-plus-outline' : 'mdi-check-all'"
        :loading="bulk.running"
        @click="bulkConfirm = true"
      >
        선택 {{ selected.size }}건 {{ addToTrainingData ? '승인 + 학습' : '승인' }}
      </v-btn>
      <v-spacer />
      <span class="text-caption text-medium-emphasis d-none d-md-inline" aria-hidden="true">
        단축키: <kbd>←</kbd><kbd>→</kbd> 이동 · <kbd>A</kbd> 승인 · <kbd>R</kbd> 반려 · <kbd>Space</kbd> 선택 ·
        <kbd>Enter</kbd> 사진 크게
      </span>
    </div>

    <v-progress-linear
      v-if="bulk.running"
      :model-value="(bulk.done / bulk.total) * 100"
      height="6"
      rounded
      class="mb-3"
      :aria-label="`일괄 승인 ${bulk.done}/${bulk.total}`"
    />

    <ErrorState v-if="error" :message="error" class="mb-4" @retry="load" />
    <v-skeleton-loader v-if="loading && !reports.length" type="list-item-avatar-three-line@3" />

    <EmptyState v-else-if="!reports.length && !error" icon="mdi-check-circle-outline" text="검수 대기 중인 신고가 없습니다." />

    <v-row v-else>
      <v-col v-for="(r, i) in reports" :key="r.id" cols="12" sm="6" lg="4">
        <!-- 카드에 포커스를 두고 키보드로 검수 -->
        <v-card
          variant="outlined"
          class="report-card"
          :class="{ 'report-card--selected': selected.has(r.id) }"
          tabindex="0"
          :aria-label="`신고 #${r.id}: AI ${label(r.aiClassifiedType)}, 사용자 ${label(r.correctType)}`"
          @keydown="onCardKey($event, r, i)"
        >
          <div class="photo">
            <v-img
              :src="r.imageUrl"
              height="160"
              cover
              class="bg-surface-container photo-img"
              :alt="`신고 #${r.id} 사진`"
              @click="zoom = r"
            >
              <template #error>
                <div class="d-flex align-center justify-center fill-height text-medium-emphasis">
                  <v-icon icon="mdi-image-broken-variant" class="mr-1" /> 이미지를 불러올 수 없음
                </div>
              </template>
            </v-img>
            <v-checkbox-btn
              :model-value="selected.has(r.id)"
              class="select-box"
              :disabled="bulk.running"
              :aria-label="`신고 #${r.id} 선택`"
              @update:model-value="toggle(r.id)"
            />
            <v-btn
              icon="mdi-magnify-plus-outline"
              size="small"
              variant="flat"
              class="zoom-btn"
              :aria-label="`신고 #${r.id} 사진 크게 보기`"
              @click="zoom = r"
            />
          </div>
          <v-card-text>
            <div class="d-flex align-center justify-space-between mb-1">
              <span class="text-caption text-medium-emphasis">신고 #{{ r.id }} · 분류 #{{ r.classificationId }}</span>
              <span class="text-caption text-medium-emphasis">AI 신뢰도 {{ percent(r.confidence) }}</span>
            </div>
            <div class="d-flex align-center text-body-1">
              <span>
                <span class="text-caption text-medium-emphasis d-block">AI 분류</span>
                <span class="text-decoration-line-through text-medium-emphasis">{{ label(r.aiClassifiedType) }}</span>
              </span>
              <v-icon icon="mdi-arrow-right" class="mx-3 text-medium-emphasis" />
              <span>
                <span class="text-caption text-medium-emphasis d-block">사용자 신고</span>
                <span class="font-weight-bold">{{ label(r.correctType) }}</span>
              </span>
            </div>
          </v-card-text>
          <v-card-actions class="px-4 pb-4">
            <v-btn
              color="primary"
              variant="flat"
              :prepend-icon="addToTrainingData ? 'mdi-database-plus-outline' : 'mdi-check'"
              :loading="busyId === r.id && busyAction === 'approve'"
              :disabled="busyId === r.id || bulk.running"
              @click="approve(r)"
            >
              {{ addToTrainingData ? '승인 + 학습' : '승인' }}
            </v-btn>
            <v-btn
              variant="outlined"
              prepend-icon="mdi-close"
              :disabled="busyId === r.id || bulk.running"
              @click="openReject(r)"
            >
              반려
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- 사진 크게 보기 -->
    <v-dialog :model-value="!!zoom" max-width="900" @update:model-value="(v) => !v && (zoom = null)">
      <v-card v-if="zoom">
        <div class="d-flex align-center px-4 pt-3">
          <span class="text-subtitle-1 font-weight-bold">
            신고 #{{ zoom.id }} · {{ label(zoom.aiClassifiedType) }} → {{ label(zoom.correctType) }}
          </span>
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" aria-label="닫기" @click="zoom = null" />
        </div>
        <v-img :src="zoom.imageUrl" max-height="75vh" contain class="bg-surface-container" :alt="`신고 #${zoom.id} 사진 확대`" />
      </v-card>
    </v-dialog>

    <!-- 일괄 승인 확인 -->
    <v-dialog v-model="bulkConfirm" max-width="420">
      <v-card title="선택한 신고 일괄 승인">
        <v-card-text>
          <b>{{ selected.size }}건</b>을 승인합니다.
          <span v-if="addToTrainingData">승인한 사진은 학습 데이터에도 추가됩니다.</span>
          하나씩 차례로 처리하며, 실패한 건은 목록에 남습니다.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="bulkConfirm = false">취소</v-btn>
          <v-btn color="primary" variant="flat" @click="bulkApprove">승인</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 반려 사유 -->
    <v-dialog v-model="rejectDialog" max-width="440">
      <v-card title="신고 반려">
        <v-card-text>
          <p class="text-body-2 mb-3">
            반려 사유를 남겨 주세요. AI 분류 결과(<b>{{ label(rejectTarget?.aiClassifiedType) }}</b>)가
            유지됩니다.
          </p>
          <!-- 자주 쓰는 사유는 한 번에 -->
          <div class="d-flex flex-wrap ga-1 mb-3">
            <v-chip v-for="q in QUICK_REASONS" :key="q" size="small" variant="outlined" @click="rejectReason = q">
              {{ q }}
            </v-chip>
          </div>
          <v-textarea
            v-model="rejectReason"
            label="반려 사유"
            variant="outlined"
            rows="3"
            counter="200"
            autofocus
            :rules="[(v) => !!v?.trim() || '사유를 입력해 주세요.', (v) => v.length <= 200 || '200자 이하']"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="rejectDialog = false">취소</v-btn>
          <v-btn
            color="error"
            variant="flat"
            :disabled="!rejectReason.trim() || rejectReason.length > 200"
            :loading="busyAction === 'reject'"
            @click="reject"
          >
            반려
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { approveReport, fetchPendingReports, rejectReport } from '@/api/admin'
import { toErrorMessage } from '@/api/http'
import { wasteTypeOf } from '@/constants/wasteTypes'
import { percent } from '@/utils/format'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'

const emit = defineEmits(['changed', 'notify'])

const QUICK_REASONS = ['AI 분류가 맞습니다', '사진으로 종류를 판단하기 어렵습니다', '쓰레기 사진이 아닙니다']

const reports = ref([])
const loading = ref(false)
const error = ref('')
const addToTrainingData = ref(true)
const busyId = ref(null)
const busyAction = ref('')

const rejectDialog = ref(false)
const rejectTarget = ref(null)
const rejectReason = ref('')

const zoom = ref(null)
const rootEl = ref(null)

// 선택 / 일괄 처리
const selected = reactive(new Set())
const bulkConfirm = ref(false)
const bulk = reactive({ running: false, done: 0, total: 0 })
const allSelected = computed(() => reports.value.length > 0 && selected.size === reports.value.length)
const someSelected = computed(() => selected.size > 0)

const label = (type) => (type ? wasteTypeOf(type).label : '')

async function load() {
  loading.value = true
  error.value = ''
  try {
    reports.value = await fetchPendingReports()
    // 사라진 신고는 선택에서도 뺀다
    const ids = new Set(reports.value.map((r) => r.id))
    for (const id of [...selected]) if (!ids.has(id)) selected.delete(id)
  } catch (e) {
    error.value = toErrorMessage(e)
  } finally {
    loading.value = false
  }
}

function toggle(id) {
  selected.has(id) ? selected.delete(id) : selected.add(id)
}

function toggleAll() {
  if (allSelected.value) selected.clear()
  else reports.value.forEach((r) => selected.add(r.id))
}

function removeReport(id, addedToTraining = false) {
  reports.value = reports.value.filter((r) => r.id !== id)
  selected.delete(id)
  emit('changed', { addedToTraining })
}

/** 다른 관리자가 먼저 처리한 신고(6002)는 목록에서 빼고 알린다 */
function isAlreadyHandled(e) {
  return String(e.response?.data?.errorCode) === '6002'
}

function handleActionError(e, r) {
  if (isAlreadyHandled(e)) {
    removeReport(r.id)
    error.value = `신고 #${r.id}는 이미 처리되었습니다.`
  } else {
    error.value = toErrorMessage(e)
  }
}

function approveErrorMessage(e, withTraining) {
  // 저장소 복사 실패 시 백엔드에서 승인까지 롤백됨 → 카드는 그대로 두고 재시도 가능
  return withTraining && e.response?.status >= 500
    ? '학습 데이터 저장소 복사에 실패해 승인이 취소되었습니다. 저장소(S3) 설정을 확인한 뒤 다시 시도해 주세요.'
    : null
}

async function approve(r) {
  busyId.value = r.id
  busyAction.value = 'approve'
  error.value = ''
  const withTraining = addToTrainingData.value
  try {
    await approveReport(r.id, withTraining)
    removeReport(r.id, withTraining)
    emit('notify', withTraining ? `신고 #${r.id}를 승인하고 학습 데이터에 추가했습니다.` : `신고 #${r.id}를 승인했습니다.`)
    return true
  } catch (e) {
    const msg = approveErrorMessage(e, withTraining)
    if (msg) error.value = msg
    else handleActionError(e, r)
    return false
  } finally {
    busyId.value = null
    busyAction.value = ''
  }
}

/** 선택한 신고를 하나씩 차례로 승인 (S3 복사 부하를 피하려고 병렬로 보내지 않음) */
async function bulkApprove() {
  bulkConfirm.value = false
  const targets = reports.value.filter((r) => selected.has(r.id))
  const withTraining = addToTrainingData.value
  Object.assign(bulk, { running: true, done: 0, total: targets.length })
  error.value = ''
  let ok = 0
  let already = 0
  const failed = []
  for (const r of targets) {
    try {
      await approveReport(r.id, withTraining)
      removeReport(r.id, withTraining)
      ok++
    } catch (e) {
      if (isAlreadyHandled(e)) {
        removeReport(r.id)
        already++
      } else {
        failed.push({ r, message: approveErrorMessage(e, withTraining) || toErrorMessage(e) })
      }
    }
    bulk.done++
  }
  bulk.running = false
  const parts = [`${ok}건 승인${withTraining ? '(학습 데이터 추가)' : ''}`]
  if (already) parts.push(`${already}건은 이미 처리됨`)
  if (failed.length) {
    parts.push(`${failed.length}건 실패`)
    error.value = `실패한 신고 #${failed.map((f) => f.r.id).join(', #')}: ${failed[0].message}`
  }
  emit('notify', parts.join(' · '))
}

function openReject(r) {
  rejectTarget.value = r
  rejectReason.value = ''
  rejectDialog.value = true
}

async function reject() {
  const r = rejectTarget.value
  busyId.value = r.id
  busyAction.value = 'reject'
  try {
    await rejectReport(r.id, rejectReason.value.trim())
    rejectDialog.value = false
    removeReport(r.id)
    emit('notify', `신고 #${r.id}를 반려했습니다.`)
  } catch (e) {
    handleActionError(e, r)
    rejectDialog.value = false
  } finally {
    busyId.value = null
    busyAction.value = ''
  }
}

/** 승인으로 카드가 빠지면 인덱스가 밀리므로, 포커스할 때마다 화면의 카드 목록을 다시 찾는다 */
function focusCard(i) {
  nextTick(() => {
    const cards = rootEl.value?.querySelectorAll('.report-card') ?? []
    cards[Math.max(0, Math.min(i, cards.length - 1))]?.focus()
  })
}

/** 카드에 포커스가 있을 때만 동작 (입력창·버튼 위에서는 무시) */
async function onCardKey(e, r, i) {
  if (e.target !== e.currentTarget || e.altKey || e.ctrlKey || e.metaKey) return
  if (bulk.running || busyId.value) return
  const key = e.key.toLowerCase()
  if (key === 'arrowright' || key === 'arrowdown' || key === 'j') {
    e.preventDefault()
    focusCard(i + 1)
  } else if (key === 'arrowleft' || key === 'arrowup' || key === 'k') {
    e.preventDefault()
    focusCard(i - 1)
  } else if (key === 'a') {
    e.preventDefault()
    // 승인하면 카드가 빠지므로 같은 자리(다음 신고)로 포커스
    if (await approve(r)) focusCard(i)
  } else if (key === 'r') {
    e.preventDefault()
    openReject(r)
  } else if (key === ' ') {
    e.preventDefault()
    toggle(r.id)
  } else if (key === 'enter') {
    e.preventDefault()
    zoom.value = r
  }
}

onMounted(load)
</script>

<style scoped>
.report-card {
  transition: border-color 0.15s, box-shadow 0.15s;
}
.report-card:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}
.report-card--selected {
  border-color: rgb(var(--v-theme-primary));
  box-shadow: inset 0 0 0 1px rgb(var(--v-theme-primary));
}
.photo {
  position: relative;
}
.photo-img {
  cursor: zoom-in;
}
.select-box {
  position: absolute;
  top: 4px;
  left: 4px;
  background: rgba(var(--v-theme-surface), 0.9);
  border-radius: 50%;
}
.zoom-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(var(--v-theme-surface), 0.9);
}
kbd {
  display: inline-block;
  min-width: 18px;
  padding: 0 4px;
  margin: 0 1px;
  border: 1px solid rgba(var(--v-border-color), 0.3);
  border-bottom-width: 2px;
  border-radius: 4px;
  font-family: inherit;
  font-size: 0.7rem;
  text-align: center;
}
</style>
