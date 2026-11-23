/** 백엔드 WasteType enum과 동일한 순서/이름 */
export const WASTE_TYPES = [
  { value: 'PLASTIC', label: '플라스틱', icon: 'mdi-bottle-soda-classic-outline' },
  { value: 'CAN', label: '캔', icon: 'mdi-cup-outline' },
  { value: 'PAPER', label: '종이', icon: 'mdi-newspaper-variant-outline' },
  { value: 'FOOD', label: '음식물', icon: 'mdi-food-apple-outline' },
  { value: 'GENERAL', label: '일반쓰레기', icon: 'mdi-trash-can-outline' },
  { value: 'GLASS', label: '유리', icon: 'mdi-bottle-wine-outline' },
  { value: 'BATTERY', label: '건전지', icon: 'mdi-battery' },
  { value: 'LIGHT_BULB', label: '형광등', icon: 'mdi-lightbulb-outline' }
]

const byValue = Object.fromEntries(WASTE_TYPES.map((t) => [t.value, t]))

export function wasteTypeOf(value) {
  return byValue[value] || { value, label: value, icon: 'mdi-help-circle-outline' }
}

/** AI 신뢰도가 이 값 미만이면 결과를 단정하지 않고 사용자 확인을 요청한다 */
export const LOW_CONFIDENCE = 0.6
