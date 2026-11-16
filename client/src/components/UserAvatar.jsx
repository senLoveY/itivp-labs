import { useState } from 'react';
import { avatarURL } from '../api';

export default function UserAvatar({ email, version, className = '', as: Element = 'div', children, ...props }) {
  const [failedURL, setFailedURL] = useState('');
  const url = email ? avatarURL(email, version) : '';

  return (
    <Element className={`avatar ${className}`} {...props}>
      {url && failedURL !== url ? (
        <img src={url} alt="" loading="lazy" onError={() => setFailedURL(url)} />
      ) : email?.[0]?.toUpperCase()}
      {children}
    </Element>
  );
}
