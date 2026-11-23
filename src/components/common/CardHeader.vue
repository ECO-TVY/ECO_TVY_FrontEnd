<template>
  <!-- 카드 제목 공통 형태: 아이콘 + 제목 (+ 부제) + 오른쪽 동작 -->
  <div class="card-header px-6 pt-5" :class="subtitle ? 'pb-1' : 'pb-3'">
    <div class="d-flex align-center">
      <v-icon v-if="icon" :icon="icon" color="primary" class="mr-2" />
      <h2 class="text-h6 font-weight-bold">{{ title }}</h2>
      <v-spacer />
      <slot name="append" />
    </div>
    <div v-if="subtitle" class="text-body-2 text-medium-emphasis mt-1">{{ subtitle }}</div>
  </div>
</template>

<script setup>
defineProps({
  icon: { type: String, default: '' },
  title: { type: String, required: true },
  subtitle: { type: String, default: '' }
})
</script>
