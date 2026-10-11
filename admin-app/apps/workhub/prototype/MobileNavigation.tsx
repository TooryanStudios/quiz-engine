import {useEffect, useState, type ReactNode} from 'react'
import {House, CheckCheck, LayoutGrid, Inbox, Menu, NotebookPen, UserRound, FileText, Settings2, Globe2, Moon, Sun, LogOut, Bot, ArrowLeft} from 'lucide-react'
import {HrDialog} from './HrDialog'

type Props={page:string;title:string;t:(key:string)=>string;onNavigate:(page:string)=>void;onBack?:()=>void;actions:ReactNode;name:string;isAr:boolean;dark:boolean;onLanguage:()=>void;onTheme:()=>void;onSignOut:()=>void;onAssistant:()=>void;unread:boolean}
export function usePhoneLayout(){
 const [phone,setPhone]=useState(()=>matchMedia('(max-width:700px)').matches)
 useEffect(()=>{const query=matchMedia('(max-width:700px)');const update=()=>setPhone(query.matches);query.addEventListener('change',update);return()=>query.removeEventListener('change',update)},[])
 return phone
}
/** Phone navigation stays separate from the desktop rail and its preferences. */
export function MobileNavigation({page,title,t,onNavigate,onBack,actions,name,isAr,dark,onLanguage,onTheme,onSignOut,onAssistant,unread}:Props){
 const [more,setMore]=useState(false)
 useEffect(()=>{
  const viewport=window.visualViewport
  const resize=()=>{
   if(!matchMedia('(max-width:700px)').matches)return
   document.documentElement.style.setProperty('--phone-height',`${viewport?.height||innerHeight}px`)
   document.documentElement.toggleAttribute('data-phone-keyboard',!!viewport&&innerHeight-viewport.height>150)
  }
  resize();viewport?.addEventListener('resize',resize);window.addEventListener('resize',resize)
  return()=>{viewport?.removeEventListener('resize',resize);window.removeEventListener('resize',resize);document.documentElement.style.removeProperty('--phone-height');document.documentElement.removeAttribute('data-phone-keyboard')}
 },[])
 const visit=(id:string)=>{setMore(false);onNavigate(id)}
 return <>
  <header className="mobile-app-header">
   {onBack&&<button className="icon-button" aria-label={t('back')} onClick={onBack}><ArrowLeft size={22}/></button>}
   <strong dir="auto">{title}</strong><div className="mobile-header-actions">{actions}</div>
  </header>
  <nav className="mobile-bottom-nav" aria-label={isAr?'التنقل الرئيسي':'Main navigation'}>
   {([['home',House],['myWork',CheckCheck],['workspaces',LayoutGrid],['inbox',Inbox]] as const).map(([id,Icon])=><button key={id} aria-current={page===id?'page':undefined} onClick={()=>visit(id)}><span><Icon size={22}/>{id==='inbox'&&unread&&<i/>}</span><small>{t(id)}</small></button>)}
   <button aria-expanded={more} aria-current={['myNotes','myProfile','documents','settings'].includes(page)?'page':undefined} onClick={()=>setMore(true)}><Menu size={22}/><small>{isAr?'المزيد':'More'}</small></button>
  </nav>
  {more&&<HrDialog title={isAr?'المزيد':'More'} onClose={()=>setMore(false)} className="mobile-more-dialog"><p className="mobile-account-name" dir="auto">{name}</p><div className="mobile-more-links">
   {([['myNotes',NotebookPen],['myProfile',UserRound],['documents',FileText],['settings',Settings2]] as const).map(([id,Icon])=><button key={id} onClick={()=>visit(id)}><Icon size={22}/><span>{t(id)}</span></button>)}
   <button onClick={()=>{setMore(false);onAssistant()}}><Bot size={22}/><span>{t('agentTitle')}</span></button>
   <button onClick={onLanguage}><Globe2 size={22}/><span>{isAr?'English':'العربية'}</span></button>
   <button onClick={onTheme}>{dark?<Sun size={22}/>:<Moon size={22}/>}<span>{t(dark?'light':'dark')}</span></button>
   <button onClick={()=>{setMore(false);onSignOut()}}><LogOut size={22}/><span>{t('signOut')}</span></button>
  </div></HrDialog>}
 </>
}
