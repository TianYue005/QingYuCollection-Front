export function isLoggedIn(): boolean {
  return !!localStorage.getItem('token') || !!sessionStorage.getItem('token')
}

export function getUsername(): string {
  return localStorage.getItem('username') || sessionStorage.getItem('username') || '游客'
}
