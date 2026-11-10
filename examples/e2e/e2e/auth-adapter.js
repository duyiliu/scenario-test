export async function login({ context, account }) {
  const response = await context.request.post('/demo-api/login', { data: account });
  if (!response.ok()) throw new Error(`本地模拟登录失败：${response.status()}`);
}
