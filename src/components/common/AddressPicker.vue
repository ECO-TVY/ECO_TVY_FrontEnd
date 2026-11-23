<template>
  <!--
    주소 검색(Daum 우편번호) + 좌표 변환(카카오).
    좌표 변환이 실패하면(키 미설정 등) 현재 위치로 좌표를 채울 수 있게 해 흐름이 막히지 않도록 한다.
    v-model: { address, roadAddress, zonecode, latitude, longitude, coordSource } | null
  -->
  <div>
    <div class="d-flex ga-2 align-start">
      <v-text-field
        :model-value="display"
        label="주소"
        prepend-inner-icon="mdi-map-marker-outline"
        variant="outlined"
        readonly
        :rules="rules"
        :disabled="disabled"
        :loading="busy"
        :hint="hint"
        :persistent-hint="!!hint"
        class="flex-grow-1"
        @click="openPostcode"
      />
      <v-btn variant="tonal" color="primary" height="56" :disabled="disabled || busy" @click="openPostcode">
        주소 검색
      </v-btn>
    </div>

    <!-- 좌표 변환 실패 시: 주소는 유지하고 현재 위치로 좌표만 채울 수 있게 -->
    <v-alert
      v-if="pending"
      type="warning"
      variant="tonal"
      density="compact"
      class="mb-4"
      icon="mdi-map-marker-alert-outline"
    >
      <div class="text-body-2 mb-2">{{ geocodeError }}</div>
      <div class="text-body-2 mb-2">
        지금 <b>{{ pending.roadAddress }}</b> 근처에 계시다면 현재 위치로 설정할 수 있어요.
      </div>
      <v-btn
        size="small"
        color="warning"
        variant="flat"
        prepend-icon="mdi-crosshairs-gps"
        :loading="locating"
        @click="useCurrentPosition"
      >
        현재 위치로 설정
      </v-btn>
    </v-alert>

    <v-dialog v-model="postcodeOpen" max-width="500" :fullscreen="smAndDown">
      <v-card>
        <v-card-title class="d-flex align-center">
          주소 검색
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" aria-label="닫기" @click="postcodeOpen = false" />
        </v-card-title>
        <div ref="postcodeEl" class="postcode-container" />
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue'
import { useDisplay } from 'vuetify'
import { geocode, getCurrentPosition, searchAddress } from '@/utils/address'

const model = defineModel({ type: Object, default: null })
const props = defineProps({
  disabled: Boolean,
  required: { type: Boolean, default: true }
})
const emit = defineEmits(['error', 'busy'])

const { smAndDown } = useDisplay()

const postcodeEl = ref(null)
const postcodeOpen = ref(false)
const geocoding = ref(false)
const locating = ref(false)
const geocodeError = ref('')
// 주소는 골랐지만 좌표를 아직 못 얻은 상태
const pending = ref(null)

const busy = computed(() => geocoding.value || locating.value)
const display = computed(() => {
  const a = model.value || pending.value
  return a ? `(${a.zonecode}) ${a.roadAddress}` : ''
})
const hint = computed(() =>
  model.value?.coordSource === 'gps' ? '좌표는 현재 위치 기준으로 설정되었습니다.' : ''
)
const rules = computed(() =>
  props.required
    ? [() => !!model.value || (pending.value ? '좌표를 설정해 주세요.' : '주소를 검색해 주세요.')]
    : []
)

function setBusy(v) {
  emit('busy', v)
}

async function openPostcode() {
  if (props.disabled || busy.value) return
  emit('error', '')
  postcodeOpen.value = true
  await nextTick()
  await nextTick() // dialog 내용이 그려진 뒤 embed

  let picked
  try {
    picked = await searchAddress(postcodeEl.value)
  } catch (e) {
    postcodeOpen.value = false
    emit('error', e.message)
    return
  }
  postcodeOpen.value = false

  geocoding.value = true
  setBusy(true)
  geocodeError.value = ''
  try {
    const coords = await geocode(picked.searchKey)
    pending.value = null
    model.value = { ...picked, ...coords, coordSource: 'address' }
  } catch (e) {
    model.value = null
    pending.value = picked
    geocodeError.value = e.message
  } finally {
    geocoding.value = false
    setBusy(false)
  }
}

async function useCurrentPosition() {
  locating.value = true
  setBusy(true)
  try {
    const coords = await getCurrentPosition()
    model.value = { ...pending.value, ...coords, coordSource: 'gps' }
    pending.value = null
    geocodeError.value = ''
  } catch (e) {
    geocodeError.value = e.message
  } finally {
    locating.value = false
    setBusy(false)
  }
}
</script>

<style scoped>
.postcode-container {
  height: 470px;
}
:deep(.v-dialog--fullscreen) .postcode-container {
  height: calc(100vh - 64px);
}
</style>
