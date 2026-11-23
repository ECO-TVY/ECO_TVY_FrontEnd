<template>
  <div>
    <div class="mb-4">
      <div class="text-h6">지역별 배출 규정</div>
      <div class="text-body-2 text-medium-emphasis">
        동네·쓰레기 종류별 배출 요일과 방법입니다. 사용자가 분류하면 주소에 맞는 규정이 안내됩니다.
      </div>
    </div>

    <!-- 지역 선택 -->
    <v-form class="d-flex flex-wrap ga-2 align-start mb-4" @submit.prevent="load">
      <v-text-field v-model="area.city" label="시/도" placeholder="대전" density="compact" variant="outlined" hide-details class="area-field" />
      <v-text-field v-model="area.district" label="시/군/구" placeholder="대덕구" density="compact" variant="outlined" hide-details class="area-field" />
      <v-text-field v-model="area.dong" label="동/읍/면" placeholder="오정동" density="compact" variant="outlined" hide-details class="area-field" />
      <v-btn type="submit" color="primary" variant="tonal" height="40" :loading="loading" :disabled="!areaFilled">
        조회
      </v-btn>
      <!-- 오타 없이 지역을 고르도록 주소 검색으로 채운다 (백엔드가 사용자 주소를 나누는 방식과 동일) -->
      <v-btn variant="text" height="40" prepend-icon="mdi-map-search-outline" @click="openAreaSearch">
        주소로 찾기
      </v-btn>
      <v-spacer />
      <v-btn color="primary" prepend-icon="mdi-plus" height="40" :disabled="!loadedArea" @click="openCreate">
        규정 추가
      </v-btn>
    </v-form>

    <ErrorState v-if="error" :message="error" :retryable="areaFilled" class="mb-4" @retry="load" />

    <template v-if="loadedArea">
      <div v-if="missingTypes.length" class="mb-3 text-body-2">
        <span class="text-medium-emphasis mr-2">규정이 없는 종류:</span>
        <v-chip
          v-for="t in missingTypes"
          :key="t.value"
          size="small"
          variant="outlined"
          class="mr-1 mb-1"
          :prepend-icon="t.icon"
          @click="openCreate(t.value)"
        >
          {{ t.label }}
        </v-chip>
      </div>

      <v-data-table
        :headers="headers"
        :items="rules"
        :loading="loading"
        item-value="id"
        density="comfortable"
        :items-per-page="-1"
        hide-default-footer
        no-data-text="이 지역에 등록된 규정이 없습니다."
        class="rules-table"
      >
        <template #[`item.wasteType`]="{ item }">
          <v-icon :icon="typeOf(item.wasteType).icon" size="small" class="mr-1 text-medium-emphasis" />
          {{ typeOf(item.wasteType).label }}
        </template>
        <template #[`item.disposalGuide`]="{ item }">
          <span class="guide">{{ item.disposalGuide || '-' }}</span>
        </template>
        <template #[`item.actions`]="{ item }">
          <div class="d-flex justify-end flex-nowrap">
            <v-btn icon="mdi-pencil-outline" size="small" variant="text" :aria-label="`${typeOf(item.wasteType).label} 규정 수정`" @click="openEdit(item)" />
            <v-btn icon="mdi-delete-outline" size="small" variant="text" :aria-label="`${typeOf(item.wasteType).label} 규정 삭제`" @click="confirmDelete(item)" />
          </div>
        </template>
      </v-data-table>
    </template>
    <EmptyState v-else-if="!loading" icon="mdi-map-search-outline" text="시/구/동을 입력하거나 [주소로 찾기]로 지역을 고르세요." />

    <!-- 지역 주소 검색 -->
    <v-dialog v-model="areaSearchOpen" max-width="500" :fullscreen="smAndDown">
      <v-card>
        <v-card-title class="d-flex align-center">
          지역 찾기
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" aria-label="닫기" @click="areaSearchOpen = false" />
        </v-card-title>
        <div ref="areaSearchEl" class="postcode-container" />
      </v-card>
    </v-dialog>

    <!-- 추가/수정 -->
    <v-dialog v-model="formDialog" max-width="560" :fullscreen="smAndDown" scrollable>
      <v-card :title="editing ? '배출 규정 수정' : '배출 규정 추가'">
        <v-card-text>
          <div class="text-body-2 text-medium-emphasis mb-3">
            {{ loadedArea?.city }} {{ loadedArea?.district }} {{ loadedArea?.dong }}
          </div>
          <v-form ref="formRef" @submit.prevent="save">
            <v-select
              v-model="form.wasteType"
              :items="WASTE_TYPES"
              item-title="label"
              item-value="value"
              label="쓰레기 종류"
              variant="outlined"
              :rules="[(v) => !!v || '종류를 선택해 주세요.']"
              class="mb-2"
            />
            <!-- 배출 요일: 칩으로 고르면 앱이 "오늘 배출 가능"을 계산할 수 있는 형식(월·수·금)으로 저장 -->
            <div class="d-flex align-center mb-1">
              <span class="text-body-2 font-weight-medium">배출 요일</span>
              <v-spacer />
              <v-switch
                v-model="dayFreeText"
                label="직접 입력"
                density="compact"
                hide-details
                class="flex-grow-0"
              />
            </div>
            <template v-if="!dayFreeText">
              <v-btn-toggle
                v-model="form.days"
                multiple
                divided
                variant="outlined"
                color="primary"
                density="comfortable"
                class="day-toggle mb-2"
                aria-label="배출 요일 선택"
              >
                <v-btn v-for="d in WEEK_ORDER" :key="d" :value="d" :aria-label="`${DAY_SHORT[d]}요일`">
                  {{ DAY_SHORT[d] }}
                </v-btn>
              </v-btn-toggle>
              <div class="d-flex flex-wrap ga-1 mb-1">
                <v-chip v-for="pre in DAY_PRESETS" :key="pre.label" size="small" variant="outlined" @click="form.days = [...pre.days]">
                  {{ pre.label }}
                </v-chip>
              </div>
              <div class="text-caption mb-3" :class="daysError ? 'text-error' : 'text-medium-emphasis'">
                {{ daysError || `저장 값: ${formatDisposalDays(form.days)}` }}
              </div>
            </template>
            <v-text-field
              v-else
              v-model="form.disposalDay"
              label="배출 요일 (직접 입력)"
              placeholder="예: 격주 화요일"
              variant="outlined"
              hint="이 형식은 앱이 '오늘 배출 가능'을 판단하지 못하고 문구만 보여줍니다."
              persistent-hint
              :rules="[(v) => !!v?.trim() || '배출 요일을 입력해 주세요.']"
              class="mb-3"
            />
            <v-text-field
              v-model="form.disposalTime"
              label="배출 시간 (선택)"
              placeholder="예: 18:00 ~ 24:00"
              variant="outlined"
              class="mb-1"
            />
            <div class="d-flex flex-wrap ga-1 mb-3">
              <v-chip v-for="t in TIME_PRESETS" :key="t" size="small" variant="outlined" @click="form.disposalTime = t">
                {{ t }}
              </v-chip>
            </div>
            <v-textarea
              v-model="form.disposalGuide"
              label="배출 방법 (선택)"
              placeholder="예: 라벨을 떼고 내용물을 비운 뒤 압착해서 배출"
              variant="outlined"
              rows="3"
              hint="여러 단계는 줄바꿈이나 마침표로 나누면 사용자 화면에 번호 목록으로 보입니다."
            />
          </v-form>
          <!-- 사용자에게 보일 모습 미리보기 -->
          <div v-if="previewDay" class="mt-3">
            <div class="text-caption text-medium-emphasis mb-1">사용자 화면 미리보기 (지금 시각 기준)</div>
            <DisposalStatus :day="previewDay" :time="form.disposalTime.trim()" />
          </div>
          <v-alert v-if="formError" type="error" variant="tonal" density="compact" class="mt-3" :text="formError" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="formDialog = false">취소</v-btn>
          <v-btn color="primary" variant="flat" :loading="saving" @click="save">저장</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 삭제 확인 -->
    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card title="규정 삭제">
        <v-card-text>
          <b>{{ typeOf(deleteTarget?.wasteType).label }}</b> 배출 규정을 삭제할까요? 이 동네 사용자에게 더 이상
          배출 요일이 안내되지 않습니다.
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
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useDisplay } from 'vuetify'
import {
  createLocationRule,
  deleteLocationRule,
  fetchLocationRules,
  updateLocationRule
} from '@/api/admin'
import { toErrorMessage } from '@/api/http'
import { WASTE_TYPES, wasteTypeOf } from '@/constants/wasteTypes'
import { DAY_SHORT, WEEK_ORDER, formatDisposalDays, parseDisposalDays } from '@/utils/schedule'
import { searchAddress } from '@/utils/address'
import DisposalStatus from '@/components/waste/DisposalStatus.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'

