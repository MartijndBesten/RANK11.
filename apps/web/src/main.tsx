import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './fonts';
import './styles/base.css';
import { StoreProvider } from './state/store';
import { App } from './App';
import { Gallery } from './Gallery';

// Kaartengalerij: ?gallery lokaal, #kaarten in de preview (die geeft alleen #ankers door).
const gallery = new URLSearchParams(location.search).has('gallery') || location.hash === '#kaarten';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {gallery ? (
      <>
        <div className="stadium" />
        <Gallery />
      </>
    ) : (
      <StoreProvider>
        <App />
      </StoreProvider>
    )}
  </StrictMode>,
);
