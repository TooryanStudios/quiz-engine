import {useId,useState} from 'react'
import {ChevronDown,ChevronUp,CircleX} from 'lucide-react'
import type {HrRequest} from './HrRequests'
export function HrRequestRecord({request:r,t,busy,canCancel,onCancel,canReview,onReview}:{request:HrRequest;t:(key:string)=>string;busy:boolean;canCancel:boolean;onCancel:()=>void;canReview:boolean;onReview:(status:string)=>void}){
 const [open,setOpen]=useState(false),id=useId()
 const hasDetails=!!(r.institution||r.onlineUrl||r.evidenceUrl||r.text?.length>160)
 const heading=<><strong>{t('hrRequest_'+r.kind)}</strong>{hasDetails&&(open?<ChevronUp size={18}/>:<ChevronDown size={18}/>)}</>
 return <article className="hr-request-record">
  <div className="hr-request-record-heading">{hasDetails?<button className="hr-request-expand" onClick={()=>setOpen(!open)} aria-expanded={open} aria-controls={r.institution||r.onlineUrl||r.evidenceUrl?id:id+'-text'}>{heading}</button>:<div className="hr-request-expand">{heading}</div>}{canCancel&&<button className="icon-button quiet hr-request-cancel" disabled={busy} onClick={onCancel} title={t('hrCancelRequest')} aria-label={t('hrCancelRequest')}><CircleX size={20}/></button>}</div>
  {r.text&&<p id={id+'-text'} dir="auto">{r.text.length>160&&!open?r.text.slice(0,160)+'…':r.text}</p>}
  {r.kind==='leave'&&<span>{t(r.leaveType==='sick'?'hrSick':'hrAnnual')}</span>}
  <span>{r.date} {r.start} {r.end}</span><span className="hr-request-status">{t('hr_'+r.status)}</span>
  {hasDetails&&open&&(r.institution||r.onlineUrl||r.evidenceUrl)&&<div className="hr-request-extra-details" id={id}>
   {r.institution&&<p><strong>{t('hrInstitution')}</strong><br/>{r.institution}</p>}
   {r.onlineUrl&&<a href={r.onlineUrl} target="_blank" rel="noopener noreferrer">{t('hrOnlineLink')}</a>}
   {r.evidenceUrl&&<a href={r.evidenceUrl} target="_blank" rel="noopener noreferrer">{t('hrEvidence')}</a>}
  </div>}
  {canReview&&['approved','rejected'].map(status=><button className="secondary" key={status} disabled={busy} onClick={()=>onReview(status)}>{t('hr_'+status)}</button>)}
 </article>
}
