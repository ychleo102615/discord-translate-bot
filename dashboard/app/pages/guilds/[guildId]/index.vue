<script setup lang="ts">
const guildId = inject<Ref<string>>('guildId')!;
</script>

<template>
  <div class="dashboard-container">
    <div class="dashboard-card">
      <NuxtLink to="/guilds" class="back-link">&larr; 返回伺服器列表</NuxtLink>
      <h1>伺服器設定</h1>
      <p class="guild-id">Guild ID: {{ guildId }}</p>

      <nav class="module-nav">
        <NuxtLink :to="`/guilds/${guildId}/draw`" class="module-link">
          <span class="module-icon">&#127922;</span>
          <div class="module-info">
            <span class="module-name">抽選系統</span>
            <span class="module-desc">管理物品池、策略與抽選歷史</span>
          </div>
        </NuxtLink>
      </nav>
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
  padding: 2rem;
  border-radius: 8px;
  background: #2b2d31;
  color: #fff;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  width: 100%;
  max-width: 480px;
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
  margin: 0 0 0.5rem;
  font-size: 1.4rem;
}

.guild-id {
  color: #b5bac1;
  font-family: monospace;
  margin-bottom: 1.5rem;
}

.module-nav {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.module-link {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #1e1f22;
  border-radius: 8px;
  text-decoration: none;
  color: #fff;
  transition: background 0.2s;
}

.module-link:hover {
  background: #35373c;
}

.module-icon {
  font-size: 1.8rem;
  flex-shrink: 0;
}

.module-info {
  display: flex;
  flex-direction: column;
}

.module-name {
  font-weight: 600;
  font-size: 1rem;
}

.module-desc {
  font-size: 0.85rem;
  color: #b5bac1;
  margin-top: 0.2rem;
}
</style>
