<script setup>
import { ref } from 'vue';

const title = ref('');
const tasks = ref([]);
const error = ref('');

function createTask() {
  const value = title.value.trim();
  if (!value) {
    error.value = '请输入任务名称';
    return;
  }
  tasks.value.push({ id: tasks.value.length + 1, title: value });
  title.value = '';
  error.value = '';
}
</script>

<template>
  <main>
    <h1>任务管理（E2E 演示）</h1>
    <p>仅用于验证浏览器业务流程，任务数据保存在当前页面内存中。</p>
    <form @submit.prevent="createTask">
      <label for="task-title">任务名称</label>
      <input id="task-title" v-model="title" autocomplete="off" />
      <button type="submit">创建任务</button>
    </form>
    <p v-if="error" role="alert">{{ error }}</p>
    <h2>任务列表</h2>
    <ul aria-label="任务列表">
      <li v-for="task in tasks" :key="task.id">{{ task.title }}</li>
    </ul>
    <p v-if="tasks.length === 0">暂无任务</p>
  </main>
</template>

<style scoped>
main { max-width: 640px; margin: 3rem auto; padding: 0 1rem; font-family: system-ui, sans-serif; line-height: 1.7; }
form { display: flex; flex-wrap: wrap; align-items: center; gap: .75rem; margin: 1.5rem 0; }
input { min-width: 14rem; padding: .5rem; }
button { padding: .55rem 1rem; cursor: pointer; }
[role="alert"] { color: #b42318; }
</style>
