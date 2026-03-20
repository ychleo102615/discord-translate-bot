<script setup lang="ts">
const route = useRoute();
const { setToken } = useAuth();

onMounted(() => {
  const token = route.query.token as string | undefined;
  if (token) {
    setToken(token);
    navigateTo('/guilds');
  } else {
    navigateTo('/login');
  }
});
</script>

<template>
  <div class="callback-container">
    <p>登入中...</p>
  </div>
</template>

<style scoped>
.callback-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  color: #fff;
}
</style>
