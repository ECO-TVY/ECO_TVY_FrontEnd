<template>
  <v-dialog v-model="open" max-width="520" :fullscreen="smAndDown" persistent>
    <v-card :title="focusAddress ? '주소 설정' : '내 정보 수정'">
      <v-card-text>
        <v-alert v-if="errorMessage" type="error" variant="tonal" density="compact" class="mb-4" :text="errorMessage" />

        <v-form ref="formRef" @submit.prevent="save">
          <v-text-field
            v-model="nickname"
            label="닉네임"
            prepend-inner-icon="mdi-account-outline"
            variant="outlined"
            counter="20"
            :rules="nicknameRules"
            :disabled="saving"
            class="mb-2"
          />

          <div class="text-caption text-medium-emphasis mb-2">
            현재 주소: {{ user?.detailAddress || user?.address || '없음' }}
          </div>
          <AddressPicker
            v-model="selected"
            :required="false"
            :disabled="saving"
            @error="errorMessage = $event"
            @busy="busy = $event"
          />
          <v-text-field
            v-if="selected"
            v-model="detail"
            label="상세주소 (선택)"
            placeholder="동/호수 등"
            prepend-inner-icon="mdi-home-outline"
            variant="outlined"
            :disabled="saving"
          />
          <!-- Enter 제출용 -->
          <button type="submit" hidden />
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" :disabled="saving" @click="open = false">취소</v-btn>
        <v-btn color="primary" variant="flat" :loading="saving" :disabled="busy" @click="save">저장</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useDisplay } from 'vuetify'
import { updateLocation, updateProfile } from '@/api/endpoints'
import { toErrorMessage } from '@/api/http'
import AddressPicker from '@/components/common/AddressPicker.vue'

const open = defineModel({ type: Boolean, default: false })
const props = defineProps({
  user: { type: Object, default: null },
  /** 주소 설정 목적으로 열었을 때 제목을 바꾼다 */
  focusAddress: Boolean
})
const emit = defineEmits(['saved'])

const { smAndDown } = useDisplay()

const formRef = ref(null)
const nickname = ref('')
const selected = ref(null)
const detail = ref('')
const saving = ref(false)
const busy = ref(false)
const errorMessage = ref('')

const nicknameRules = [
  (v) => !!v?.trim() || '닉네임을 입력해 주세요.',
  (v) => v.trim().length <= 20 || '20자 이하로 입력해 주세요.'
]

// 열 때마다 현재 값으로 초기화
watch(open, (isOpen) => {
  if (!isOpen) return
  nickname.value = props.user?.nickname || ''
  selected.value = null
  detail.value = ''
  errorMessage.value = ''
})

async function save() {
  const { valid } = await formRef.value.validate()
  if (!valid || busy.value) return

  saving.value = true
  errorMessage.value = ''
  try {
    // 좌표를 먼저 바꾼다: 프로필만 바뀌고 좌표가 실패하면 주소와 좌표가 어긋나므로
    if (selected.value) {
      await updateLocation(selected.value.latitude, selected.value.longitude)
    }
    const updated = await updateProfile({
      nickname: nickname.value.trim(),
      address: selected.value?.address,
      detailAddress: selected.value
        ? [selected.value.roadAddress, detail.value.trim()].filter(Boolean).join(' ')
        : undefined
    })
    emit('saved', updated)
    open.value = false
  } catch (error) {
    errorMessage.value = toErrorMessage(error)
  } finally {
    saving.value = false
  }
}
</script>
