import {useState,useLayoutEffect,type ReactNode} from 'react'
import {Folder,FolderOpen,Plus,ChevronDown,ChevronUp,MoreHorizontal} from 'lucide-react'
import {useDropdownDismissal} from './dropdowns'
import {useRef} from 'react'
import type {Item} from './data'
export function SubfolderCards({items,parent,selected,onSelect,onSettings,onAdd,controls,actions,filters,canAddTask=true,t}:{canAddTask?:boolean;controls?:ReactNode;actions?:ReactNode;filters?:ReactNode;items:Item[];parent:string;selected?:string;onSelect:(id:string)=>void;onSettings:(folder:Item)=>void;onAdd:(type:'folder'|'subfolder'|'task')=>void;t:(key:string)=>string}){
 const menu=useRef<HTMLDetailsElement>(null)
 useDropdownDismissal(menu)
 const path:Item[]=[];let cursor=items.find(i=>i.type==='project'&&i.entityId===selected);const seen=new Set<string>()
 while(cursor&&cursor.entityId!==parent&&!seen.has(cursor.entityId)){seen.add(cursor.entityId);path.unshift(cursor);cursor=items.find(i=>i.type==='project'&&i.entityId===cursor?.parent)}
 const folders=items.filter(i=>i.type==='project'&&i.parent===parent)
 return <section className="subfolder-shortcuts">
  <header><div className="subfolder-heading">{controls}<h2>{t('dashboardSections')}</h2></div><div className="subfolder-header-actions">{filters}{actions}<details ref={menu} className="folder-new-menu"><summary className="secondary"><Plus size={16}/>{t('newItemShort')}</summary><div>{(['folder','subfolder','task'] as const).filter(type=>type!=='task'||canAddTask).map(type=><button key={type} onClick={()=>{menu.current?.removeAttribute('open');onAdd(type)}}>{t('new_'+type)}</button>)}</div></details></div></header>
  <FolderSectionCards folders={folders} items={items} selected={selected} onSelect={onSelect} onSettings={onSettings} t={t}/>
 {path.map(folder=>items.some(i=>i.type==='project'&&i.parent===folder.entityId)&&<NestedFolderCards key={folder.id} folder={folder} items={items} selected={selected||''} onSelect={onSelect} onSettings={onSettings} t={t}/>)}
 </section>
}

function NestedFolderCards({folder,items,selected,onSelect,onSettings,t}:{folder:Item;items:Item[];selected:string;onSelect:(id:string)=>void;onSettings:(folder:Item)=>void;t:(key:string)=>string}){
 return <section className="nested-folder-cards" aria-label={folder.title}><FolderSectionCards folders={items.filter(i=>i.type==='project'&&i.parent===folder.entityId)} items={items} selected={selected} onSelect={onSelect} onSettings={onSettings} t={t}/></section>
}
function FolderSectionCards({folders,items,selected,onSelect,onSettings,t}:{folders:Item[];items:Item[];selected?:string;onSelect:(id:string)=>void;onSettings:(folder:Item)=>void;t:(key:string)=>string}){
 const [all,setAll]=useState(false),[columns,setColumns]=useState(1)
 const grid=useRef<HTMLDivElement>(null)
 useLayoutEffect(()=>{const el=grid.current;if(!el)return;const measure=()=>setColumns(Math.max(1,getComputedStyle(el).gridTemplateColumns.split(' ').length));measure();const observer=new ResizeObserver(measure);observer.observe(el);return()=>observer.disconnect()},[])
 const activePath=new Set<string>();let active=items.find(i=>i.type==='project'&&i.entityId===selected)
 while(active&&!activePath.has(active.entityId)){activePath.add(active.entityId);active=items.find(i=>i.type==='project'&&i.entityId===active?.parent)}
 const overflow=folders.length>columns*2
 const shown=all?folders:folders.slice(0,overflow?columns*2-1:columns*2)
 return <div ref={grid} className="dashboard-section-grid folder-section-selector">{shown.map(folder=><div className="folder-section-card" key={folder.id}><button className="folder-section-open" aria-pressed={activePath.has(folder.entityId)} onClick={()=>onSelect(selected===folder.entityId?'':folder.entityId)}><span className="item-icon project">{activePath.has(folder.entityId)?<FolderOpen size={20}/>:<Folder size={20}/>}</span><span><strong dir="auto">{folder.title}</strong><small>{items.filter(i=>i.parent===folder.entityId).length} {t('items')}</small></span></button><button className="icon-button quiet folder-section-settings" title={t('folderSettings')} aria-label={t('folderSettings')+' '+folder.title} onClick={()=>onSettings(folder)}><MoreHorizontal size={18}/></button></div>)}{overflow&&<button className="folder-section-more" aria-expanded={all} onClick={()=>setAll(!all)}>{all?<ChevronUp size={18}/>:<ChevronDown size={18}/>}<strong>{t(all?'assigneesShowLess':'assigneesShowAll')} ({folders.length})</strong></button>}</div>
}
