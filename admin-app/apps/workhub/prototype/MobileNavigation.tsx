import {phoneViewport,phoneLayoutBaseline} from './phoneViewport'
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
  let frame=0
  let baseline={width:innerWidth,height:innerHeight}
  const resize=()=>{
   cancelAnimationFrame(frame)
   frame=requestAnimationFrame(()=>{
    const root=document.documentElement
    if(!matchMedia('(max-width:700px)').matches){root.style.removeProperty('--phone-height');root.style.removeProperty('--phone-top');root.removeAttribute('data-phone-keyboard');return}
    const editing=!!document.activeElement?.matches('input:not([type=checkbox]):not([type=radio]),textarea,[contenteditable=true]')
    if((viewport?.scale||1)>1.1)return
    baseline=phoneLayoutBaseline(baseline,innerWidth,innerHeight,editing)
    const size=phoneViewport(baseline.height,viewport?.height||innerHeight,viewport?.offsetTop||0,viewport?.scale||1,editing)
    root.style.setProperty('--phone-height',`${size.height}px`)
    root.style.setProperty('--phone-top',`${size.top}px`)
    root.toggleAttribute('data-phone-keyboard',size.keyboard)
   })
  }
  resize();viewport?.addEventListener('resize',resize);viewport?.addEventListener('scroll',resize);window.addEventListener('resize',resize);document.addEventListener('focusin',resize);document.addEventListener('focusout',resize)
  return()=>{cancelAnimationFrame(frame);viewport?.removeEventListener('resize',resize);viewport?.removeEventListener('scroll',resize);window.removeEventListener('resize',resize);document.removeEventListener('focusin',resize);document.removeEventListener('focusout',resize);document.documentElement.style.removeProperty('--phone-height');document.documentElement.style.removeProperty('--phone-top');document.documentElement.removeAttribute('data-phone-keyboard')}

 },[])
 const visit=(id:string)=>{setMore(false);onNavigate(id)}
 return <>
  <header className="mobile-app-header">
   {onBack&&<button className="icon-button" aria-label={t('back')} onClick={onBack}><ArrowLeft size={22}/></button>}
   <strong dir="auto">{title}</strong><div className="mobile-header-actions">{actions}</div>
  </header>
  <nav className="mobile-bottom-nav" aria-label={isAr?'التنقل الرئيسي':'Main navigation'}>
   {([['home',House],['myWork',CheckCheck],['workspaces',LayoutGrid],['inbox',Inbox]] as const).map(([id,Icon])=><button key={id} aria-current={page===id?'page':undefined} onClick={()=>visit(id)}><span><Icon size={27}/>{id==='inbox'&&unread&&<i/>}</span><small>{t(id)}</small></button>)}
   <button aria-expanded={more} aria-current={['myNotes','myProfile','documents','settings'].includes(page)?'page':undefined} onClick={()=>setMore(true)}><Menu size={27}/><small>{isAr?'المزيد':'More'}</small></button>
  </nav>
  {more&&<HrDialog title={isAr?'المزيد':'More'} onClose={()=>setMore(false)} className="mobile-more-dialog"><p className="mobile-account-name" dir="auto">{name}</p><div className="mobile-more-links">
   {([['myNotes',NotebookPen],['myProfile',UserRound],['documents',FileText],['settings',Settings2]] as const).map(([id,Icon])=><button key={id} onClick={()=>visit(id)}><Icon size={27}/><span>{t(id)}</span></button>)}
   <button onClick={()=>{setMore(false);onAssistant()}}><Bot size={22}/><span>{t('agentTitle')}</span></button>
   <button onClick={onLanguage}><Globe2 size={22}/><span>{isAr?'English':'العربية'}</span></button>
   <button onClick={onTheme}>{dark?<Sun size={22}/>:<Moon size={22}/>}<span>{t(dark?'light':'dark')}</span></button>
   <button onClick={()=>{setMore(false);onSignOut()}}><LogOut size={22}/><span>{t('signOut')}</span></button>
  </div></HrDialog>}
 </>
}
