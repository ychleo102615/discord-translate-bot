<script setup lang="ts">
interface Guild {
  id: string;
  name: string;
  icon: string;
  permissions: string;
}

const { user, logout } = useAuth();
const api = useApi();

const guilds = ref<Guild[]>([]);
const loading = ref(true);
const error = ref('');

onMounted(async () => {
  try {
    guilds.value = await api.get<Guild[]>('/api/user/guilds');
  } catch (e) {
    error.value = e instanceof Error ? e.message : '無法載入伺服器列表';
  } finally {
    loading.value = false;
  }
});

function guildIcon(guild: Guild) {
  if (guild.icon) {
    return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`;
  }
  return null;
}

function guildInitial(name: string) {
  return name.split(/\s+/).map(w => w[0]).join('').slice(0, 3);
}
</script>

<template>
  <div class="guilds-container">
    <header class="guilds-header">
      <h1>Discord Translate Bot</h1>
      <div class="user-info">
        <span class="username">{{ user?.username }}</span>
        <button class="logout-btn" @click="logout">登出</button>
      </div>
    </header>

    <p class="subtitle">選擇一個伺服器來管理設定</p>

    <div v-if="loading" class="status-message">載入中...</div>
    <div v-else-if="error" class="status-message error">{{ error }}</div>
    <div v-else-if="guilds.length === 0" class="status-message">找不到可管理的伺服器</div>

    <div v-else class="guild-list">
      <div
        v-for="guild in guilds"
        :key="guild.id"
        class="guild-card"
        @click="navigateTo(`/guilds/${guild.id}`)"
      >
        <img
          v-if="guildIcon(guild)"
          :src="guildIcon(guild)!"
          :alt="guild.name"
          class="guild-icon"
        />
        <div v-else class="guild-icon guild-icon-placeholder">
          {{ guildInitial(guild.name) }}
        </div>
        <span class="guild-name">{{ guild.name }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.guilds-container {
  min-height: 100vh;
  background: #1e1f22;
  color: #fff;
  padding: 2rem;
}

.guilds-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 800px;
  margin: 0 auto 0.5rem;
}

.guilds-header h1 {
  font-size: 1.5rem;
  margin: 0;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.username {
  color: #b5bac1;
}

.logout-btn {
  background: transparent;
  color: #b5bac1;
  border: 1px solid #b5bac1;
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.logout-btn:hover {
  color: #fff;
  border-color: #fff;
}

.subtitle {
  max-width: 800px;
  margin: 0 auto 1.5rem;
  color: #b5bac1;
}

.status-message {
  text-align: center;
  color: #b5bac1;
  margin-top: 3rem;
  font-size: 1.1rem;
}

.status-message.error {
  color: #ed4245;
}

.guild-list {
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.guild-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: #2b2d31;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.guild-card:hover {
  background: #35373c;
}

.guild-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.guild-icon-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #5865f2;
  color: #fff;
  font-size: 0.9rem;
  font-weight: 600;
}

.guild-name {
  font-size: 1.1rem;
  font-weight: 500;
}
</style>
