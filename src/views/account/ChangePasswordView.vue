<template>
  <v-container class="py-8" max-width="520">
    <v-card rounded="lg" class="pa-6 pa-sm-8">
      <div class="d-flex align-center mb-2">
        <v-icon icon="mdi-lock-reset" color="primary" class="mr-2" />
        <h1 class="text-h6 font-weight-bold">비밀번호 변경</h1>
      </div>

      <v-alert
        v-if="forced"
        type="warning"
        variant="tonal"
        density="compact"
        class="my-4"
        icon="mdi-shield-alert-outline"
        text="관리자가 설정한 초기 비밀번호로 로그인했습니다. 계속하려면 새 비밀번호로 변경해 주세요."
      />
      <p v-else class="text-body-2 text-medium-emphasis mb-4">
        현재 비밀번호를 확인한 뒤 새 비밀번호로 바꿉니다.
      </p>

      <v-alert v-if="errorMessage" type="error" variant="tonal" density="compact" class="mb-4" :text="errorMessage" />

      <v-form ref="formRef" @submit.prevent="onSubmit">
        <!-- 브라우저 비밀번호 관리자가 올바른 계정에 저장하도록 username 필드를 숨겨서 제공 -->
        <input type="text" name="username" :value="authStore.user?.email" autocomplete="username" hidden readonly />
        <v-text-field
          v-model="form.current"
          :label="forced ? '초기 비밀번호' : '현재 비밀번호'"
          :type="show ? 'text' : 'password'"
          autocomplete="current-password"
          prepend-inner-icon="mdi-lock-outline"
          variant="outlined"
          :rules="rules.current"
          :disabled="loading"
          autofocus
          class="mb-2"
        />
        <v-text-field
          v-model="form.next"
          label="새 비밀번호"
          :type="show ? 'text' : 'password'"
          autocomplete="new-password"
          prepend-inner-icon="mdi-lock-plus-outline"
          :append-inner-icon="show ? 'mdi-eye-off' : 'mdi-eye'"
          variant="outlined"
          hint="영문과 숫자를 포함해 8자 이상"
          :rules="rules.next"
          :disabled="loading"
          class="mb-2"
          @click:append-inner="show = !show"
        />
        <v-text-field
          v-model="form.confirm"
          label="새 비밀번호 확인"
          :type="show ? 'text' : 'password'"
          autocomplete="new-password"
          prepend-inner-icon="mdi-lock-check-outline"
          variant="outlined"
          :rules="rules.confirm"
          :disabled="loading"
          class="mb-4"
        />
        <div class="d-flex ga-2">
          <v-btn v-if="!forced" variant="text" :disabled="loading" @click="router.back()">취소</v-btn>
          <v-btn v-else variant="text" :disabled="loading" @click="logout">로그아웃</v-btn>
          <v-spacer />
          <v-btn type="submit" color="primary" :loading="loading">변경하기</v-btn>
        </div>
      </v-form>
    </v-card>

    <v-snackbar v-model="done" :timeout="2000" color="grey-darken-4">비밀번호를 변경했습니다.</v-snackbar>
  </v-container>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { toErrorMessage } from '@/api/http'

const authStore = useAuthStore()
const router = useRouter()

// 진입 시점 기준 (변경 성공 후에도 문구가 바뀌어 깜빡이지 않게)
const forced = ref(authStore.mustChangePassword)
const formRef = ref(null)
const form = reactive({ current: '', next: '', confirm: '' })
const show = ref(false)
const loading = ref(false)
const errorMessage = ref('')
const done = ref(false)

// 회원가입과 같은 규칙 (서버도 다시 검사)
const rules = {
  current: [(v) => !!v || '현재 비밀번호를 입력해 주세요.'],
  next: [
    (v) => !!v || '새 비밀번호를 입력해 주세요.',
    (v) => (v.length >= 8 && v.length <= 64) || '8~64자로 입력해 주세요.',
    (v) => (/[A-Za-z]/.test(v) && /\d/.test(v)) || '영문과 숫자를 모두 포함해 주세요.',
    (v) => v !== form.current || '현재 비밀번호와 다른 비밀번호를 입력해 주세요.'
  ],
  confirm: [
    (v) => !!v || '새 비밀번호를 한 번 더 입력해 주세요.',
    (v) => v === form.next || '새 비밀번호가 일치하지 않습니다.'
  ]
}

async function onSubmit() {
  const { valid } = await formRef.value.validate()
  if (!valid) return
  loading.value = true
  errorMessage.value = ''
  try {
    await authStore.changePassword(form.current, form.next)
    done.value = true
    Object.assign(form, { current: '', next: '', confirm: '' })
    formRef.value.resetValidation()
    // 초기 비밀번호 변경이었다면 이제 다른 화면으로 갈 수 있다
    setTimeout(() => router.replace(forced.value ? { name: 'home' } : router.options.history.state.back || '/'), 800)
  } catch (e) {
    errorMessage.value = toErrorMessage(e)
    if (e.response?.data?.errorCode === '3004') form.current = ''
  } finally {
    loading.value = false
  }
}

function logout() {
  authStore.logout()
  router.replace({ name: 'login' })
}
</script>
