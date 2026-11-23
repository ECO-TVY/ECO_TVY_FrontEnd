<template>
  <v-card>
    <CardHeader icon="mdi-history" title="최근 분류 기록">
      <template #append>
        <v-btn
          v-if="items.length"
          :to="{ name: 'history' }"
          variant="text"
          size="small"
          append-icon="mdi-chevron-right"
        >
          전체 보기
        </v-btn>
      </template>
    </CardHeader>

    <v-card-text class="px-6 pb-6">
      <v-skeleton-loader v-if="loading" type="list-item-avatar-two-line@3" />
      <ErrorState v-else-if="error" :message="error" @retry="emit('retry')" />
      <EmptyState v-else-if="!items.length" icon="mdi-history" text="첫 번째 쓰레기를 분류해 보세요!" dense />
      <v-list v-else class="pa-0" lines="two">
        <HistoryListItem v-for="h in items" :key="h.id" :item="h" :reported="!!h.reported" @click="emit('select', h)" />
      </v-list>
    </v-card-text>
  </v-card>
</template>

<script setup>
import HistoryListItem from '@/components/history/HistoryListItem.vue'
import CardHeader from '@/components/common/CardHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'

defineProps({
  items: { type: Array, default: () => [] },
  loading: Boolean,
  error: { type: String, default: '' }
})
const emit = defineEmits(['select', 'retry'])
</script>
