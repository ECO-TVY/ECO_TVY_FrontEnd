import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '../views/dashboard/DashboardView.vue'
import { useAuthStore } from '@/stores/auth'

/**
 * meta.public: true 인 화면만 로그인 없이 접근 가능.
 * meta.guestOnly: true 인 화면은 로그인 상태면 홈으로 보낸다.
 * meta.adminOnly: true 인 화면은 관리자(role=ADMIN)가 아니면 홈으로 보낸다.
 * 나머지는 로그인하지 않으면 /login으로 이동한다.
 */
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/auth/LoginView.vue'),
      meta: { public: true, guestOnly: true }
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/auth/RegisterView.vue'),
      meta: { public: true, guestOnly: true }
    },
    {
      path: '/',
      name: 'home',
      component: DashboardView
    },
    {
      path: '/history',
      name: 'history',
      component: () => import('../views/history/HistoryView.vue')
    },
    {
      path: '/me',
      name: 'me',
      component: () => import('../views/account/MyPageView.vue')
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('../views/admin/AdminView.vue'),
      meta: { adminOnly: true }
    },
    {
      path: '/account/password',
      name: 'change-password',
      component: () => import('../views/account/ChangePasswordView.vue')
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: () => import('../views/auth/ForgotPasswordView.vue'),
      meta: { public: true, guestOnly: true }
    },
    {
      // 메일 링크로 들어오는 화면. 다른 계정으로 로그인한 상태에서도 열 수 있게 guestOnly 아님
      path: '/reset-password',
      name: 'reset-password',
      component: () => import('../views/auth/ResetPasswordView.vue'),
      meta: { public: true }
    },
    // 없는 주소(예: 삭제된 /about)는 홈으로
    { path: '/:pathMatch(.*)*', redirect: { name: 'home' } }
  ]
})

router.beforeEach((to) => {
  const authStore = useAuthStore()

  // 로그인/회원가입 화면은 이미 로그인한 사용자에게 보여주지 않음
  if (to.meta.guestOnly && authStore.isAuthenticated) {
    return { name: 'home' }
  }
  if (!to.meta.public && !authStore.isAuthenticated) {
    // 저장된 토큰이 만료된 경우 정리
    if (authStore.token) authStore.logout()
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  // 초기 비밀번호를 바꾸기 전에는 비밀번호 변경 화면만 (서버도 다른 API를 3006으로 막는다)
  if (authStore.isAuthenticated && authStore.mustChangePassword && to.name !== 'change-password') {
    return { name: 'change-password' }
  }
  // 화면 숨김용 체크일 뿐, 실제 권한 검사는 백엔드(/api/admin/** → ROLE_ADMIN)가 한다
  if (to.meta.adminOnly && !authStore.isAdmin) {
    return { name: 'home' }
  }
})

export default router
