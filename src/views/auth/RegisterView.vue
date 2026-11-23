<template>
  <v-container class="fill-height auth-bg" fluid>
    <v-row justify="center" align="center">
      <v-col cols="12" sm="10" md="6" lg="5">
        <v-card class="pa-6 pa-sm-8" elevation="8" rounded="lg">
          <div class="text-center mb-6">
            <v-avatar color="primary" size="56" class="mb-3">
              <v-icon icon="mdi-account-plus" size="30" color="white" />
            </v-avatar>
            <h1 class="text-h5 font-weight-bold">회원가입</h1>
            <p class="text-body-2 text-medium-emphasis mt-1">
              주소를 기준으로 우리 동네 분리배출 요일과 가까운 배출 장소를 알려드려요.
            </p>
          </div>

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
              v-model="form.email"
              label="이메일"
              type="email"
              autocomplete="email"
              prepend-inner-icon="mdi-email-outline"
              variant="outlined"
              :rules="rules.email"
              :disabled="loading"
              class="mb-2"
            />
            <v-text-field
              v-model="form.password"
              label="비밀번호"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="new-password"
              prepend-inner-icon="mdi-lock-outline"
              :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
              variant="outlined"
              hint="영문과 숫자를 포함해 8자 이상"
              :rules="rules.password"
              :disabled="loading"
              class="mb-2"
              @click:append-inner="showPassword = !showPassword"
            />
            <v-text-field
              v-model="form.passwordConfirm"
              label="비밀번호 확인"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="new-password"
              prepend-inner-icon="mdi-lock-check-outline"
              variant="outlined"
              :rules="rules.passwordConfirm"
              :disabled="loading"
              class="mb-2"
            />
            <v-text-field
              v-model="form.nickname"
              label="닉네임"
              autocomplete="nickname"
              prepend-inner-icon="mdi-account-outline"
              variant="outlined"
              counter="20"
              :rules="rules.nickname"
              :disabled="loading"
              class="mb-2"
            />

            <AddressPicker
              v-model="selected"
              :disabled="loading"
              @error="errorMessage = $event"
              @busy="geocoding = $event"
            />
            <v-text-field
              v-model="form.detail"
              label="상세주소 (선택)"
              placeholder="동/호수 등"
              prepend-inner-icon="mdi-home-outline"
              variant="outlined"
              :disabled="loading || !selected"
              class="mb-2"
            />

            <v-btn
              type="submit"
              color="primary"
              size="large"
              block
              :loading="loading"
              :disabled="geocoding"
            >
              가입하기
            </v-btn>
          </v-form>

          <div class="text-center text-body-2 mt-6">
            이미 계정이 있으신가요?
            <router-link :to="{ name: 'login', query: route.query }" class="text-primary">
              로그인
            </router-link>
          </div>
        </v-card>
      </v-col>
    </v-row>

  </v-container>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import http, { toErrorMessage } from '@/api/http'
import { useAuthStore } from '@/stores/auth'
import AddressPicker from '@/components/common/AddressPicker.vue'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const formRef = ref(null)
const showPassword = ref(false)
const loading = ref(false)
const geocoding = ref(false)
const errorMessage = ref('')

const form = reactive({ email: '', password: '', passwordConfirm: '', nickname: '', detail: '' })
// 주소 검색 결과 + 좌표. 좌표까지 얻어야 선택 완료로 본다.
const selected = ref(null)

const rules = {
  email: [
    (v) => !!v || '이메일을 입력해 주세요.',
    (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || '올바른 이메일 형식이 아닙니다.'
  ],
  password: [
    (v) => !!v || '비밀번호를 입력해 주세요.',
    (v) => v.length >= 8 || '8자 이상 입력해 주세요.',
    (v) => v.length <= 64 || '64자 이하로 입력해 주세요.',
    (v) => (/[A-Za-z]/.test(v) && /\d/.test(v)) || '영문과 숫자를 모두 포함해 주세요.'
  ],
  passwordConfirm: [
    (v) => !!v || '비밀번호를 한 번 더 입력해 주세요.',
    (v) => v === form.password || '비밀번호가 일치하지 않습니다.'
  ],
  nickname: [
    (v) => !!v?.trim() || '닉네임을 입력해 주세요.',
    (v) => v.trim().length <= 20 || '20자 이하로 입력해 주세요.'
  ]
}

async function onSubmit() {
  const { valid } = await formRef.value.validate()
  if (!valid) return

  loading.value = true
  errorMessage.value = ''
  const email = form.email.trim()
  try {
    await http.post('/api/users/register', {
      email,
      password: form.password,
      nickname: form.nickname.trim(),
      address: selected.value.address,
      detailAddress: [selected.value.roadAddress, form.detail.trim()].filter(Boolean).join(' '),
      latitude: selected.value.latitude,
      longitude: selected.value.longitude
    })
  } catch (error) {
    errorMessage.value = toErrorMessage(error)
    loading.value = false
    return
  }

  // 가입 성공 → 바로 로그인
  try {
    await authStore.login(email, form.password)
    router.replace('/')
  } catch {
    router.replace({ name: 'login', query: { registered: '1' } })
  } finally {
    loading.value = false
  }
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
