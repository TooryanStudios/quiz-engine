import '../../../src/suppress-dev-logs'
import { lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
const WorkhubLayout = lazy(() => import('../prototype/main'))
const LegacyWorkhub = lazy(() => import('./LegacyWorkhub'))
if (location.hostname === '127.0.0.1' && location.pathname.startsWith('/workhub/next')) {
 const target = new URL(location.href); target.hostname = 'localhost'; location.replace(target.href)
}
const rootElement=document.getElementById('root')!
const initialSkeleton=rootElement.innerHTML
createRoot(rootElement).render(
 <BrowserRouter><Suspense fallback={<div dangerouslySetInnerHTML={{__html:initialSkeleton}}/>}><Routes>
  <Route path="/" element={<Navigate to="/workhub/next?view=home" replace/>}/><Route path="/workhub" element={<Navigate to="/workhub/next?view=home" replace/>}/><Route path="/workhub/next/*" element={<WorkhubLayout/>}/>
  <Route path="*" element={<LegacyWorkhub/>}/>
 </Routes></Suspense></BrowserRouter>
)
