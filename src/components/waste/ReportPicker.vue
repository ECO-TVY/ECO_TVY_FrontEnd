<template>
  <!-- 오분류 신고: 드롭다운 대신 종류 칩을 바로 눌러 고른다 (터치에서 한 번에) -->
  <div>
    <div v-if="reported" class="text-body-2 text-medium-emphasis d-flex align-center">
      <v-icon icon="mdi-check-circle-outline" size="small" color="primary" class="mr-1" />
      신고가 접수되었습니다. 모델 개선에 활용할게요.
    </div>

    <div v-else-if="open">
      <div class="text-body-2 mb-2">{{ prompt }}</div>
      <v-chip-group v-model="correctType" selected-class="text-primary" column :disabled="sending">
        <v-chip
          v-for="t in otherTypes"
          :key="t.value"
          :value="t.value"
          :prepend-icon="t.icon"
          variant="outlined"
          filter
        >
          {{ t.label }}
        </v-chip>
      </v-chip-group>
      <v-alert v-if="error" type="error" variant="tonal" density="compact" class="my-2" :text="error" />
      <div class="d-flex ga-2 mt-2">
        <v-btn
          color="primary"
          variant="flat"
          :disabled="!correctType"
          :loading="sending"
          @click="send"
        >
          신고하기
        </v-btn>
        <v-btn variant="text" :disabled="sending" @click="open = false">취소</v-btn>
      </div>
    </div>

    <v-btn
      v-else
      variant="text"
      size="small"
      prepend-icon="mdi-flag-outline"
      class="px-1"
      @click="open = true"
    >
      결과가 틀렸나요?
    </v-btn>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { reportMisclassification } from '@/api/endpoints'
import { toErrorMessage } from '@/api/http'
import { WASTE_TYPES } from '@/constants/wasteTypes'

const props = defineProps({
  classificationId: { type: Number, required: true },
  currentType: { type: String, default: '' },
  /** 신뢰도가 낮을 때 처음부터 펼쳐 둔다 */
  startOpen: Boolean,
  prompt: { type: String, default: '실제 종류를 골라 주세요.' }
})
const emit = defineEmits(['reported'])

const open = ref(props.startOpen)
const correctType = ref(null)
const sending = ref(false)
const reported = ref(false)
const error = ref('')

const otherTypes = computed(() => WASTE_TYPES.filter((t) => t.value !== props.currentType))

// 다른 분류 결과로 바뀌면 상태 초기화
watch(
  () => props.classificationId,
  () => {
    open.value = props.startOpen
    correctType.value = null
    reported.value = false
    error.value = ''
  }
)

async function send() {
  sending.value = true
  error.value = ''
  try {
    await reportMisclassification(props.classificationId, correctType.value)
    reported.value = true
    emit('reported', correctType.value)
  } catch (e) {
    error.value = toErrorMessage(e)
  } finally {
    sending.value = false
  }
}
</script>
