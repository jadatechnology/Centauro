import type { StoreConfig } from '../types'

const CACHE_KEY = 'centauro_store_config'

export function cacheStoreConfig(cfg: StoreConfig) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cfg))
  } catch {
    /* noop */
  }
}

export function getCachedStoreConfig(): StoreConfig | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as StoreConfig) : null
  } catch {
    return null
  }
}

export function applyStoreConfigToUI(cfg: StoreConfig) {
  if (cfg.company) {
    document.title = cfg.company
    document
      .querySelector('meta[name="apple-mobile-web-app-title"]')
      ?.setAttribute('content', cfg.company)
  }
  const iconLink = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (cfg.logo) {
    if (iconLink) iconLink.setAttribute('href', cfg.logo)
    let apple = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]')
    if (!apple) {
      apple = document.createElement('link')
      apple.rel = 'apple-touch-icon'
      document.head.appendChild(apple)
    }
    apple.href = cfg.logo
  } else {
    if (iconLink) iconLink.setAttribute('href', '/icon.svg')
    document.querySelector('link[rel="apple-touch-icon"]')?.remove()
  }
}