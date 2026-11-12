<template>
  <section>
    <p id="identity">账号 {{ username }}</p>
    <p v-if="loadError" role="alert">{{ loadError }}</p>
    <table v-else id="order-table">
      <thead><tr><th>订单号</th><th>商品</th><th>金额</th><th>状态</th></tr></thead>
      <tbody>
        <tr v-for="order in orders" :key="order.id">
          <td>{{ order.id }}</td><td>{{ order.item }}</td><td>{{ order.amount }}</td><td>{{ order.state }}</td>
        </tr>
      </tbody>
    </table>
    <button id="logout" @click="logout">退出登录</button>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { api, clearToken, hasToken } from '../api.js';

const router = useRouter();
const username = ref('');
const orders = ref([]);
const loadError = ref('');

onMounted(async () => {
  try {
    const [{ data: me }, { data: list }] = await Promise.all([api('/api/me'), api('/api/orders')]);
    username.value = me.username;
    orders.value = list;
  } catch (e) {
    if (e.status === 401) { clearToken(); router.push('/login'); return; }
    loadError.value = e.message;
  }
});

async function logout() {
  try { await api('/api/logout', { method: 'POST' }); } finally {
    clearToken();
    router.push('/login');
  }
}

if (!hasToken()) router.replace('/login');
</script>
