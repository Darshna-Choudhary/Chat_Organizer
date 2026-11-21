import { createContext } from 'react';

// store: the attached media (or null); openImage(name): opens the full-screen photo viewer.
export const MediaContext = createContext({ store: null, openImage: () => {} });
