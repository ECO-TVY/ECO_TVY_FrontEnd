<template>
  <div>
    <div class="d-flex align-center flex-wrap ga-2 mb-4">
      <div>
        <div class="text-h6">AI 모델</div>
        <div class="text-body-2 text-medium-emphasis">
          활성화한 모델의 서버로 이후의 모든 분류 요청이 전달됩니다. 활성화할 때 서버 연결을 먼저 확인합니다.
        </div>
      </div>
      <v-spacer />
      <v-btn variant="text" prepend-icon="mdi-refresh" :loading="loading" @click="load">새로고침</v-btn>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreate">모델 등록</v-btn>
    </div>

    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      density="compact"
      class="mb-4"
      closable
      :text="error"
      @click:close="error = ''"
    />
    <v-skeleton-loader v-if="loading && !models.length" type="list-item-two-line@3" />
    <div v-else-if="!models.length && !error" class="text-center text-medium-emphasis py-12">
      <v-icon icon="mdi-robot-outline" size="48" class="mb-2" />
      <div>등록된 모델이 없습니다.</div>
      <div class="text-caption">
        모델을 등록하고 활성화하기 전까지는 설정 파일의 기본 AI 서버(ai.model.server.url)가 쓰입니다.
      </div>
    </div>

    <div v-else>
      <v-card v-for="m in sortedModels" :key="m.id" variant="outlined" rounded="lg" class="mb-3">
        <div class="d-flex flex-wrap align-center pa-4 ga-3">
          <!-- 글자/아이콘 색은 아바타 배경 토큰의 on-* 색을 따른다 (다크 모드 대비 유지) -->
          <v-avatar :color="m.isActive ? 'primary' : 'surface-container'" size="40">
            <v-icon icon="mdi-robot-outline" />
          </v-avatar>
          <div class="flex-grow-1 min-w-0">
            <div class="font-weight-bold">
              {{ m.version }}
              <v-chip v-if="m.isActive" size="x-small" color="primary" variant="flat" class="ml-2">
                <v-icon icon="mdi-check" start size="x-small" />사용 중
              </v-chip>
            </div>
            <div class="text-body-2 text-medium-emphasis">{{ m.description || '설명 없음' }}</div>
            <code class="model-url">{{ m.modelUrl }}</code>
          </div>
          <div class="text-right">
            <div class="text-caption text-medium-emphasis">정확도</div>
            <div class="text-subtitle-1 font-weight-bold">{{ formatAccuracy(m.accuracy) }}</div>
          </div>
          <div class="d-flex align-center ga-1">
            <v-btn
              icon="mdi-pencil-outline"
              size="small"
              variant="text"
              :aria-label="`${m.version} 수정`"
              @click="openEdit(m)"
            />
            <v-btn
              v-if="!m.isActive"
              icon="mdi-delete-outline"
              size="small"
              variant="text"
              :aria-label="`${m.version} 삭제`"
              @click="confirmDelete(m)"
            />
            <v-btn
              v-if="!m.isActive"
              variant="outlined"
              color="primary"
              :loading="activating === m.version"
              :disabled="!!activating"
              @click="confirmActivate(m)"
            >
              활성화
            </v-btn>
          </div>
        </div>
      </v-card>
    </div>

    <!-- 등록 / 수정 -->
    <v-dialog v-model="formDialog" max-width="520">
      <v-card :title="editing ? `${editing.version} 수정` : 'AI 모델 등록'">
        <v-card-text>
          <v-form ref="formRef" @submit.prevent="save">
            <v-text-field
              v-model="form.version"
              label="버전"
              placeholder="예: v1.2.0"
              variant="outlined"
              :disabled="!!editing"
              :hint="editing ? '버전은 바꿀 수 없습니다' : '영문·숫자로 시작, 영문·숫자·. _ - (최대 50자)'"
              persistent-hint
              :rules="editing ? [] : rules.version"
              class="mb-3"
            />
            <v-text-field
              v-model="form.modelUrl"
              label="모델 서버 URL"
              placeholder="예: http://ai-server:8000"
              variant="outlined"
              hint="이 주소의 /predict 로 분류를, /health 로 연결 확인을 합니다"
              persistent-hint
              :rules="rules.modelUrl"
              class="mb-3"
            />
            <v-text-field
              v-model="form.accuracyPercent"
              label="정확도 (선택)"
              type="number"
              suffix="%"
              min="0"
              max="100"
              step="0.1"
              variant="outlined"
              :rules="rules.accuracy"
              class="mb-1"
            />
            <v-textarea
              v-model="form.description"
              label="설명 (선택)"
              placeholder="예: 대덕구 신고 데이터 300건 추가 학습"
              variant="outlined"
              rows="2"
              counter="1000"
              :rules="rules.description"
            />
          </v-form>
          <v-alert v-if="formError" type="error" variant="tonal" density="compact" :text="formError" />
          <v-alert
            v-if="editing?.isActive"
            type="info"
            variant="tonal"
            density="compact"
            class="mt-2"
            text="사용 중인 모델입니다. 서버 URL을 바꾸면 새 서버의 연결을 확인한 뒤 바로 적용됩니다."
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="formDialog = false">취소</v-btn>
          <v-btn color="primary" variant="flat" :loading="saving" @click="save">
            {{ editing ? '저장' : '등록' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 활성화 확인 -->
    <v-dialog v-model="activateDialog" max-width="440">
      <v-card title="모델 활성화">
        <v-card-text>
          <b>{{ target?.version }}</b>을(를) 활성화할까요?
          <span v-if="activeModel">현재 사용 중인 <b>{{ activeModel.version }}</b>은 비활성화됩니다.</span>
          <div class="text-body-2 text-medium-emphasis mt-2">
            <code>{{ target?.modelUrl }}/health</code> 응답을 확인한 뒤 바로 적용됩니다.
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="activateDialog = false">취소</v-btn>
          <v-btn color="primary" variant="flat" @click="activate">활성화</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 삭제 확인 -->
    <v-dialog v-model="deleteDialog" max-width="420">
      <v-card title="모델 삭제">
        <v-card-text>
          <b>{{ target?.version }}</b>을(를) 삭제할까요? 이 모델로 분류된 기존 기록은 그대로 남습니다.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="deleteDialog = false">취소</v-btn>
          <v-btn color="error" variant="flat" :loading="saving" @click="remove">삭제</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { activateAIModel, deleteAIModel, fetchAIModels, registerAIModel, updateAIModel } from '@/api/admin'
import { toErrorMessage } from '@/api/http'

const emit = defineEmits(['changed', 'notify'])

const models = ref([])
const loading = ref(false)
const error = ref('')
const activating = ref('')
const target = ref(null)
const activateDialog = ref(false)
const deleteDialog = ref(false)

const formDialog = ref(false)
const formRef = ref(null)
const editing = ref(null)
const form = reactive({ version: '', modelUrl: '', accuracyPercent: '', description: '' })
const formError = ref('')
const saving = ref(false)

// 백엔드 검증과 같은 규칙 (서버도 다시 검사)
const rules = {
  version: [
    (v) => !!v?.trim() || '버전을 입력해 주세요.',
    (v) => /^[A-Za-z0-9][A-Za-z0-9._-]{0,49}$/.test(v.trim()) || '영문·숫자로 시작하고 영문·숫자·. _ - 만 쓸 수 있습니다.'
  ],
  modelUrl: [
    (v) => !!v?.trim() || '모델 서버 URL을 입력해 주세요.',
    (v) => /^https?:\/\/[^\s/?#]+(\/[^\s?#]*)?$/i.test(v.trim()) || 'http(s)://호스트[:포트][/경로] 형식으로 입력해 주세요.'
  ],
  accuracy: [
    (v) => v === '' || v === null || (Number(v) >= 0 && Number(v) <= 100) || '0~100 사이로 입력해 주세요.'
  ],
  description: [(v) => !v || v.length <= 1000 || '1000자 이하로 입력해 주세요.']
}

const activeModel = computed(() => models.value.find((m) => m.isActive))
// 사용 중인 모델을 맨 위에
const sortedModels = computed(() =>
  [...models.value].sort((a, b) => Number(b.isActive) - Number(a.isActive))
)

const formatAccuracy = (a) => (a == null ? '-' : `${(a * 100).toFixed(1)}%`)

async function load() {
  loading.value = true
  error.value = ''
  try {
    models.value = await fetchAIModels()
  } catch (e) {
    error.value = toErrorMessage(e)
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  Object.assign(form, { version: '', modelUrl: '', accuracyPercent: '', description: '' })
  formError.value = ''
  formDialog.value = true
}

function openEdit(m) {
  editing.value = m
  Object.assign(form, {
    version: m.version,
    modelUrl: m.modelUrl || '',
    accuracyPercent: m.accuracy == null ? '' : +(m.accuracy * 100).toFixed(1),
    description: m.description || ''
  })
  formError.value = ''
  formDialog.value = true
}

async function save() {
  const { valid } = await formRef.value.validate()
  if (!valid) return
  saving.value = true
  formError.value = ''
  const payload = {
    version: form.version.trim(),
    modelUrl: form.modelUrl.trim(),
    description: form.description.trim() || null,
    accuracy: form.accuracyPercent === '' || form.accuracyPercent === null ? null : Number(form.accuracyPercent) / 100
  }
  try {
    if (editing.value) {
      const updated = await updateAIModel(editing.value.version, payload)
      models.value = models.value.map((m) => (m.id === updated.id ? updated : m))
      emit('notify', `${updated.version} 모델 정보를 수정했습니다.`)
    } else {
      const created = await registerAIModel(payload)
      models.value = [...models.value, created]
      emit('notify', `${created.version} 모델을 등록했습니다. 활성화해야 분류에 사용됩니다.`)
    }
    formDialog.value = false
  } catch (e) {
    formError.value =
      e.response?.data?.errorCode === '4001' ? '같은 버전의 모델이 이미 있습니다.' : toErrorMessage(e)
  } finally {
    saving.value = false
  }
}

function confirmActivate(m) {
  target.value = m
  activateDialog.value = true
}

async function activate() {
  activateDialog.value = false
  const version = target.value.version
  activating.value = version
  error.value = ''
  try {
    await activateAIModel(version)
    models.value = models.value.map((m) => ({ ...m, isActive: m.version === version }))
    emit('changed')
    emit('notify', `${version} 모델을 활성화했습니다.`)
  } catch (e) {
    // 9000: 서버 연결 실패 → 기존 활성 모델이 그대로 유지됨
    error.value = toErrorMessage(e) + (e.response?.data?.errorCode === '9000' ? ' 기존 모델이 계속 사용됩니다.' : '')
  } finally {
    activating.value = ''
  }
}

function confirmDelete(m) {
  target.value = m
  deleteDialog.value = true
}

async function remove() {
  saving.value = true
  try {
    await deleteAIModel(target.value.version)
    models.value = models.value.filter((m) => m.id !== target.value.id)
    emit('notify', `${target.value.version} 모델을 삭제했습니다.`)
  } catch (e) {
    error.value = toErrorMessage(e)
  } finally {
    saving.value = false
    deleteDialog.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.model-url {
  font-size: 0.75rem;
  background: rgba(0, 0, 0, 0.05);
  padding: 1px 4px;
  border-radius: 4px;
  word-break: break-all;
}
.min-w-0 {
  min-width: 0;
}
</style>
