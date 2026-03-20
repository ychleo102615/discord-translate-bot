export default defineNuxtRouteMiddleware((to) => {
  const { isAuthenticated, restoreUser } = useAuth();
  restoreUser();

  const publicPages = ['/login', '/auth/callback'];
  if (publicPages.some(p => to.path.startsWith(p))) return;

  if (!isAuthenticated.value) return navigateTo('/login');
});
