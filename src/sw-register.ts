/** Service Worker registration — minimal cache strategy for app shell */

export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    } catch {
      // graceful skip — SW not critical
    }
  });
}
