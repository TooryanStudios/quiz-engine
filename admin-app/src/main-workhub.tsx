import './suppress-dev-logs'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import WorkhubStandaloneApp from './WorkhubStandaloneApp'

document.documentElement.lang = 'en-GB'
document.documentElement.dir = 'ltr'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <WorkhubStandaloneApp />
    </BrowserRouter>
  </StrictMode>,
)
