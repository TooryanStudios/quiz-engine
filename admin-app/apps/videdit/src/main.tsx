import '../../../src/suppress-dev-logs'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../../../src/index.css'
import VideoEditorPage from '../../../src/pages/VideoEditorPage'

document.documentElement.lang = 'en-GB'
document.documentElement.dir = 'ltr'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <VideoEditorPage />
  </StrictMode>,
)