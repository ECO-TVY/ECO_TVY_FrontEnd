import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import vuetify from './plugins/vuetify'
import './styles/global.css'
import { setupInterceptors } from './api/http'
import { useAuthStore } from './stores/auth'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
setupInterceptors(useAuthStore(pinia), router)

app.use(router).use(vuetify)

// 첫 라우팅(로그인 가드 포함)이 끝난 뒤 mount → 비로그인 상태에서 상단바가 잠깐 보이는 현상 방지
router.isReady().then(() => app.mount('#app'))
