<template>
  <v-card class="h-100" rounded="lg">
    <!-- 이미 정보가 있으면 갱신 중에도 스켈레톤으로 바꾸지 않는다 (분류 후 깜빡임 방지) -->
    <v-card-text v-if="loading && !user" :class="compact ? 'pa-4' : 'pa-6'">
      <v-skeleton-loader :type="compact ? 'list-item-avatar' : 'list-item-avatar-two-line, paragraph'" />
    </v-card-text>

    <!-- 모바일: 분류 카드를 먼저 보여주기 위해 한 줄 요약으로 -->
    <v-card-text v-else-if="user && compact" class="pa-4">
      <div class="d-flex align-center">
        <v-avatar color="primary" size="36" class="mr-3 flex-shrink-0">
          <span class="text-subtitle-1">{{ user.nickname?.charAt(0) }}</span>
        </v-avatar>
        <div class="min-w-0 flex-grow-1">
          <div class="d-flex align-baseline">
            <span class="text-subtitle-1 font-weight-bold text-truncate">{{ user.nickname }}님</span>
            <span class="text-body-2 font-weight-bold ml-2 text-primary">Lv.{{ level }}</span>
            <v-spacer />
            <span class="text-caption text-medium-emphasis ml-2 flex-shrink-0">{{ total }}회 · {{ remaining }}회 남음</span>
          </div>
          <v-progress-linear
            :model-value="progress"
            color="primary"
            height="4"
            rounded
            class="mt-1"
            :aria-label="`다음 레벨 진행률 ${progress}%`"
          />
        </div>
        <v-btn
          icon="mdi-pencil-outline"
          size="small"
          variant="text"
          aria-label="내 정보 수정"
          class="ml-1 flex-shrink-0"
          @click="emit('edit')"
        />
      </div>
    </v-card-text>

    <v-card-text v-else-if="user" class="pa-6">
      <div class="d-flex align-center mb-4">
        <v-avatar color="primary" size="48" class="mr-3">
          <span class="text-h6">{{ user.nickname?.charAt(0) }}</span>
        </v-avatar>
        <div class="min-w-0">
          <div class="text-h6 font-weight-bold">{{ user.nickname }}님, 안녕하세요</div>
          <div class="text-body-2 text-medium-emphasis text-truncate">
            <v-icon icon="mdi-map-marker-outline" size="small" />
            {{ user.detailAddress || user.address || '주소 미등록' }}
          </div>
        </div>
        <v-spacer />
        <v-btn
          icon="mdi-pencil-outline"
          size="small"
          variant="text"
          aria-label="내 정보 수정"
          class="ml-1 flex-shrink-0"
          @click="emit('edit')"
        />
      </div>

      <div class="d-flex ga-3 mb-4">
        <div class="stat flex-1-1">
          <div class="text-caption text-medium-emphasis">배출 레벨</div>
          <div class="text-h4 font-weight-bold">Lv.{{ level }}</div>
        </div>
        <div class="stat flex-1-1">
          <div class="text-caption text-medium-emphasis">총 분류 횟수</div>
          <div class="text-h4 font-weight-bold">{{ total }}<span class="text-body-1">회</span></div>
        </div>
      </div>

      <div class="d-flex justify-space-between text-caption text-medium-emphasis mb-1">
        <span>다음 레벨까지</span>
        <span>{{ remaining }}회 남음</span>
      </div>
      <v-progress-linear
        :model-value="progress"
        color="primary"
        height="8"
        rounded
        :aria-label="`다음 레벨 진행률 ${progress}%`"
      />
    </v-card-text>

    <v-card-text v-else class="pa-6">
      <ErrorState :message="error || '내 정보를 불러오지 못했습니다.'" @retry="emit('retry')" />
    </v-card-text>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'
import ErrorState from '@/components/common/ErrorState.vue'

const props = defineProps({
  user: { type: Object, default: null },
  loading: Boolean,
  error: { type: String, default: '' },
  compact: Boolean
})
const emit = defineEmits(['edit', 'retry'])

// 백엔드 User.updateLevel(): level = total / 10 + 1  → 10회마다 레벨업
const PER_LEVEL = 10
const total = computed(() => props.user?.totalClassifications ?? 0)
const level = computed(() => props.user?.level ?? Math.floor(total.value / PER_LEVEL) + 1)
const remaining = computed(() => PER_LEVEL - (total.value % PER_LEVEL))
const progress = computed(() => ((total.value % PER_LEVEL) / PER_LEVEL) * 100)
</script>

<style scoped>
.stat {
  background: rgb(var(--v-theme-surface-container));
  border-radius: 8px;
  padding: 12px 16px;
}
.min-w-0 {
  min-width: 0;
}
</style>
