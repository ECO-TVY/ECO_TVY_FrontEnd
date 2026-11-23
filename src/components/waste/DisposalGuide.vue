<template>
  <div>
    <div class="text-caption text-medium-emphasis mb-1">배출 방법</div>
    <div v-if="!steps.length" class="text-body-2 text-medium-emphasis">
      우리 동네에 등록된 배출 방법이 아직 없습니다.
    </div>
    <!-- 여러 단계로 나뉘면 체크리스트, 한 문장이면 그대로 -->
    <ol v-else-if="steps.length > 1" class="steps">
      <li v-for="(step, i) in steps" :key="i" class="step text-body-2">
        <span class="step-num">{{ i + 1 }}</span>
        <span>{{ step }}</span>
      </li>
    </ol>
    <p v-else class="text-body-2">{{ steps[0] }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { splitGuide } from '@/utils/format'

const props = defineProps({ guide: { type: String, default: '' } })
const steps = computed(() => splitGuide(props.guide))
</script>

<style scoped>
.steps {
  list-style: none;
  padding: 0;
  margin: 0;
}
.step {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 4px 0;
}
.step-num {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgb(var(--v-theme-primary-container));
  color: rgb(var(--v-theme-on-primary-container));
  font-size: 0.75rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 1px;
}
</style>
