/**
 * 주소 검색(Daum 우편번호 서비스, 키 불필요) + 좌표 변환(카카오 지도 SDK Geocoder, JS 키 필요)
 */

const POSTCODE_SRC = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'
const KAKAO_SDK_SRC = 'https://dapi.kakao.com/v2/maps/sdk.js'

const scriptPromises = {}

function loadScript(src) {
  if (!scriptPromises[src]) {
    scriptPromises[src] = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = src
      script.async = true
      script.onload = resolve
      script.onerror = () => {
        delete scriptPromises[src] // 재시도 가능하도록
        reject(new Error(`스크립트를 불러오지 못했습니다: ${src}`))
      }
      document.head.appendChild(script)
    })
  }
  return scriptPromises[src]
}

export const kakaoKey = import.meta.env.VITE_KAKAO_JS_KEY || ''

/**
 * 우편번호 검색 UI를 element 안에 띄우고, 사용자가 주소를 고르면 resolve.
 * @returns {Promise<{address: string, roadAddress: string, zonecode: string}>}
 *   address: 백엔드 규칙 조회용 "시도 시군구 동" (예: "대전 대덕구 오정동")
 *   roadAddress: 화면 표시/상세주소용 전체 주소
 */
export async function searchAddress(element) {
  if (!window.daum?.Postcode) await loadScript(POSTCODE_SRC)

  return new Promise((resolve) => {
    new window.daum.Postcode({
      width: '100%',
      height: '100%',
      oncomplete(data) {
        const dong = data.bname || data.bname1
        resolve({
          address: [data.sido, data.sigungu, dong].filter(Boolean).join(' '),
          roadAddress: data.roadAddress || data.jibunAddress || data.address,
          zonecode: data.zonecode,
          searchKey: data.address
        })
      }
    }).embed(element)
  })
}

/** 카카오 지도 SDK(services 포함) 로드. 키가 없으면 throw */
export async function loadKakaoMaps() {
  if (!kakaoKey) {
    throw new Error('카카오 JavaScript 키(VITE_KAKAO_JS_KEY)가 설정되지 않아 좌표를 변환할 수 없습니다.')
  }
  if (!window.kakao?.maps?.services) {
    await loadScript(`${KAKAO_SDK_SRC}?appkey=${encodeURIComponent(kakaoKey)}&libraries=services&autoload=false`)
    await new Promise((resolve) => window.kakao.maps.load(resolve))
  }
  return window.kakao.maps
}

/** 주소 문자열 → { latitude, longitude } */
export async function geocode(address) {
  const maps = await loadKakaoMaps()
  return new Promise((resolve, reject) => {
    new maps.services.Geocoder().addressSearch(address, (result, status) => {
      if (status === maps.services.Status.OK && result.length > 0) {
        resolve({ latitude: Number(result[0].y), longitude: Number(result[0].x) })
      } else {
        reject(new Error('주소의 좌표를 찾지 못했습니다. 다른 주소로 검색해 주세요.'))
      }
    })
  })
}

/**
 * 브라우저 현재 위치 → { latitude, longitude }
 * 카카오 키가 없거나 주소 좌표 변환이 실패했을 때의 대안 (HTTPS 또는 localhost에서만 동작)
 */
export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('이 브라우저는 위치 정보를 지원하지 않습니다.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
      (err) =>
        reject(
          new Error(
            err.code === err.PERMISSION_DENIED
              ? '위치 권한이 거부되었습니다. 브라우저 설정에서 위치 접근을 허용해 주세요.'
              : '현재 위치를 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.'
          )
        ),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  })
}
