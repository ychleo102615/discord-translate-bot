<script setup lang="ts">
const { isAuthenticated, restoreUser } = useAuth();

onMounted(() => {
  restoreUser();
  if (isAuthenticated.value) {
    navigateTo('/guilds');
  } else {
    navigateTo('/login');
  }
});
</script>

<template>
  <div />
</template>
