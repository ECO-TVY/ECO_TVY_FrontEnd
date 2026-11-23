<template>
  <v-app>
    <!-- 로그인 등 공개 화면은 상단 바 없이 전체 화면으로 -->
    <template v-if="!route.meta.public">
      <v-app-bar color="surface" density="comfortable" flat border="b">
        <v-app-bar-title>
          <router-link :to="{ name: 'home' }" class="brand" aria-label="ECO_TVY 홈">
            <v-icon icon="mdi-recycle" color="primary" class="mr-2" />
            <span class="font-weight-bold">ECO_TVY</span>
          </router-link>
        </v-app-bar-title>

        <!-- 데스크톱: 상단 메뉴. 초기 비밀번호를 바꾸기 전에는 숨긴다 (눌러도 변경 화면으로 되돌아오므로) -->
        <template v-if="!mobile && showNav">
          <v-btn
            v-for="item in desktopNav"
            :key="item.name"
            :to="{ name: item.name }"
            :prepend-icon="item.icon"
            :exact="item.exact"
            variant="text"
            color="primary"
            class="mx-1"
          >
            {{ item.label }}
          </v-btn>
        </template>

        <template #append>
          <!-- 계정 메뉴: 내 정보, 비밀번호, 테마, 로그아웃을 한 곳에 -->
          <v-menu location="bottom end" :close-on-content-click="false">
            <template #activator="{ props: menuProps }">
              <v-btn v-bind="menuProps" icon variant="text" aria-label="계정 메뉴" class="mr-1">
                <v-avatar color="primary" size="32">
                  <span class="text-body-2 font-weight-bold">{{ initial }}</span>
                </v-avatar>
              </v-btn>
            </template>
            <v-card min-width="240">
              <v-list density="comfortable" nav>
                <v-list-item
                  :title="`${authStore.user?.nickname ?? ''}님`"
                  :subtitle="authStore.user?.email"
                  class="mb-1"
                />
                <v-divider class="mb-1" />
                <v-list-item
                  v-if="showNav"
                  :to="{ name: 'me' }"
                  prepend-icon="mdi-account-circle-outline"
                  title="내 정보"
                />
                <v-list-item :to="{ name: 'change-password' }" prepend-icon="mdi-lock-reset" title="비밀번호 변경" />
                <v-list-item prepend-icon="mdi-theme-light-dark" title="화면 테마">
                  <v-btn-toggle
                    :model-value="themePref"
                    density="compact"
                    variant="outlined"
                    divided
                    mandatory
                    class="mt-2"
                    @update:model-value="setThemePref"
                  >
                    <v-btn value="system" size="small">자동</v-btn>
                    <v-btn value="light" size="small" aria-label="밝게"><v-icon icon="mdi-white-balance-sunny" /></v-btn>
                    <v-btn value="dark" size="small" aria-label="어둡게"><v-icon icon="mdi-weather-night" /></v-btn>
                  </v-btn-toggle>
                </v-list-item>
                <v-divider class="my-1" />
                <v-list-item prepend-icon="mdi-logout" title="로그아웃" @click="onLogout" />
              </v-list>
            </v-card>
          </v-menu>
        </template>
      </v-app-bar>

      <!-- 모바일: 엄지로 닿는 하단 내비게이션 + 가운데 촬영 버튼 -->
      <v-bottom-navigation v-if="mobile && showNav" grow color="primary" height="64" class="bottom-nav">
        <v-btn :to="{ name: 'home' }" exact>
          <v-icon icon="mdi-home-outline" />
          <span>홈</span>
        </v-btn>
        <v-btn :to="{ name: 'history' }">
          <v-icon icon="mdi-history" />
          <span>기록</span>
        </v-btn>
        <div class="capture-slot">
          <v-btn
            icon="mdi-camera"
            color="primary"
            variant="flat"
            size="56"
            class="capture-btn"
            aria-label="사진 찍어 분류하기"
            @click="openCamera"
          />
        </div>
        <v-btn v-if="authStore.isAdmin" :to="{ name: 'admin' }">
          <v-icon icon="mdi-shield-account-outline" />
          <span>관리자</span>
        </v-btn>
        <v-btn :to="{ name: 'me' }">
          <v-icon icon="mdi-account-circle-outline" />
          <span>내 정보</span>
        </v-btn>
      </v-bottom-navigation>
      <input
        ref="cameraInput"
        type="file"
        accept="image/*"
        capture="environment"
        class="d-none"
        @change="onCameraPicked"
      />
    </template>

    <v-main>
      <router-view />
    </v-main>

    <!-- 전역 알림 (composables/useNotify) -->
    <v-snackbar
      :key="notice.key"
      v-model="notice.show"
      :timeout="notice.timeout"
      :color="noticeColor"
      :location="mobile ? 'top' : 'bottom'"
    >
      <div class="d-flex align-center">
        <v-icon v-if="notice.icon" :icon="notice.icon" class="mr-2" />
        <span>{{ notice.text }}</span>
      </div>
      <template v-if="notice.action" #actions>
        <v-btn variant="text" @click="runNoticeAction">{{ notice.action.label }}</v-btn>
      </template>
    </v-snackbar>
  </v-app>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDisplay } from 'vuetify'
import { useAuthStore } from '@/stores/auth'
import { usePendingPhotoStore } from '@/stores/pendingPhoto'
import { useNotify } from '@/composables/useNotify'
import { useThemePreference } from '@/composables/useThemePreference'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const pendingPhoto = usePendingPhotoStore()
const { smAndDown: mobile } = useDisplay()
const { state: notice } = useNotify()
const { pref: themePref, setPref: setThemePref } = useThemePreference()

const cameraInput = ref(null)

const showNav = computed(() => !authStore.mustChangePassword)
const initial = computed(() => authStore.user?.nickname?.charAt(0) || '?')

const desktopNav = computed(() => [
  { name: 'home', label: '홈', icon: 'mdi-home-outline', exact: true },
  { name: 'history', label: '기록', icon: 'mdi-history' },
  ...(authStore.isAdmin ? [{ name: 'admin', label: '관리자', icon: 'mdi-shield-account-outline' }] : [])
])

const noticeColor = computed(
  () => ({ success: 'primary', error: 'error', celebrate: 'secondary' })[notice.type] || undefined
)

function runNoticeAction() {
  notice.action?.onClick?.()
  notice.show = false
}

/** 카메라는 이 클릭 안에서 바로 연다 (화면 이동 뒤에 열면 iOS에서 막힐 수 있음) */
function openCamera() {
  cameraInput.value?.click()
}

function onCameraPicked(e) {
  const f = e.target.files?.[0]
  e.target.value = ''
  if (!f) return
  pendingPhoto.put(f)
  if (route.name !== 'home') router.push({ name: 'home' })
}

function onLogout() {
  authStore.logout()
  router.replace({ name: 'login' })
}
</script>

<style scoped>
.brand {
  display: inline-flex;
  align-items: center;
  color: inherit;
  text-decoration: none;
}
/* 아이폰 홈 인디케이터 영역만큼 띄움 */
.bottom-nav {
  padding-bottom: env(safe-area-inset-bottom);
}
.capture-slot {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 72px;
}
/* v-bottom-navigation이 자식 버튼의 색/variant를 덮어쓰므로 촬영 버튼은 직접 지정 */
.capture-btn {
  transform: translateY(-14px);
  background-color: rgb(var(--v-theme-primary)) !important;
  color: rgb(var(--v-theme-on-primary)) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}
</style>
