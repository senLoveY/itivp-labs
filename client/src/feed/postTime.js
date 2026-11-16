const shortDate = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' });
const fullDate = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'long', timeStyle: 'short' });
const dateWithYear = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });

export function formatPostTime(value, now) {
  const date = new Date(value);
  if (value == null || !Number.isFinite(date.getTime())) return null;

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const minutes = Math.max(0, Math.floor((now - date) / 60_000));

  let label;
  if (date >= today) {
    label = minutes < 1 ? 'только что' : minutes < 60 ? `${minutes} мин` : `${Math.floor(minutes / 60)} ч`;
  } else if (date >= yesterday) {
    label = 'вчера';
  } else {
    label = (date.getFullYear() === today.getFullYear() ? shortDate : dateWithYear).format(date);
  }
  return { label, exact: fullDate.format(date), dateTime: date.toISOString() };
}
