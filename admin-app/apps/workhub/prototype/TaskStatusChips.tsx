import {usePhoneLayout} from './MobileNavigation'
import {useEffect,useRef,useState,type CSSProperties} from 'react'
import {X,ChevronDown} from 'lucide-react'
import type {Item} from './data'
export function TaskStatusChips({item,disabled,t,onChange}:{item:Item;disabled:boolean;t:(key:string)=>string;onChange:(value:string)=>void}){
 const [expanded,setExpanded]=useState(false),ref=useRef<HTMLDivElement>(null)
 useEffect(()=>{if(!expanded)return;const outside=(event:PointerEvent)=>{if(!ref.current?.contains(event.target as Node))setExpanded(false)};const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')setExpanded(false)};document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape)}},[expanded])
 const [position,setPosition]=useState({top:0,left:0,maxWidth:600})
 const phone=usePhoneLayout()
 const active=item.statuses?.find(status=>status.id===item.statusId)
 if(phone)return <select className="native-task-status" aria-label={t('status')} disabled={disabled} value={item.statusId||''} onChange={e=>onChange(e.target.value)}>{!active&&<option value={item.statusId||''}>{item.status}</option>}{item.statuses?.map(status=><option key={status.id} value={status.id}>{status.label}</option>)}</select>
 return <div ref={ref} className="execution-status-chips" role="group" aria-label={t('status')}><button type="button" aria-expanded={expanded} aria-pressed="true" disabled={disabled} style={{'--status-color':active?.color} as CSSProperties} onClick={e=>{const r=e.currentTarget.getBoundingClientRect();setPosition({left:Math.max(8,Math.min(r.left,innerWidth-608)),top:r.bottom+90<innerHeight?r.bottom+6:Math.max(8,r.top-70),maxWidth:Math.min(600,innerWidth-16)});setExpanded(!expanded)}}>{active?.label||item.status}<ChevronDown size={13}/></button>{expanded&&<div className="task-status-options floating-task-options" style={position}>{item.statuses?.filter(status=>status.id!==item.statusId).map(status=><button type="button" key={status.id} disabled={disabled} onClick={()=>{setExpanded(false);onChange(status.id)}}>{status.label}</button>)}<button type="button" className="status-cancel" aria-label={t('cancel')} onClick={()=>setExpanded(false)}><X size={16}/></button></div>}</div>
}
