<template>
  <!-- 모바일은 아래에서 올라오는 시트, 데스크톱은 가운데 다이얼로그 -->
  <component
    :is="smAndDown ? VBottomSheet : VDialog"
    v-model="open"
    :max-width="smAndDown ? undefined : 520"
    scrollable
  >
    <v-card v-if="item" rounded="lg">
      <div class="photo-wrap">
        <v-img :src="item.imageUrl" :alt="`${type.label} 사진`" cover height="240" class="bg-surface-container">
          <template #error>
            <div class="d-flex align-center justify-center fill-height text-medium-emphasis">
              <v-icon :icon="type.icon" size="48" />
            </div>
          </template>
        </v-img>
        <v-btn
          icon="mdi-close"
          size="small"
          variant="flat"
          class="close-btn"
          aria-label="닫기"
          @click="open = false"
        />
      </div>

      <v-card-text class="pa-5">
        <div class="d-flex align-center mb-4">
          <v-avatar color="primary-container" size="44" class="mr-3">
            <v-icon :icon="type.icon" color="primary" />
          </v-avatar>
          <div class="min-w-0">
            <div class="text-h6 font-weight-bold">{{ item.wasteTypeDisplayName || type.label }}</div>
            <div class="text-caption text-medium-emphasis">{{ formatDateTime(item.createdAt) }}</div>
          </div>
          <v-spacer />
          <v-chip size="small" variant="tonal" :color="low ? 'warning' : 'primary'">
            신뢰도 {{ percent(item.confidence) }}
          </v-chip>
        </div>

        <DisposalStatus :day="item.disposalDay" :time="item.disposalTime" class="mb-4" />
        <DisposalGuide :guide="item.disposalGuide" />

        <v-divider class="my-4" />
        <ReportPicker
          :classification-id="item.id"
          :current-type="item.wasteType"
          :already-reported="!!item.reported"
          @reported="emit('reported', item.id)"
        />
      </v-card-text>
    </v-card>
  </component>
</template>

<script setup>
import { computed } from 'vue'
import { useDisplay } from 'vuetify'
import { VBottomSheet } from 'vuetify/components/VBottomSheet'
import { VDialog } from 'vuetify/components/VDialog'
import { LOW_CONFIDENCE, wasteTypeOf } from '@/constants/wasteTypes'
import { formatDateTime, percent } from '@/utils/format'
import DisposalStatus from '@/components/waste/DisposalStatus.vue'
import DisposalGuide from '@/components/waste/DisposalGuide.vue'
import ReportPicker from '@/components/waste/ReportPicker.vue'

const open = defineModel({ type: Boolean, default: false })
const props = defineProps({ item: { type: Object, default: null } })
const emit = defineEmits(['reported'])

const { smAndDown } = useDisplay()
const type = computed(() => wasteTypeOf(props.item?.wasteType))
const low = computed(() => props.item?.confidence != null && props.item.confidence < LOW_CONFIDENCE)
</script>

<style scoped>
.photo-wrap {
  position: relative;
}
.close-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(255, 255, 255, 0.9);
}
.min-w-0 {
  min-width: 0;
}
</style>
