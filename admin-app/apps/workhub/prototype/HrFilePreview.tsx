import {useState} from 'react'
import {FileText,X,ExternalLink} from 'lucide-react'
function previewUrl(url:string){try{const u=new URL(url);if(u.hostname==='drive.google.com'){const id=u.pathname.match(/\/d\/([^/]+)/)?.[1]||u.searchParams.get('id');if(id)return 'https://drive.google.com/file/d/'+encodeURIComponent(id)+'/preview'}return url}catch{return ''}}
export function HrFilePreview({url,title,t}:{url:string;title:string;t:(k:string)=>string}){
 const [open,setOpen]=useState(false);if(!/^https?:\/\//i.test(url))return null
 const pdf=/\.pdf(?:[?#]|$)/i.test(url)||/\.pdf$/i.test(title)||url.includes('drive.google.com')
 return <><button type="button" className="hr-document-card" onClick={()=>setOpen(true)}>{pdf?<iframe src={previewUrl(url)} title={title} tabIndex={-1} loading="lazy"/>:<FileText size={45}/>}<strong>{title}</strong></button>{open&&<div className="notes-modal-backdrop" onClick={e=>{if(e.currentTarget===e.target)setOpen(false)}}><section className="hr-file-dialog" role="dialog" aria-modal="true" aria-label={title}><header><strong>{title}</strong><a className="icon-button" href={url} target="_blank" rel="noopener noreferrer" title={t('openFile')}><ExternalLink size={20}/></a><button className="icon-button" aria-label={t('close')} onClick={()=>setOpen(false)}><X size={22}/></button></header><iframe src={previewUrl(url)} title={title}/></section></div>}</>
}
