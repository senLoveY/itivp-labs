const PREFIX = 'tweets-cache:';
const LIFETIME = 60 * 1000; // кэш живёт 60 секунд

export function getCache(key) {
  const saved = localStorage.getItem(PREFIX + key);
  if (!saved) return null;

  const { time, data } = JSON.parse(saved);
  if (Date.now() - time > LIFETIME) return null;

  return data;
}

export function setCache(key, data) {
  localStorage.setItem(PREFIX + key, JSON.stringify({ time: Date.now(), data }));
}

export function clearCache() {
  Object.keys(localStorage)
    .filter(key => key.startsWith(PREFIX))
    .forEach(key => localStorage.removeItem(key));
}
