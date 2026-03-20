<script setup lang="ts">
const route = useRoute();
const guildId = route.params.guildId as string;
</script>

<template>
  <div class="dashboard-container">
    <div class="dashboard-card">
      <NuxtLink to="/guilds" class="back-link">&larr; 返回</NuxtLink>
      <h1>伺服器設定（開發中）</h1>
      <p class="guild-id">Guild ID: {{ guildId }}</p>
    </div>
  </div>
</template>

<style scoped>
.dashboard-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #1e1f22;
}

.dashboard-card {
  text-align: center;
  padding: 2rem;
  border-radius: 8px;
  background: #2b2d31;
  color: #fff;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}

.back-link {
  display: inline-block;
  margin-bottom: 1rem;
  color: #5865f2;
  text-decoration: none;
  font-size: 0.95rem;
}

.back-link:hover {
  text-decoration: underline;
}

.dashboard-card h1 {
  margin-bottom: 0.5rem;
  font-size: 1.4rem;
}

.guild-id {
  color: #b5bac1;
  font-family: monospace;
}
</style>
