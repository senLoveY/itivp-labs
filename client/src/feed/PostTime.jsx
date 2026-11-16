import { createContext, useContext, useEffect, useState } from 'react';
import { formatPostTime } from './formatPostTime';

const PostClock = createContext(null);

export function PostClockProvider({ children }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(timer);
  }, []);
  return <PostClock.Provider value={now}>{children}</PostClock.Provider>;
}

export default function PostTime({ value, pending }) {
  const now = useContext(PostClock);
  if (pending) return <span className="post-time" role="status">отправляется…</span>;
  if (now === null) return null;
  const time = formatPostTime(value, now);
  return time && (
    <time className="post-time" dateTime={time.dateTime} title={time.exact} aria-label={time.exact}>
      {time.label}
    </time>
  );
}
