import { useEffect, useRef } from 'react';

export default function useObjectURLs() {
  const urls = useRef(new Set());

  useEffect(() => {
    const active = urls.current;
    return () => {
      active.forEach(url => URL.revokeObjectURL(url));
      active.clear();
    };
  }, []);

  function createURL(file) {
    const url = URL.createObjectURL(file);
    urls.current.add(url);
    return url;
  }

  function releaseURL(url) {
    if (urls.current.delete(url)) URL.revokeObjectURL(url);
  }

  return { createURL, releaseURL };
}
