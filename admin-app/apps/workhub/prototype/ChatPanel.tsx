import { X, Maximize2, Minimize2 } from 'lucide-react'
import { GeneralTeamChat } from './GeneralTeamChat'
import { useState, type ComponentProps } from 'react'
type Props=ComponentProps<typeof GeneralTeamChat>&{title:string;closeLabel:string;onClose:()=>void}
export function ChatPanel({title,closeLabel,onClose,...chatProps}:Props){
 const [full,setFull]=useState(false),[conversation,setConversation]=useState('')
 return <div className={'chat-overlay'+(full?' chat-fullscreen':'')}><section className="chat-panel" role="dialog" aria-modal="true" aria-label={title}><header><div className="chat-heading"><span className="eyebrow">{title}</span><strong dir="auto">{conversation}</strong></div><div className="chat-header-actions"><button className="icon-button quiet" aria-label={chatProps.isAr?'تغيير حجم المحادثة':full?'Restore chat':'Maximize chat'} onClick={()=>setFull(!full)}>{full?<Minimize2 size={20}/>:<Maximize2 size={20}/>}</button><button className="icon-button quiet" aria-label={closeLabel} onClick={onClose}><X size={20}/></button></div></header><GeneralTeamChat {...chatProps} onTitleChange={setConversation}/></section></div>
}
