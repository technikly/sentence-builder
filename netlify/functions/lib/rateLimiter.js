const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 10;

const store = new Map();

export class RateLimitError extends Error {
  constructor(message = 'Too many requests') {
    super(message);
    this.name = 'RateLimitError';
    this.statusCode = 429;
  }
}

const now = () => Date.now();

export const checkRateLimit = (
  key,
  { windowMs = WINDOW_MS, maxRequests = MAX_REQUESTS_PER_WINDOW } = {}
) => {
  if (!key) return;
  const timestamp = now();
  const existing = store.get(key) || { count: 0, expiresAt: timestamp + windowMs };

  if (existing.expiresAt < timestamp) {
    store.set(key, { count: 1, expiresAt: timestamp + windowMs });
    return;
  }

  if (existing.count >= maxRequests) {
    throw new RateLimitError();
  }

  existing.count += 1;
  store.set(key, existing);
};
