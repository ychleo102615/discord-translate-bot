export function useAuth() {
  const token = useCookie('auth_token', { maxAge: 60 * 60 * 24 * 7 });
  const user = useState<{ userId: string; username: string; avatar: string } | null>('user', () => null);
  const isAuthenticated = computed(() => !!token.value);

  function login() {
    const config = useRuntimeConfig();
    navigateTo(`${config.public.apiBase}/api/auth/authorize`, { external: true });
  }

  function logout() {
    token.value = null;
    user.value = null;
    navigateTo('/login');
  }

  function setToken(jwt: string) {
    token.value = jwt;
    const payload = JSON.parse(atob(jwt.split('.')[1]!));
    user.value = { userId: payload.userId, username: payload.username, avatar: payload.avatar };
  }

  function restoreUser() {
    if (token.value && !user.value) {
      try {
        const payload = JSON.parse(atob(token.value.split('.')[1]!));
        user.value = { userId: payload.userId, username: payload.username, avatar: payload.avatar };
      } catch {
        token.value = null;
      }
    }
  }

  return { token, user, isAuthenticated, login, logout, setToken, restoreUser };
}
