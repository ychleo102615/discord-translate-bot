<script setup lang="ts">
const { login } = useAuth();
</script>

<template>
  <div class="login-container">
    <div class="login-card">
      <h1>Discord Translate Bot</h1>
      <p>管理你的翻譯機器人設定</p>
      <button class="discord-login-btn" @click="login">
        使用 Discord 登入
      </button>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}

.login-card {
  text-align: center;
  padding: 2rem;
  border-radius: 8px;
  background: #2b2d31;
  color: #fff;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}

.login-card h1 {
  margin-bottom: 0.5rem;
}

.login-card p {
  margin-bottom: 1.5rem;
  color: #b5bac1;
}

.discord-login-btn {
  background: #5865f2;
  color: #fff;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}

.discord-login-btn:hover {
  background: #4752c4;
}
</style>
