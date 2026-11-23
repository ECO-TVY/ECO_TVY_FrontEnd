<template>
  <v-container class="fill-height auth-bg" fluid>
    <v-row justify="center" align="center">
      <v-col cols="12" sm="8" md="5" lg="4">
        <v-card class="pa-6 pa-sm-8" elevation="8" rounded="lg">
          <div class="text-center mb-6">
            <v-avatar color="primary" size="56" class="mb-3">
              <v-icon icon="mdi-lock-question" size="30" color="white" />
            </v-avatar>
            <h1 class="text-h5 font-weight-bold">비밀번호 찾기</h1>
            <p class="text-body-2 text-medium-emphasis mt-1">
              가입한 이메일을 입력하면 비밀번호 재설정 링크를 보내드려요.
            </p>
          </div>

          <!-- 보낸 뒤: 가입 여부와 관계없이 같은 안내 (서버도 같은 응답) -->
          <template v-if="sent">
            <v-alert type="success" variant="tonal" class="mb-4" icon="mdi-email-check-outline">
              <div class="font-weight-medium mb-1">{{ sentMessage }}</div>
              <div class="text-body-2">
                <b>{{ email }}</b> 메일함을 확인해 주세요. 링크는 30분 동안 한 번만 쓸 수 있습니다. 메일이 보이지
                않으면 스팸함도 확인해 주세요.
              </div>
            </v-alert>
            <v-btn block variant="tonal" color="primary" :disabled="cooldown > 0" @click="sent = false">
              {{ cooldown > 0 ? `다시 보내기 (${cooldown}초)` : '다른 이메일로 다시 보내기' }}
            </v-btn>
          </template>

          <template v-else>
            <v-alert v-if="errorMessage" type="error" variant="tonal" density="compact" class="mb-4" :text="errorMessage" />
            <v-form ref="formRef" @submit.prevent="onSubmit">
              <v-text-field
                v-model="email"
                label="이메일"
                type="email"
                autocomplete="email"
                prepend-inner-icon="mdi-email-outline"
                variant="outlined"
                :rules="emailRules"
                :disabled="loading"
                autofocus
                class="mb-2"
              />
              <v-btn type="submit" color="primary" size="large" block :loading="loading">재설정 링크 받기</v-btn>
            </v-form>
          </template>

          <div class="text-center text-body-2 mt-6">
            <router-link :to="{ name: 'login' }" class="text-primary">로그인으로 돌아가기</router-link>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { onBeforeUnmount, ref } from 'vue'
import { requestPasswordReset } from '@/api/endpoints'
import { toErrorMessage } from '@/api/http'

const COOLDOWN_SECONDS = 60 // 서버 app.password-reset.cooldown 과 같게

const formRef = ref(null)
const email = ref('')
const loading = ref(false)
const errorMessage = ref('')
const sent = ref(false)
const sentMessage = ref('')
const cooldown = ref(0)
let timer = null

const emailRules = [
  (v) => !!v || '이메일을 입력해 주세요.',
  (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || '올바른 이메일 형식이 아닙니다.'
]

function startCooldown() {
  cooldown.value = COOLDOWN_SECONDS
  clearInterval(timer)
  timer = setInterval(() => {
    cooldown.value -= 1
    if (cooldown.value <= 0) clearInterval(timer)
  }, 1000)
}

async function onSubmit() {
  const { valid } = await formRef.value.validate()
  if (!valid) return
  loading.value = true
  errorMessage.value = ''
  try {
    sentMessage.value = await requestPasswordReset(email.value.trim())
    sent.value = true
    startCooldown()
  } catch (e) {
    errorMessage.value = toErrorMessage(e)
  } finally {
    loading.value = false
  }
}

onBeforeUnmount(() => clearInterval(timer))
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