const props = defineProps({
  /** 기본 조회 지역 ("시 구 동" 형식, 예: 관리자 본인 주소) */
  defaultAddress: { type: String, default: '' }
})
const emit = defineEmits(['notify'])

const { smAndDown } = useDisplay()

const DAY_PRESETS = [
  { label: '매일', days: [0, 1, 2, 3, 4, 5, 6] },
  { label: '평일', days: [1, 2, 3, 4, 5] },
  { label: '월·수·금', days: [1, 3, 5] },
  { label: '화·목·토', days: [2, 4, 6] }
]
const TIME_PRESETS = ['18:00 ~ 24:00', '20:00 ~ 06:00', '06:00 ~ 09:00']

const headers = [
  { title: '종류', key: 'wasteType', width: 140 },
  { title: '배출 요일', key: 'disposalDay', width: 130 },
  { title: '배출 시간', key: 'disposalTime', width: 140 },
  { title: '배출 방법', key: 'disposalGuide', sortable: false },
  { title: '', key: 'actions', sortable: false, align: 'end', width: 100 }
]

/** 백엔드 AddressParts.parse와 같은 규칙 (세 조각 미만이면 빈 값) */
function splitAddress(address) {
  const t = (address || '').trim().split(/\s+/).filter(Boolean)
  if (t.length < 3) return { city: '', district: '', dong: '' }
  return { city: t[0], district: t.slice(1, -1).join(' '), dong: t[t.length - 1] }
}

