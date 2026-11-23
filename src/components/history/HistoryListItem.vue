<template>
  <v-list-item class="px-1" rounded="lg" link :aria-label="`${title} 기록 상세 보기`">
    <template #prepend>
      <v-avatar size="48" rounded="lg" class="mr-3 bg-surface-container">
        <v-img :src="item.imageUrl" :alt="`${type.label} 사진`" cover>
          <template #error>
            <div class="d-flex align-center justify-center fill-height">
              <v-icon :icon="type.icon" color="grey" />
            </div>
          </template>
        </v-img>
      </v-avatar>
    </template>
    <v-list-item-title class="font-weight-medium">
      {{ title }}
      <span class="text-body-2 ml-1" :class="low ? 'text-warning' : 'text-medium-emphasis'">
        {{ percent(item.confidence, '') }}
      </span>
      <v-chip v-if="reported" size="x-small" variant="tonal" class="ml-1">신고함</v-chip>
    </v-list-item-title>
    <v-list-item-subtitle>
      {{ item.disposalDay ? `배출: ${item.disposalDay}` : '배출 규정 없음' }}
    </v-list-item-subtitle>
    <template #append>
      <span class="text-caption text-medium-emphasis">{{ timeOnly ? formatTime(item.createdAt) : formatDateTime(item.createdAt) }}</span>
    </template>
  </v-list-item>
</template>

<script setup>
import { computed } from 'vue'
import { LOW_CONFIDENCE, wasteTypeOf } from '@/constants/wasteTypes'
import { formatDateTime, formatTime, percent } from '@/utils/format'

const props = defineProps({
  item: { type: Object, required: true },
  /** 날짜별로 묶인 목록에서는 시간만 */
  timeOnly: Boolean,
  reported: Boolean
})

const type = computed(() => wasteTypeOf(props.item.wasteType))
const title = computed(() => props.item.wasteTypeDisplayName || type.value.label)
const low = computed(() => props.item.confidence != null && props.item.confidence < LOW_CONFIDENCE)
</script>
