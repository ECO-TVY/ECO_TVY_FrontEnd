import { ref } from 'vue'
import { defineStore } from 'pinia'

/**
 * 하단 내비게이션의 [촬영] 버튼으로 찍은 사진을 대시보드의 분류 카드로 넘긴다.
 *
 * 파일 선택창은 사용자 클릭 안에서만 열 수 있어서(특히 iOS Safari),
 * "홈으로 이동한 뒤 카메라 열기"는 막힐 수 있다. 그래서 버튼이 직접 카메라를 열고,
 * 고른 파일만 여기에 맡긴 뒤 홈으로 이동한다.
 */
export const usePendingPhotoStore = defineStore('pendingPhoto', () => {
  const file = ref(null)

  function put(f) {
    file.value = f
  }

  /** 꺼내면서 비운다 (한 번만 분류되도록) */
  function take() {
    const f = file.value
    file.value = null
    return f
  }

  return { file, put, take }
})
