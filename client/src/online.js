import { createContext } from 'react';

// email пользователей, которые сейчас в сети
export const OnlineContext = createContext(new Set());
