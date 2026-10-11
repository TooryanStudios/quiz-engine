import { useEffect, type RefObject } from 'react'

// Shared dismissal and exclusive-open behavior for popovers across the preview.
export function useDropdownDismissal(host:RefObject<HTMLDetailsElement|null>) {
 useEffect(()=>{const close=(e:Event)=>{if(!host.current?.contains(e.target as Node))host.current?.removeAttribute('open')};const exclusive=(e:Event)=>{if(e.target!==host.current)host.current?.removeAttribute('open')};const escape=(e:KeyboardEvent)=>{if(e.key==='Escape')host.current?.removeAttribute('open')};document.addEventListener('pointerdown',close);document.addEventListener('workhub-dropdown-open',exclusive);document.addEventListener('keydown',escape);window.addEventListener('resize',close);return()=>{document.removeEventListener('pointerdown',close);document.removeEventListener('workhub-dropdown-open',exclusive);document.removeEventListener('keydown',escape);window.removeEventListener('resize',close)}},[])
}
