const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

const getConfiguredUrl = (): string | undefined => {
  const configured = import.meta.env.VITE_BACKEND_URL?.trim();
  if (configured) {
    return trimTrailingSlash(configured);
  }

  const fallback = import.meta.env.VITE_BACKEND_FALLBACK_URL?.trim();
  if (fallback) {
    return trimTrailingSlash(fallback);
  }

  return undefined;
};

export const resolveApiBaseUrl = (): string => {
  const configured = getConfiguredUrl();
  if (configured) {
    return configured;
  }

  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:5055';
    }
  }

  return 'https://api.agroconnect.com';
};
