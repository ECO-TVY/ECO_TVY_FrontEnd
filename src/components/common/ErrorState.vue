<template>
  <!-- 오류 + 다시 시도. 사용자가 새로고침 말고도 할 수 있는 일을 준다 -->
  <v-alert type="error" variant="tonal" density="compact">
    <div class="d-flex align-center flex-wrap ga-2">
      <span class="text-body-2 flex-grow-1">{{ message }}</span>
      <v-btn
        v-if="retryable"
        size="small"
        variant="text"
        prepend-icon="mdi-refresh"
        :loading="retrying"
        @click="emit('retry')"
      >
        다시 시도
      </v-btn>
    </div>
  </v-alert>
</template>

<script setup>
defineProps({
  message: { type: String, required: true },
  retryable: { type: Boolean, default: true },
  retrying: Boolean
})
const emit = defineEmits(['retry'])
</script>
