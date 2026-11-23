<template>
  <v-card class="h-100">
    <CardHeader icon="mdi-map-marker-radius" title="가까운 배출 장소" :subtitle="`등록된 주소 기준 반경 ${radiusKm}km`" />

    <v-card-text class="px-6 pb-6">
      <v-skeleton-loader v-if="loading" type="image, list-item-two-line@2" />
      <!-- 좌표가 없으면 에러가 아니라 "할 일"로 안내 -->
      <EmptyState
        v-else-if="needsAddress"
        icon="mdi-map-marker-question-outline"
        text="주소를 설정하면 가까운 배출 장소를 알려드려요."
        dense
      >
        <v-btn color="primary" variant="tonal" prepend-icon="mdi-map-marker-plus-outline" @click="emit('set-address')">
          주소 설정하기
        </v-btn>
      </EmptyState>
      <ErrorState v-else-if="error" :message="error" @retry="emit('retry')" />

      <template v-else>
        <NearbyMap
          v-if="center && mapAvailable"
          :center="center"
          :points="points"
          :selected-id="selectedId"
          class="mb-3"
          @select="select"
          @unavailable="mapAvailable = false"
        />

        <EmptyState
          v-if="!points.length"
          icon="mdi-map-marker-off-outline"
          :text="`반경 ${radiusKm}km 안에 등록된 배출 장소가 없어요.`"
          dense
        />

        <v-list v-else density="compact" class="pa-0">
          <!-- 항목을 누르면 지도에서 강조, 길찾기는 오른쪽 버튼으로 분리 -->
          <v-list-item
            v-for="p in visiblePoints"
            :key="p.id"
            :active="p.id === selectedId"
            color="primary"
            class="px-2"
            rounded="lg"
            :link="mapAvailable"
            @click="mapAvailable && select(p.id)"
          >
            <v-list-item-title class="font-weight-medium">{{ p.name }}</v-list-item-title>
            <v-list-item-subtitle class="text-wrap">
              {{ p.address }}<span v-if="p.description"> · {{ p.description }}</span>
            </v-list-item-subtitle>
            <template #append>
              <v-chip size="small" variant="tonal" color="primary" class="mr-1">
                {{ formatDistance(p.distanceKm) }}
              </v-chip>
              <v-btn
                icon="mdi-directions"
                size="small"
                variant="text"
                :href="mapLink(p)"
                target="_blank"
                rel="noopener"
                :aria-label="`${p.name} 카카오맵에서 보기`"
                @click.stop
              />
            </template>
          </v-list-item>
        </v-list>

        <v-btn
          v-if="points.length > LIMIT"
          variant="text"
          size="small"
          block
          class="mt-2"
          :append-icon="expanded ? 'mdi-chevron-up' : 'mdi-chevron-down'"
          @click="expanded = !expanded"
        >
          {{ expanded ? '접기' : `${points.length - LIMIT}곳 더 보기` }}
        </v-btn>
      </template>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import NearbyMap from './NearbyMap.vue'
import CardHeader from '@/components/common/CardHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'

const props = defineProps({
  points: { type: Array, default: () => [] },
  radiusKm: { type: Number, default: 2 },
  loading: Boolean,
  error: { type: String, default: '' },
  needsAddress: Boolean,
  /** 지도 기준 위치 { latitude, longitude } */
  center: { type: Object, default: null }
})
const emit = defineEmits(['set-address', 'retry'])

const LIMIT = 5
const expanded = ref(false)
const selectedId = ref(null)
const mapAvailable = ref(true)

const visiblePoints = computed(() => (expanded.value ? props.points : props.points.slice(0, LIMIT)))

watch(
  () => props.points,
  () => {
    selectedId.value = null
    expanded.value = false
  }
)

function select(id) {
  selectedId.value = selectedId.value === id ? null : id
  // 지도에서 고른 장소가 접힌 목록에 있으면 펼친다
  const idx = props.points.findIndex((p) => p.id === id)
  if (idx >= LIMIT) expanded.value = true
}

function formatDistance(km) {
  if (km == null) return '-'
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`
}

// 카카오맵 웹 링크 (키 불필요)
function mapLink(p) {
  return `https://map.kakao.com/link/map/${encodeURIComponent(p.name)},${p.latitude},${p.longitude}`
}
</script>
