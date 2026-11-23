<template>
  <v-container class="fill-height login-bg" fluid>
    <v-row justify="center" align="center">
      <v-col cols="12" sm="8" md="5" lg="4">
        <v-card class="pa-6 pa-sm-8" elevation="8" rounded="lg">
          <div class="text-center mb-6">
            <v-avatar color="primary" size="64" class="mb-3">
              <v-icon icon="mdi-recycle" size="36" color="white" />
            </v-avatar>
            <h1 class="text-h5 font-weight-bold">ECO_TVY</h1>
            <p class="text-body-2 text-medium-emphasis mt-1">AI 쓰레기 분류 대시보드</p>
          </div>

          <v-alert
            v-if="route.query.registered && !errorMessage"
            type="success"
            variant="tonal"
            density="compact"
            class="mb-4"
            text="가입이 완료되었습니다. 로그인해 주세요."
          />
          <v-alert
            v-if="errorMessage"
            type="error"
            variant="tonal"
            density="compact"
            class="mb-4"
            :text="errorMessage"
          />

          <v-form ref="formRef" @submit.prevent="onSubmit">
            <v-text-field
              v-model="email"
              label="이메일"
              type="email"
              autocomplete="username"
              prepend-inner-icon="mdi-email-outline"
              variant="outlined"
              :rules="emailRules"
              :disabled="loading"
              autofocus
              class="mb-2"
            />
            <v-text-field
              v-model="password"
              label="비밀번호"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              prepend-inner-icon="mdi-lock-outline"
              :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
              variant="outlined"
              :rules="passwordRules"
              :disabled="loading"
              class="mb-2"
              @click:append-inner="showPassword = !showPassword"
            />
            <v-btn
              type="submit"
              color="primary"
              size="large"
              block
              :loading="loading"
            >
              로그인
            </v-btn>
          </v-form>

          <div class="text-right mt-2">
            <router-link :to="{ name: 'forgot-password' }" class="text-body-2 text-medium-emphasis">
              비밀번호를 잊으셨나요?
            </router-link>
          </div>

          <div class="text-center text-body-2 mt-6">
            아직 계정이 없으신가요?
            <router-link :to="{ name: 'register', query: route.query }" class="text-primary">
              회원가입
            </router-link>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { toErrorMessage } from '@/api/http'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const formRef = ref(null)
const email = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const errorMessage = ref('')

const emailRules = [
  (v) => !!v || '이메일을 입력해 주세요.',
  (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || '올바른 이메일 형식이 아닙니다.'
]
const passwordRules = [(v) => !!v || '비밀번호를 입력해 주세요.']

async function onSubmit() {
  const { valid } = await formRef.value.validate()
  if (!valid) return

  loading.value = true
  errorMessage.value = ''
  try {
    await authStore.login(email.value.trim(), password.value)
    // 외부 URL로의 open redirect 방지: 앱 내부 경로만 허용
    const redirect = route.query.redirect
    const target =
      typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//')
        ? redirect
        : '/'
    router.replace(target)
  } catch (error) {
    errorMessage.value = toErrorMessage(error)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-bg {
  background: linear-gradient(
    135deg,
    rgb(var(--v-theme-primary-container)) 0%,
    rgb(var(--v-theme-background)) 100%
  );
}
</style>