const area = reactive(splitAddress(props.defaultAddress))
const loadedArea = ref(null)
const rules = ref([])
const loading = ref(false)
const error = ref('')

const formDialog = ref(false)
const formRef = ref(null)
const editing = ref(null)
const form = reactive({ wasteType: null, days: [], disposalDay: '', disposalTime: '', disposalGuide: '' })
// 칩으로 표현할 수 없는 규정(예: 격주)은 직접 입력
const dayFreeText = ref(false)
const daysTouched = ref(false)
const daysError = computed(() => (daysTouched.value && !form.days.length ? '배출 요일을 하나 이상 골라 주세요.' : ''))
const previewDay = computed(() => (dayFreeText.value ? form.disposalDay.trim() : formatDisposalDays(form.days)))

// 직접 입력으로 바꿀 때 고른 요일을 글자로 옮겨 준다 (처음부터 다시 쓰지 않게)
watch(dayFreeText, (free) => {
  if (free && !form.disposalDay.trim()) form.disposalDay = formatDisposalDays(form.days)
})

// 지역 주소 검색
const areaSearchOpen = ref(false)
const areaSearchEl = ref(null)
const formError = ref('')
const saving = ref(false)

const deleteDialog = ref(false)
const deleteTarget = ref(null)

const typeOf = (v) => wasteTypeOf(v)
const areaFilled = computed(() => area.city.trim() && area.district.trim() && area.dong.trim())
const missingTypes = computed(() => {
  const has = new Set(rules.value.map((r) => r.wasteType))
  return WASTE_TYPES.filter((t) => !has.has(t.value))
})

async function load() {
  if (!areaFilled.value) return
  const target = { city: area.city.trim(), district: area.district.trim(), dong: area.dong.trim() }
  loading.value = true
  error.value = ''
  try {
    rules.value = await fetchLocationRules(target)
    loadedArea.value = target
  } catch (e) {
    error.value = toErrorMessage(e)
  } finally {
    loading.value = false
  }
}

