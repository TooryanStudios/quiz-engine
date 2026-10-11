import { useState } from 'react'
import { X, ClipboardPaste } from 'lucide-react'
import { AssigneePicker } from './taskTools'
import { createWorkhubTask, type WorkhubMember } from '../../../src/lib/workhubRepo'
import type { Item } from './data'
import en from './locales/en.json'

export function clipboardTasks(text: string) {
 return text.split(/\r?\n/).map(line => line.trim().replace(/^(?:(?:[-*•▪◦●○‣⁃–—]+|\d+[.)]|\[[ xX]\])\s*)+/, '').trim()).filter(Boolean).map(title => title.replace(/\p{L}/u, letter => letter.toLocaleUpperCase()))
}
export function PasteTasks({ initial, folders, selected, uid, peopleFor, t, close }: { initial:string; folders:Item[]; selected:string; uid:string; peopleFor:(folder:Item|undefined)=>WorkhubMember[]; t:(key:keyof typeof en)=>string; close:()=>void }) {
 const [entries,setEntries]=useState(()=>clipboardTasks(initial))
 const [text,setText]=useState('')
 const [folderId,setFolderId]=useState(selected || folders[0]?.entityId || '')
 const folder=folders.find(f=>f.entityId===folderId)
 const statuses=folder?.statuses || []
 const [status,setStatus]=useState('')
 const [assignees,setAssignees]=useState<string[]>([])
 const [due,setDue]=useState('')
 const people=peopleFor(folder)
 const validAssignees=assignees.filter(uid=>people.some(person=>person.uid===uid))
 const chosen=statuses.some(s=>s.id===status)?status:statuses.find(s=>/^(to-do|todo|to_do)$/.test(s.id))?.id || statuses[0]?.id || ''
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const lines=entries.flatMap(clipboardTasks)
 const append=()=>{setEntries(previous=>[...previous,...clipboardTasks(text)]);setText('')}
 async function save(){
  if(!folder || !chosen || !lines.length || busy)return
  setBusy(true);setError('')
  let done=0
  try {
   for(const title of lines){await createWorkhubTask({workspaceId:folder.workspace,projectId:folder.entityId,title,description:'',visibility:folder.visibility||'workspace',memberUids:folder.memberUids||[],status:chosen,priority:'medium',assigneeUid:validAssignees[0]||'',assigneeUids:validAssignees,dueDate:due,createdBy:uid});done++}
   close()
  }catch{setEntries(lines.slice(done));setError(t('saveFailed'))}finally{setBusy(false)}
 }
 return <div className="paste-tasks-backdrop" onKeyDown={e=>{if(e.key==='Escape'&&!busy)close()}}><section className="paste-tasks-dialog" role="dialog" aria-modal="true" aria-labelledby="paste-title"><header><h2 id="paste-title"><ClipboardPaste size={20}/>{t('pasteTasks')}</h2><button className="icon-button quiet" disabled={busy} onClick={close} aria-label={t('close')}><X size={19}/></button></header><p>{t('pasteReviewHint')}</p><div className="paste-task-selectors"><label>{t('folder')}<select disabled={busy} value={folderId} onChange={e=>{setFolderId(e.target.value);setStatus('');setAssignees([])}}>{folders.map(f=><option key={f.id} value={f.entityId}>{f.title}</option>)}</select></label><label>{t('status')}<select disabled={busy} value={chosen} onChange={e=>setStatus(e.target.value)}>{statuses.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select></label></div><div className="paste-task-selectors paste-task-shared"><div className="paste-assignee-field"><span>{t('assignee')}</span><AssigneePicker selected={validAssignees} people={people} onChange={setAssignees} disabled={busy} t={key=>t(key as keyof typeof en)}/></div><label>{t('due')}<input type="date" disabled={busy} value={due} onChange={e=>setDue(e.target.value)}/></label></div><div className="paste-task-preview">{entries.map((entry,index)=><div className="paste-task-entry" key={index}><span>{index+1}</span><input autoFocus={index===0} disabled={busy} value={entry} aria-label={t('title')+' '+(index+1)} onChange={e=>setEntries(previous=>previous.map((value,i)=>i===index?e.target.value:value))} onBlur={()=>setEntries(previous=>previous.map((value,i)=>i===index?clipboardTasks(value).join(' '):value))}/><button className="icon-button quiet" disabled={busy} aria-label={t('removePasteItem')+' '+entry} title={t('removePasteItem')} onClick={()=>setEntries(previous=>previous.filter((_,i)=>i!==index))}><X size={16}/></button></div>)}</div><div className="paste-task-more"><textarea autoFocus={!entries.length} disabled={busy} aria-label={t('pasteTasks')} value={text} onChange={e=>setText(e.target.value)} onPaste={e=>{const pasted=e.clipboardData.getData('text/plain');if(!pasted)return;e.preventDefault();setEntries(previous=>[...previous,...clipboardTasks(text),...clipboardTasks(pasted)]);setText('')}} placeholder={t('pasteMoreHint')}/>{text.trim()&&<button className="secondary" disabled={busy} onClick={append}>{t('addToPreview')}</button>}</div><small>{lines.length} {t('tasks')}</small>{error&&<p role="alert" className="error-note">{error}</p>}<footer><button className="secondary" disabled={busy} onClick={close}>{t('cancel')}</button><button className="primary" disabled={busy||!!text.trim()||!lines.length||!folder||!chosen} onClick={save}>{t(busy?'saving':'add')}</button></footer></section></div>
}
