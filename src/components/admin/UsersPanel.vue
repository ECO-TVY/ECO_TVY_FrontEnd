<template>
  <div>
    <div class="d-flex align-center flex-wrap ga-2 mb-4">
      <div>
        <div class="text-h6">사용자</div>
        <div class="text-body-2 text-medium-emphasis">
          사용자 권한을 바꾸거나 새 관리자 계정을 만듭니다. 권한 변경은 관리자 기능에 즉시 반영됩니다.
        </div>
      </div>
      <v-spacer />
      <v-btn color="primary" prepend-icon="mdi-shield-account-outline" @click="openCreate">
        관리자 계정 만들기
      </v-btn>
    </div>

    <v-form class="d-flex ga-2 mb-4" @submit.prevent="search">
      <v-text-field
        v-model="query"
        label="이메일 또는 닉네임 검색"
        prepend-inner-icon="mdi-magnify"
        density="compact"
        variant="outlined"
        hide-details
        clearable
        class="search-field"
        @click:clear="clearSearch"
      />
      <v-btn type="submit" variant="tonal" color="primary" height="40" :loading="loading">검색</v-btn>
    </v-form>

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

    <v-skeleton-loader v-if="loading && !users.length" type="list-item-two-line@4" />
    <div v-else-if="!users.length && !error" class="text-center text-medium-emphasis py-10">
      <v-icon icon="mdi-account-search-outline" size="44" class="mb-2" />
      <div>{{ appliedQuery ? `'${appliedQuery}'에 해당하는 사용자가 없습니다.` : '사용자가 없습니다.' }}</div>
    </div>

    <template v-else>
      <v-list class="pa-0" lines="two">
        <v-list-item v-for="u in users" :key="u.id" class="px-0 user-row">
          <template #prepend>
            <v-avatar :color="u.role === 'ADMIN' ? 'primary' : 'surface-container'" size="40" class="mr-3">
              <span>{{ u.nickname?.charAt(0) }}</span>
            </v-avatar>
          </template>
          <v-list-item-title class="d-flex align-center flex-wrap ga-1">
            <span class="font-weight-medium">{{ u.nickname }}</span>
            <v-chip v-if="u.role === 'ADMIN'" size="x-small" color="primary" variant="flat">관리자</v-chip>
            <v-chip v-if="u.id === myId" size="x-small" variant="outlined">나</v-chip>
            <v-chip v-if="!u.active" size="x-small" color="grey" variant="tonal">비활성</v-chip>
          </v-list-item-title>
          <v-list-item-subtitle>
            {{ u.email }}
            <!-- 좁은 화면에서는 이메일만 (오른쪽 버튼 때문에 잘리지 않도록) -->
            <span class="d-none d-sm-inline">
              · 분류 {{ u.totalClassifications ?? 0 }}회 · {{ formatDate(u.createdAt) }} 가입
            </span>
          </v-list-item-subtitle>
          <template #append>
            <v-tooltip v-if="u.id === myId" text="자기 자신의 권한은 바꿀 수 없습니다" location="top">
              <template #activator="{ props: tip }">
                <span v-bind="tip"><v-btn variant="text" size="small" disabled>권한 변경</v-btn></span>
              </template>
            </v-tooltip>
            <v-btn
              v-else-if="u.role === 'ADMIN'"
              variant="text"
              size="small"
              :loading="busyId === u.id"
              @click="confirmRole(u, 'USER')"
            >
              일반 사용자로 변경
            </v-btn>
            <v-btn
              v-else
              variant="outlined"
              size="small"
              color="primary"
              :loading="busyId === u.id"
              @click="confirmRole(u, 'ADMIN')"
            >
              관리자로 지정
            </v-btn>
            <!-- 그 밖의 작업: 모바일에서 버튼이 늘어나지 않게 메뉴로 -->
            <v-menu v-if="u.id !== myId" location="bottom end">
              <template #activator="{ props: menuProps }">
                <v-btn
                  v-bind="menuProps"
                  icon="mdi-dots-vertical"
                  size="small"
                  variant="text"
                  :aria-label="`${u.nickname} 더보기`"
                />
              </template>
              <v-list density="compact">
                <v-list-item prepend-icon="mdi-lock-reset" title="비밀번호 초기화" @click="confirmReset(u)" />
              </v-list>
            </v-menu>
          </template>
        </v-list-item>
      </v-list>
      <div v-if="hasMore" class="text-center mt-2">
        <v-btn variant="text" :loading="loadingMore" @click="loadMore">더 보기</v-btn>
      </div>
    </template>

    <!-- 비밀번호 초기화 확인 -->
    <v-dialog v-model="resetDialog" max-width="440">
      <v-card title="비밀번호 초기화">
        <v-card-text>
          <b>{{ resetTarget?.nickname }}</b>({{ resetTarget?.email }})의 비밀번호를 임시 비밀번호로 바꿀까요?
          <ul class="text-body-2 text-medium-emphasis mt-3 pl-4">
            <li>지금 비밀번호로는 더 이상 로그인할 수 없습니다.</li>
            <li>임시 비밀번호로 로그인하면 바로 새 비밀번호를 설정해야 합니다.</li>
            <li>이미 보낸 재설정 메일 링크도 무효가 됩니다.</li>
          </ul>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="resetDialog = false">취소</v-btn>
          <v-btn color="error" variant="flat" :loading="resetting" @click="applyReset">초기화</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 임시 비밀번호 (한 번만 보여줌) -->
    <v-dialog v-model="tempDialog" max-width="440" persistent>
      <v-card title="임시 비밀번호">
        <v-card-text>
          <p class="text-body-2 mb-3">
            <b>{{ tempFor?.nickname }}</b>님에게 안전한 경로로 전달해 주세요.
            <b>이 창을 닫으면 다시 볼 수 없습니다.</b>
          </p>
          <div class="temp-box d-flex align-center pa-3 mb-2">
            <code class="temp-password flex-grow-1">{{ tempPassword }}</code>
            <v-btn
              :icon="copied ? 'mdi-check' : 'mdi-content-copy'"
              size="small"
              variant="text"
              :color="copied ? 'primary' : undefined"
              aria-label="임시 비밀번호 복사"
              @click="copyTemp"
            />
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" variant="flat" @click="closeTemp">확인했습니다</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 권한 변경 확인 -->
    <v-dialog v-model="roleDialog" max-width="440">
      <v-card :title="roleTarget?.role === 'ADMIN' ? '관리자로 지정' : '관리자 권한 회수'">
        <v-card-text>
          <template v-if="roleTarget?.role === 'ADMIN'">
            <b>{{ roleTarget?.user.nickname }}</b>({{ roleTarget?.user.email }})에게 관리자 권한을 줄까요?
            오분류 검수, 학습 데이터, 배출 규정, AI 모델, 사용자 권한을 모두 관리할 수 있게 됩니다.
          </template>
          <template v-else>
            <b>{{ roleTarget?.user.nickname }}</b>({{ roleTarget?.user.email }})의 관리자 권한을 회수할까요?
            관리자 기능은 즉시 사용할 수 없게 됩니다.
          </template>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="roleDialog = false">취소</v-btn>
          <v-btn
            :color="roleTarget?.role === 'ADMIN' ? 'primary' : 'error'"
            variant="flat"
            @click="applyRole"
          >
            {{ roleTarget?.role === 'ADMIN' ? '지정' : '회수' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 관리자 계정 만들기 -->
    <v-dialog v-model="createDialog" max-width="460">
      <v-card title="관리자 계정 만들기">
        <v-card-text>
          <p class="text-body-2 text-medium-emphasis mb-4">
            이미 가입한 사람이라면 목록에서 <b>관리자로 지정</b>하세요. 만든 계정의 초기 비밀번호는 안전한 경로로
            전달해 주세요.
          </p>
          <v-form ref="formRef" @submit.prevent="create">
            <v-text-field
              v-model="form.email"
              label="이메일"
              type="email"
              autocomplete="off"
              variant="outlined"
              :rules="rules.email"
              class="mb-2"
            />
            <v-text-field
              v-model="form.nickname"
              label="닉네임"
              variant="outlined"
              counter="20"
              :rules="rules.nickname"
              class="mb-2"
            />
            <v-text-field
              v-model="form.password"
              label="초기 비밀번호"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="new-password"
              :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
              variant="outlined"
              hint="영문과 숫자를 포함해 8자 이상"
              :rules="rules.password"
              @click:append-inner="showPassword = !showPassword"
            />
          </v-form>
          <v-alert v-if="formError" type="error" variant="tonal" density="compact" class="mt-2" :text="formError" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="createDialog = false">취소</v-btn>
          <v-btn color="primary" variant="flat" :loading="saving" @click="create">만들기</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { changeUserRole, createAdminAccount, fetchAdminUsers, resetUserPassword } from '@/api/admin'
import { toErrorMessage } from '@/api/http'
import { useAuthStore } from '@/stores/auth'

const emit = defineEmits(['changed', 'notify'])
const PAGE_SIZE = 20

const authStore = useAuthStore()
const myId = computed(() => authStore.user?.id)

const users = ref([])
const query = ref('')
const appliedQuery = ref('')
const page = ref(0)
const hasMore = ref(false)
const loading = ref(false)
const loadingMore = ref(false)
const error = ref('')
const busyId = ref(null)

const roleDialog = ref(false)
const roleTarget = ref(null) // { user, role }

const createDialog = ref(false)
const formRef = ref(null)
const form = reactive({ email: '', nickname: '', password: '' })
const showPassword = ref(false)
const formError = ref('')
const saving = ref(false)

// 회원가입과 같은 규칙 (서버도 다시 검사)
const rules = {
  email: [
    (v) => !!v || '이메일을 입력해 주세요.',
    (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || '올바른 이메일 형식이 아닙니다.'
  ],
  nickname: [
    (v) => !!v?.trim() || '닉네임을 입력해 주세요.',
    (v) => v.trim().length <= 20 || '20자 이하로 입력해 주세요.'
  ],
  password: [
    (v) => !!v || '비밀번호를 입력해 주세요.',
    (v) => (v.length >= 8 && v.length <= 64) || '8~64자로 입력해 주세요.',
    (v) => (/[A-Za-z]/.test(v) && /\d/.test(v)) || '영문과 숫자를 모두 포함해 주세요.'
  ]
}

const dateFormat = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })
const formatDate = (v) => {
  const d = v ? new Date(v) : null
  return d && !Number.isNaN(d.getTime()) ? dateFormat.format(d) : '-'
}

async function fetchPage(p) {
  return fetchAdminUsers({ query: appliedQuery.value, page: p, size: PAGE_SIZE })
}

async function search() {
  appliedQuery.value = (query.value || '').trim()
  loading.value = true
  error.value = ''
  try {
    const res = await fetchPage(0)
    users.value = res.users
    hasMore.value = res.hasMore
    page.value = 0
  } catch (e) {
    error.value = toErrorMessage(e)
  } finally {
    loading.value = false
  }
}

function clearSearch() {
  query.value = ''
  search()
}

async function loadMore() {
  loadingMore.value = true
  try {
    const res = await fetchPage(page.value + 1)
    // 그 사이 새 가입자가 생겨 페이지가 밀린 경우 중복 제거
    const seen = new Set(users.value.map((u) => u.id))
    users.value = [...users.value, ...res.users.filter((u) => !seen.has(u.id))]
    hasMore.value = res.hasMore
    page.value += 1
  } catch (e) {
    error.value = toErrorMessage(e)
  } finally {
    loadingMore.value = false
  }
}

function replaceUser(updated) {
  users.value = users.value.map((u) => (u.id === updated.id ? updated : u))
}

function confirmRole(user, role) {
  roleTarget.value = { user, role }
  roleDialog.value = true
}

async function applyRole() {
  const { user, role } = roleTarget.value
  roleDialog.value = false
  busyId.value = user.id
  error.value = ''
  try {
    replaceUser(await changeUserRole(user.id, role))
    emit('changed')
    emit(
      'notify',
      role === 'ADMIN' ? `${user.nickname}님을 관리자로 지정했습니다.` : `${user.nickname}님의 관리자 권한을 회수했습니다.`
    )
  } catch (e) {
    error.value = toErrorMessage(e)
  } finally {
    busyId.value = null
  }
}

// 비밀번호 초기화
const resetDialog = ref(false)
const resetTarget = ref(null)
const resetting = ref(false)
const tempDialog = ref(false)
const tempFor = ref(null)
const tempPassword = ref('')
const copied = ref(false)

function confirmReset(user) {
  resetTarget.value = user
  resetDialog.value = true
}

async function applyReset() {
  const user = resetTarget.value
  resetting.value = true
  error.value = ''
  try {
    const { temporaryPassword } = await resetUserPassword(user.id)
    resetDialog.value = false
    tempFor.value = user
    tempPassword.value = temporaryPassword
    copied.value = false
    tempDialog.value = true
  } catch (e) {
    resetDialog.value = false
    error.value = toErrorMessage(e)
  } finally {
    resetting.value = false
  }
}

async function copyTemp() {
  try {
    await navigator.clipboard.writeText(tempPassword.value)
    copied.value = true
  } catch {
    // 클립보드 권한이 없으면 화면의 값을 직접 선택해 복사
    copied.value = false
  }
}

function closeTemp() {
  tempDialog.value = false
  tempPassword.value = '' // 메모리에도 남기지 않음
  emit('notify', `${tempFor.value?.nickname}님의 비밀번호를 초기화했습니다.`)
}

function openCreate() {
  Object.assign(form, { email: '', nickname: '', password: '' })
  formError.value = ''
  showPassword.value = false
  createDialog.value = true
}

async function create() {
  const { valid } = await formRef.value.validate()
  if (!valid) return
  saving.value = true
  formError.value = ''
  try {
    const created = await createAdminAccount({
      email: form.email.trim(),
      nickname: form.nickname.trim(),
      password: form.password
    })
    users.value = [created, ...users.value.filter((u) => u.id !== created.id)]
    createDialog.value = false
    emit('changed')
    emit('notify', `관리자 계정 ${created.email}을(를) 만들었습니다.`)
  } catch (e) {
    // 3001(이미 가입된 이메일)은 서버 안내("목록에서 관리자로 지정하세요")를 그대로 보여준다
    formError.value = e.response?.data?.errorCode === '3001' ? e.response.data.message : toErrorMessage(e)
  } finally {
    saving.value = false
  }
}

onMounted(search)
</script>

<style scoped>
.search-field {
  max-width: 360px;
}
.temp-box {
  border: 1px dashed rgba(var(--v-theme-on-surface), 0.3);
  border-radius: 8px;
}
.temp-password {
  font-size: 1.25rem;
  letter-spacing: 0.08em;
  user-select: all; /* 한 번 클릭으로 전체 선택 */
}
.user-row + .user-row {
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}
</style>
