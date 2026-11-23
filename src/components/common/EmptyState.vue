<template>
  <!-- 빈 상태: 무엇이 없는지 + (가능하면) 다음 행동 -->
  <div class="text-center text-medium-emphasis" :class="dense ? 'py-6' : 'py-10'">
    <v-icon :icon="icon" :size="dense ? 36 : 44" class="mb-2" />
    <div class="text-body-2" :class="{ 'mb-3': $slots.default }">{{ text }}</div>
    <slot />
  </div>
</template>

<script setup>
defineProps({
  icon: { type: String, required: true },
  text: { type: String, required: true },
  dense: Boolean
})
</script>
