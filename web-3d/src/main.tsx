import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './device'; // must run first: decides the phone layout
import App from './App';
// Inter served from this site (no request to Google: visitors' IPs stay private); latin-ext covers ă â î ș ț
import '@fontsource-variable/inter';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
