import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Arena Board type register — self-hosted via @fontsource (bundled woff2, no
// CDN at runtime). Doto variable (100–900) drives LED tallies; Barlow covers
// body/ribbon; Barlow Condensed covers lane tags. Latin subsets only.
import '@fontsource-variable/doto/wght.css'
import '@fontsource/barlow/latin-400.css'
import '@fontsource/barlow/latin-500.css'
import '@fontsource/barlow/latin-600.css'
import '@fontsource/barlow-condensed/latin-600.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
