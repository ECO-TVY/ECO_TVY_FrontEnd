<template>
  <v-container class="fill-height auth-bg" fluid>
    <v-row justify="center" align="center">
      <v-col cols="12" sm="8" md="5" lg="4">
        <v-card class="pa-6 pa-sm-8" elevation="8" rounded="lg">
          <div class="text-center mb-6">
            <v-avatar color="primary" size="56" class="mb-3">
              <v-icon icon="mdi-lock-reset" size="30" color="white" />
            </v-avatar>
            <h1 class="text-h5 font-weight-bold">새 비밀번호 설정</h1>
          </div>

          <!-- 링크에 토큰이 없음 -->
          <template v-if="!token">
            <v-alert type="warning" variant="tonal" class="mb-4" text="재설정 링크가 올바르지 않습니다. 메일의 링크를 다시 눌러 주시거나 새로 요청해 주세요." />
            <v-btn block color="primary" :to="{ name: 'forgot-password' }">재설정 링크 다시 받기</v-btn>
          </template>

          <!-- 완료 -->
          <template v-else-if="done">
            <v-alert type="success" variant="tonal" class="mb-4" text="비밀번호를 재설정했습니다. 새 비밀번호로 로그인해 주세요." />
            <v-btn block color="primary" size="large" @click="goLogin">로그인하기</v-btn>
          </template>

          <template v-else>
            <v-alert v-if="errorMessage" type="error" variant="tonal" density="compact" class="mb-4">
              {{ errorMessage }}
              <div v-if="tokenInvalid" class="mt-2">
                <router-link :to="{ name: 'forgot-password' }" class="text-error font-weight-medium">
                  재설정 링크 다시 받기
                </router-link>
              </div>
            </v-alert>
            <v-form ref="formRef" @submit.prevent="onSubmit">
              <v-text-field
                v-model="next"
                label="새 비밀번호"
                :type="show ? 'text' : 'password'"
                autocomplete="new-password"
                prepend-inner-icon="mdi-lock-plus-outline"
                :append-inner-icon="show ? 'mdi-eye-off' : 'mdi-eye'"
                variant="outlined"
                hint="영문과 숫자를 포함해 8자 이상"
                :rules="rules.next"
                :disabled="loading"
                autofocus
                class="mb-2"
                @click:append-inner="show = !show"
              />
              <v-text-field
                v-model="confirm"
                label="새 비밀번호 확인"
                :type="show ? 'text' : 'password'"
                autocomplete="new-password"
                prepend-inner-icon="mdi-lock-check-outline"
                variant="outlined"
                :rules="rules.confirm"
                :disabled="loading"
                class="mb-2"
              />
              <v-btn type="submit" color="primary" size="large" block :loading="loading">비밀번호 재설정</v-btn>
            </v-form>
          </template>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { confirmPasswordReset } from '@/api/endpoints'
import { toErrorMessage } from '@/api/http'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// 토큰은 화면 상태로만 들고, 주소창·방문 기록에서는 즉시 지운다 (공유·뒤로가기로 새지 않게)
const token = ref(typeof route.query.token === 'string' ? route.query.token : '')
if (route.query.token) router.replace({ name: 'reset-password' })

const formRef = ref(null)
const next = ref('')
const confirm = ref('')
const show = ref(false)
const loading = ref(false)
const errorMessage = ref('')
const tokenInvalid = ref(false)
const done = ref(false)

const rules = {
  next: [
    (v) => !!v || '새 비밀번호를 입력해 주세요.',
    (v) => (v.length >= 8 && v.length <= 64) || '8~64자로 입력해 주세요.',
    (v) => (/[A-Za-z]/.test(v) && /\d/.test(v)) || '영문과 숫자를 모두 포함해 주세요.'
  ],
  confirm: [
    (v) => !!v || '새 비밀번호를 한 번 더 입력해 주세요.',
    (v) => v === next.value || '새 비밀번호가 일치하지 않습니다.'
  ]
}

async function onSubmit() {
  const { valid } = await formRef.value.validate()
  if (!valid) return
  loading.value = true
  errorMessage.value = ''
  tokenInvalid.value = false
  try {
    await confirmPasswordReset(token.value, next.value)
    done.value = true
  } catch (e) {
    errorMessage.value = toErrorMessage(e)
    tokenInvalid.value = e.response?.data?.errorCode === '3007'
  } finally {
    loading.value = false
  }
}

function goLogin() {
  // 다른 계정으로 로그인돼 있었다면 정리 (방금 재설정한 계정으로 다시 로그인하도록)
  if (authStore.isAuthenticated) authStore.logout()
  router.replace({ name: 'login' })
}
</script>

<style scoped>
.auth-bg {
  background: linear-gradient(
    135deg,
    rgb(var(--v-theme-primary-container)) 0%,
    rgb(var(--v-theme-background)) 100%
  );
}
</style>
