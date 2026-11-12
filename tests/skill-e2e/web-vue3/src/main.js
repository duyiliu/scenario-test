import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import App from './App.vue';
import Login from './views/Login.vue';
import Orders from './views/Orders.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Orders, meta: { requiresAuth: true } },
    { path: '/login', component: Login }
  ]
});

// 路由守卫：真实 SPA 的核心形态——E2E 必须处理异步挂载与重定向
router.beforeEach((to) => {
  if (to.meta.requiresAuth && !localStorage.getItem('token')) return '/login';
});

createApp(App).use(router).mount('#app');
