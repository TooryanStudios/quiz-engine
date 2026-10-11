import { useEffect, useState, useRef } from 'react'
import { httpsCallable } from 'firebase/functions'
import { CloudUpload, FileText, ExternalLink, X, LoaderCircle, RotateCw } from 'lucide-react'
import { auth, functions } from '../../../src/lib/firebase'
import type { TeamChatMessage } from '../../../src/features/communication/hooks/useGlobalTeamChat'
import en from './locales/en.json'
import ar from './locales/ar.json'

const access = httpsCallable<{ activityId: string; attachmentId?: string; action: 'preview' | 'thumbnail' | 'save' | 'retry' }, { url?: string }>(functions, 'accessWorkhubEmailAttachment')
const pendingUrls = new Map<string, Promise<{ data: { url?: string } }>>()
async function cachedAccess(activityId:string, attachmentId:string, action:'preview'|'thumbnail') {
 const key='workhub-email-preview:'+auth.currentUser?.uid+':'+activityId+':'+attachmentId+':'+action
 try {const cached=JSON.parse(sessionStorage.getItem(key)||'null') as {url:string;expires:number}|null;if(cached&&cached.expires>Date.now())return {data:{url:cached.url}}}catch{}
 const pending=pendingUrls.get(key);if(pending)return pending
 const request=access({activityId,attachmentId,action}).then(result=>{if(result.data.url)try{sessionStorage.setItem(key,JSON.stringify({url:result.data.url,expires:Date.now()+4*60*1000}))}catch{}return result}).finally(()=>pendingUrls.delete(key))
 pendingUrls.set(key,request);return request
}
export function EmailChatFiles({ message, isAr }: { message: TeamChatMessage; isAr: boolean }) {
  const t = (key: keyof typeof en) => (isAr ? ar : en)[key]
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<{ url: string; type: string; name: string } | null>(null)
  const act = async (id: string, action: 'preview' | 'thumbnail' | 'save' | 'retry', type = '', name = '') => {
    setBusy(id + action); setError('')
    try {
      const { data } = await (action==='preview'||action==='thumbnail'?cachedAccess(message.id,id,action):access({ activityId: message.id, attachmentId: id || undefined, action }))
      if (action === 'preview' && data.url) setPreview({ url: data.url, type, name })
    } catch { setError(t('emailFileFailed')) }
    finally { setBusy('') }
  }
  return <div className="email-chat-files">
    {message.emailAttachmentState === 'pending' && <p className="email-files-state"><LoaderCircle size={15}/>{t('emailFilesPending')}</p>}
    {message.emailAttachmentState === 'failed' && <button className="email-files-state" disabled={!!busy} onClick={() => act('', 'retry')}><RotateCw size={15}/>{t('emailFilesRetry')}</button>}
    {message.attachments?.filter(file => file.provider === 'resend').map(file => <div className="email-file-card" key={file.id}>
      <button className="email-file-thumbnail" title={t('emailPreview')} aria-label={t('emailPreview')} onClick={() => act(file.id, 'preview', file.contentType, file.name)}><EmailThumbnail activityId={message.id} file={file}/></button><div><strong title={file.name}>{file.name}</strong><small>{Math.ceil(file.size / 1024)} KB · {file.driveUrl ? t('emailSavedDrive') : file.driveSaveState === 'saving' ? t('emailAutoSaving') : file.driveSaveState === 'failed' ? t('emailAutoSaveFailed') : t('emailProviderFile')}</small></div>

      {file.driveUrl ? <a className="icon-button quiet" href={file.driveUrl} target="_blank" rel="noopener noreferrer" aria-label={t('emailOpenDrive')} title={t('emailOpenDrive')}><ExternalLink size={17}/></a> : file.driveSaveState === 'saving' ? <LoaderCircle className="email-save-spinner" size={16}/> : <button className="email-save-drive" disabled={!!busy} onClick={() => act(file.id, 'save')} title={t('emailSaveDrive')}>{busy === file.id + 'save' ? <LoaderCircle size={16}/> : <CloudUpload size={16}/>}<span>{t('emailSaveDrive')}</span></button>}
    </div>)}
    {error && <p role="alert" className="error-note">{error}</p>}
    {!!message.attachments?.some(file => file.provider === 'resend' && !file.driveUrl) && <small className="email-retention-hint">{t('emailRetentionHint')}</small>}
    {preview && <div className="email-file-lightbox" role="dialog" aria-modal="true" aria-label={preview.name} onClick={e => { if (e.target === e.currentTarget) setPreview(null) }} onKeyDown={e => { if (e.key === 'Escape') setPreview(null) }}>
      <header><strong>{preview.name}</strong><button autoFocus className="icon-button" aria-label={t('close')} onClick={() => setPreview(null)}><X size={20}/></button></header>
      {preview.url.startsWith('https://drive.google.com/file/d/') ? <iframe title={preview.name} src={preview.url.replace(/\/view.*$/, '/preview')}/> : /^image\/(png|jpeg|webp|gif)$/.test(preview.type) ? <img src={preview.url} alt={preview.name}/> : preview.type.startsWith('video/') ? <video controls src={preview.url}/> : preview.type === 'application/pdf' ? <iframe title={preview.name} src={preview.url} sandbox=""/> : <a href={preview.url} target="_blank" rel="noopener noreferrer">{t('emailDownloadFile')}</a>}
    </div>}
  </div>
}

function EmailThumbnail({ activityId, file }: { activityId: string; file: NonNullable<TeamChatMessage['attachments']>[number] }) {
  const container=useRef<HTMLSpanElement>(null)
  const [visible,setVisible]=useState(false)
  useEffect(()=>{const target=container.current;if(!target)return;const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){setVisible(true);observer.disconnect()}},{rootMargin:'200px'});observer.observe(target);return()=>observer.disconnect()},[])

  const [url, setUrl] = useState(()=>{try{const cached=JSON.parse(sessionStorage.getItem('workhub-email-preview:'+auth.currentUser?.uid+':'+activityId+':'+file.id+':thumbnail')||'null');return cached?.expires>Date.now()?cached.url:''}catch{return ''}})
  useEffect(() => {
    if(!visible)return
    let active = true
    if (file.contentType === 'application/pdf' && file.driveUrl) {
      const id = file.driveUrl.match(/\/d\/([\w-]+)/)?.[1]
      if (id) setUrl(`https://drive.google.com/thumbnail?id=${id}&sz=w320`)
    } else if (file.contentType.startsWith('image/') || file.contentType.startsWith('video/')) {
      cachedAccess(activityId,file.id,'thumbnail').then(({ data }) => {
        if (active && data.url) setUrl(data.url)
      }).catch(() => {
        const id = file.driveUrl?.match(/\/d\/([\w-]+)/)?.[1]
        if (active && id) setUrl(`https://drive.google.com/thumbnail?id=${id}&sz=w320`)
      })
    }
    return () => { active = false }
  }, [activityId, file.id, file.driveUrl, file.contentType, visible])
  return <span ref={container} className="email-thumbnail-content">{url ? file.contentType.startsWith('video/') && !url.startsWith('https://drive.google.com/thumbnail') ? <video src={url} muted preload="metadata"/> : <img src={url} alt="" loading="lazy" onError={() => setUrl('')}/> : <FileText size={25}/>}</span>
}
