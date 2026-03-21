<script setup lang="ts">
const route = useRoute();
const guildId = computed(() => route.params.guildId as string);

provide('guildId', guildId);
</script>

<template>
  <NuxtPage />
</template>
