<template>
  <form @submit.prevent="submit">
    <label>账号 <input v-model="username" name="username" /></label>
    <label>密码 <input v-model="password" name="password" type="password" /></label>
    <button type="submit" :disabled="loading">{{ loading ? '登录中…' : '登录' }}</button>
    <p v-if="error" id="error" role="alert">{{ error }}</p>
  </form>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { api, saveToken } from '../api.js';

const router = useRouter();
const username = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

async function submit() {
  loading.value = true;
  error.value = '';
  try {
    const { data } = await api('/api/login', { method: 'POST', body: { username: username.value, password: password.value } });
    saveToken(data.token);
    router.push('/');
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}
</script>
