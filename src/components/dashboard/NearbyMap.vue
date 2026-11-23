<template>
  <!-- 카카오 키가 없거나 SDK 로드에 실패하면 아무것도 그리지 않는다 (목록만으로도 쓸 수 있게) -->
  <div v-show="ready" ref="el" class="map" role="region" aria-label="가까운 배출 장소 지도" />
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { loadKakaoMaps } from '@/utils/address'

const props = defineProps({
  /** 기준 위치 (등록 주소) */
  center: { type: Object, required: true }, // { latitude, longitude }
  points: { type: Array, default: () => [] },
  selectedId: { type: [Number, String], default: null }
})
const emit = defineEmits(['select', 'unavailable'])

const el = ref(null)
const ready = ref(false)

let maps = null
let map = null
let markers = new Map() // id → Marker
let homeOverlay = null
let labelOverlay = null

/** 이름은 DB 값이므로 innerHTML 대신 textContent로 넣는다 */
function labelElement(text, className) {
  const div = document.createElement('div')
  div.className = className
  div.textContent = text
  return div
}

function clearMarkers() {
  markers.forEach((m) => m.setMap(null))
  markers = new Map()
  labelOverlay?.setMap(null)
  labelOverlay = null
}

function render() {
  if (!map) return
  clearMarkers()

  const home = new maps.LatLng(props.center.latitude, props.center.longitude)
  homeOverlay?.setMap(null)
  homeOverlay = new maps.CustomOverlay({
    position: home,
    content: labelElement('우리 집', 'map-home'),
    yAnchor: 1.4,
    zIndex: 2
  })
  homeOverlay.setMap(map)

  const bounds = new maps.LatLngBounds()
  bounds.extend(home)
  for (const p of props.points) {
    const pos = new maps.LatLng(p.latitude, p.longitude)
    const marker = new maps.Marker({ position: pos, map, title: p.name, clickable: true })
    maps.event.addListener(marker, 'click', () => emit('select', p.id))
    markers.set(p.id, marker)
    bounds.extend(pos)
  }
  if (props.points.length) map.setBounds(bounds, 32, 32, 32, 32)
  else map.setCenter(home)

  highlight()
}

function highlight() {
  labelOverlay?.setMap(null)
  labelOverlay = null
  const p = props.points.find((x) => x.id === props.selectedId)
  if (!map || !p) return
  const pos = new maps.LatLng(p.latitude, p.longitude)
  labelOverlay = new maps.CustomOverlay({
    position: pos,
    content: labelElement(p.name, 'map-label'),
    yAnchor: 2.6,
    zIndex: 3
  })
  labelOverlay.setMap(map)
  map.panTo(pos)
}

onMounted(async () => {
  try {
    maps = await loadKakaoMaps()
  } catch {
    emit('unavailable')
    return
  }
  ready.value = true
  // v-show로 보이게 된 다음 크기를 잡아야 타일이 제대로 그려진다
  await new Promise((r) => requestAnimationFrame(r))
  if (!el.value) return
  map = new maps.Map(el.value, {
    center: new maps.LatLng(props.center.latitude, props.center.longitude),
    level: 5
  })
  map.setZoomable(false) // 페이지 스크롤 중 지도가 확대/축소되지 않도록
  map.addControl(new maps.ZoomControl(), maps.ControlPosition.RIGHT)
  render()
})

// center는 내 정보 갱신 때마다 새 객체가 되므로 좌표 값이 바뀔 때만 다시 그린다
watch(() => [props.points, props.center.latitude, props.center.longitude], render)
watch(() => props.selectedId, highlight)

onBeforeUnmount(() => {
  clearMarkers()
  homeOverlay?.setMap(null)
})
</script>

<style scoped>
.map {
  height: 220px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.08);
}
/* 오버레이는 지도 SDK가 그리므로 scoped가 안 먹는다 → :deep */
.map :deep(.map-home) {
  background: #1b5e20;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}
.map :deep(.map-label) {
  background: #fff;
  color: #1b1b1b;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid #1b5e20;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
  white-space: nowrap;
}
</style>