function openCreate(type) {
  editing.value = null
  Object.assign(form, {
    wasteType: typeof type === 'string' ? type : null,
    days: [],
    disposalDay: '',
    disposalTime: '',
    disposalGuide: ''
  })
  dayFreeText.value = false
  daysTouched.value = false
  formError.value = ''
  formDialog.value = true
}

function openEdit(rule) {
  editing.value = rule
  Object.assign(form, {
    wasteType: rule.wasteType,
    disposalDay: rule.disposalDay || '',
    disposalTime: rule.disposalTime || '',
    disposalGuide: rule.disposalGuide || ''
  })
  // 기존 문구가 요일로 해석되면 칩으로, 아니면(예: 격주) 원문 그대로 직접 입력 모드로
  const parsed = parseDisposalDays(rule.disposalDay)
  form.days = parsed ? [...parsed] : []
  dayFreeText.value = !parsed && !!rule.disposalDay
  daysTouched.value = false
  formError.value = ''
  formDialog.value = true
}

async function save() {
  daysTouched.value = true
  const { valid } = await formRef.value.validate()
  if (!valid || (!dayFreeText.value && !form.days.length)) return
  saving.value = true
  formError.value = ''
  const payload = {
    ...loadedArea.value,
    wasteType: form.wasteType,
    disposalDay: dayFreeText.value ? form.disposalDay.trim() : formatDisposalDays(form.days),
    disposalTime: form.disposalTime.trim() || null,
    disposalGuide: form.disposalGuide.trim() || null
  }
  try {
    if (editing.value) {
      const updated = await updateLocationRule(editing.value.id, payload)
      rules.value = rules.value.map((r) => (r.id === updated.id ? updated : r))
    } else {
      rules.value = [...rules.value, await createLocationRule(payload)]
    }
    formDialog.value = false
    emit('notify', editing.value ? '배출 규정을 수정했습니다.' : '배출 규정을 추가했습니다.')
  } catch (e) {
    formError.value =
      String(e.response?.data?.errorCode) === '4001'
        ? '이 지역에 같은 종류의 규정이 이미 있습니다.'
        : toErrorMessage(e)
  } finally {
    saving.value = false
  }
}

/**
 * 주소 검색으로 지역 채우기. 백엔드(AddressParts)와 같은 규칙으로 나눈다:
 * 첫 단어 = 시도, 마지막 단어 = 동, 그 사이 = 시군구 ("경기 수원시 영통구 매탄동" → 시군구 "수원시 영통구")
 */
async function openAreaSearch() {
  areaSearchOpen.value = true
  await nextTick()
  await nextTick() // dialog 내용이 그려진 뒤 embed
  try {
    const picked = await searchAddress(areaSearchEl.value)
    Object.assign(area, splitAddress(picked.address))
    areaSearchOpen.value = false
    load()
  } catch (e) {
    areaSearchOpen.value = false
    error.value = e.message
  }
}

function confirmDelete(rule) {
  deleteTarget.value = rule
  deleteDialog.value = true
}

async function remove() {
  saving.value = true
  try {
    await deleteLocationRule(deleteTarget.value.id)
    rules.value = rules.value.filter((r) => r.id !== deleteTarget.value.id)
    emit('notify', '배출 규정을 삭제했습니다.')
  } catch (e) {
    error.value = toErrorMessage(e)
  } finally {
    saving.value = false
    deleteDialog.value = false
  }
}

onMounted(() => {
  if (areaFilled.value) load()
})
</script>

<style scoped>
.postcode-container {
  height: 470px;
}
:deep(.v-dialog--fullscreen) .postcode-container {
  height: calc(100vh - 64px);
}
.day-toggle {
  width: 100%;
}
.day-toggle :deep(.v-btn) {
  flex: 1 1 0;
  min-width: 0;
}
.area-field {
  flex: 1 1 140px;
  max-width: 180px;
}
/* 좁은 화면에서는 열을 찌그러뜨리지 않고 표 안에서만 가로 스크롤 */
.rules-table :deep(table) {
  min-width: 680px;
}
.guide {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
