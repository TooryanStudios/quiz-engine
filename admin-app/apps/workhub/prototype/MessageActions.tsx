import {useEffect,useRef,useState,type ReactNode} from 'react'
import {createPortal} from 'react-dom'
import {MoreHorizontal,X} from 'lucide-react'

/** Message tools stay out of the conversation until requested. */
export function MessageActions({label,children}:{label:string;children:ReactNode}){
 const [open,setOpen]=useState(false)
 const dialog=useRef<HTMLDialogElement>(null),backdrop=useRef(false)
 useEffect(()=>{if(open)dialog.current?.showModal()},[open])
 return <><button className="message-actions-trigger" aria-label={label} aria-expanded={open} onClick={()=>setOpen(true)}><MoreHorizontal size={20}/></button>{open&&createPortal(<dialog ref={dialog} className="message-actions-sheet" aria-label={label} onCancel={e=>{e.preventDefault();setOpen(false)}} onPointerDown={e=>{backdrop.current=e.target===e.currentTarget}} onClick={e=>{if(backdrop.current&&e.target===e.currentTarget)setOpen(false);backdrop.current=false}}><header><strong>{label}</strong><button autoFocus className="icon-button" aria-label="Close" onClick={()=>setOpen(false)}><X size={22}/></button></header><div onClick={e=>{if((e.target as HTMLElement).closest('button'))setOpen(false)}}>{children}</div></dialog>,document.body)}</>
}
