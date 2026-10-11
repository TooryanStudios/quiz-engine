import {useEffect,useId,useRef,type ReactNode} from 'react'
import {ArrowLeft,X} from 'lucide-react'
export function HrDialog({title,onClose,busy=false,children,onBack,backLabel='',className='',footer}:{title:string;onClose:()=>void;busy?:boolean;children:ReactNode;onBack?:()=>void;backLabel?:string;className?:string;footer?:ReactNode}){
 const ref=useRef<HTMLDialogElement>(null),id=useId(),backdropPress=useRef(false)
 useEffect(()=>{ref.current?.showModal()},[])
 return <dialog ref={ref} className={`hr-form-dialog ${className}`} aria-labelledby={id} onCancel={e=>{e.preventDefault();if(!busy)onClose()}} onPointerDown={e=>{backdropPress.current=e.target===e.currentTarget}} onClick={e=>{if(backdropPress.current&&e.target===e.currentTarget&&!busy)onClose();backdropPress.current=false}}><header><div className="hr-dialog-heading">{onBack&&<button className="icon-button quiet hr-dialog-back" disabled={busy} aria-label={backLabel} title={backLabel} onClick={onBack}><ArrowLeft size={20}/></button>}<h2 id={id}>{title}</h2></div><button className="icon-button quiet" disabled={busy} aria-label="Close" onClick={onClose}><X size={20}/></button></header><div className="hr-dialog-body">{children}</div>{footer&&<footer className="hr-dialog-footer">{footer}</footer>}</dialog>
}
