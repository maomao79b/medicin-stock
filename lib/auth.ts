// For static export, we use client-side authentication state
// This will be used by components to check if a user is logged in
export function getSession() {
  if (typeof window === 'undefined') return null;
  const session = localStorage.getItem('auth_session');
  if (!session) return null;
  try {
    return JSON.parse(session);
  } catch {
    return null;
  }
}

export function getCurrentUser() {
  return getSession();
}

export function saveSession(user: any) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('auth_session', JSON.stringify(user));
  }
}

export function clearSession() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_session');
  }
}
