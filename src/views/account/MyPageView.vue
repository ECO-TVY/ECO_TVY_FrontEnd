<template>
  <!-- 내 정보: 모바일 하단 내비게이션의 [내 정보] 목적지. 계정 관련 동작을 한 곳에 모은다 -->
  <v-container class="py-6" max-width="640">
    <h1 class="text-h5 font-weight-bold mb-4">내 정보</h1>

    <ProfileCard :user="user" :loading="loading" :error="error" class="mb-4" @edit="editOpen = true" @retry="load" />

    <v-card class="mb-4">
      <v-list lines="one" class="py-1">
        <v-list-item prepend-icon="mdi-account-edit-outline" title="닉네임 · 주소 수정" @click="editOpen = true">
          <template #append><v-icon icon="mdi-chevron-right" /></template>
        </v-list-item>
        <v-list-item :to="{ name: 'change-password' }" prepend-icon="mdi-lock-reset" title="비밀번호 변경">
          <template #append><v-icon icon="mdi-chevron-right" /></template>
        </v-list-item>
        <v-list-item :to="{ name: 'history' }" prepend-icon="mdi-history" title="분류 기록">
          <template #append><v-icon icon="mdi-chevron-right" /></template>
        </v-list-item>
        <v-list-item v-if="authStore.isAdmin" :to="{ name: 'admin' }" prepend-icon="mdi-shield-account-outline" title="관리자 화면">
          <template #append><v-icon icon="mdi-chevron-right" /></template>
        </v-list-item>
      </v-list>
    </v-card>

    <v-card class="mb-4">
      <v-list-item prepend-icon="mdi-theme-light-dark" title="화면 테마" class="py-3">
        <template #append>
          <v-btn-toggle
            :model-value="themePref"
            density="compact"
            variant="outlined"
            divided
            mandatory
            @update:model-value="setThemePref"
          >
            <v-btn value="system" size="small">자동</v-btn>
            <v-btn value="light" size="small">밝게</v-btn>
            <v-btn value="dark" size="small">어둡게</v-btn>
          </v-btn-toggle>
        </template>
      </v-list-item>
    </v-card>

    <v-btn block variant="tonal" color="error" prepend-icon="mdi-logout" size="large" @click="onLogout">로그아웃</v-btn>

    <ProfileEditDialog v-model="editOpen" :user="user" @saved="onSaved" />
  </v-container>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { fetchMe } from '@/api/endpoints'
import { toErrorMessage } from '@/api/http'
import { useAuthStore } from '@/stores/auth'
import { notify } from '@/composables/useNotify'
import { useThemePreference } from '@/composables/useThemePreference'
import ProfileCard from '@/components/dashboard/ProfileCard.vue'
import ProfileEditDialog from '@/components/dashboard/ProfileEditDialog.vue'

const router = useRouter()
const authStore = useAuthStore()
const { pref: themePref, setPref: setThemePref } = useThemePreference()

const user = ref(authStore.user)
const loading = ref(true)
const error = ref('')
const editOpen = ref(false)

async function load() {
  loading.value = true
  error.value = ''
  try {
    user.value = await fetchMe()
    authStore.setUser(user.value)
  } catch (e) {
    error.value = toErrorMessage(e)
  } finally {
    loading.value = false
  }
}

function onSaved() {
  notify('내 정보가 저장되었습니다.', { type: 'success' })
  load()
}

function onLogout() {
  authStore.logout()
  router.replace({ name: 'login' })
}

onMounted(load)
</script>
