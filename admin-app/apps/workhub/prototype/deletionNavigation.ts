import type {Item} from './data'
import {hrNavigationFolders} from './hrNavigation'

export function rememberNavigationItems(items:Item[], known:Map<string,Item>) {
 for(const item of items)known.set(item.id,item)
 for(const workspace of new Set(items.map(item=>item.workspace))) {
  for(const item of hrNavigationFolders(items.filter(item=>item.workspace===workspace)))known.set(item.id,item)
 }
}

/** Recover a route after its selected entity disappears, including deleted ancestors. */
export function recoverMissingRoute(params:URLSearchParams, items:Item[], workspaceIds:string[], known:Map<string,Item>) {
 const inWorkspace=(item:Item,workspace:string)=>{let current:Item|undefined=item;const seen=new Set<string>();while(current&&!seen.has(current.id)){if(current.workspace===workspace||current.projectData?.planSettings?.sourceWorkspaceId===workspace)return true;seen.add(current.id);current=items.find(p=>p.type==='project'&&p.entityId===current?.parent)}return false}
 const next=new URLSearchParams(params)
 const workspace=params.get('workspace')||''
 const project=params.get('project')||''
 const selected=params.get('item')||''
 if(workspace&&!workspaceIds.includes(workspace)) {
  next.set('view','workspaces');next.delete('workspace');next.delete('project');next.delete('item')
 } else if(workspace&&project&&!items.some(item=>item.type==='project'&&item.entityId===project&&inWorkspace(item,workspace))) {
  const seen=new Set<string>()
  let parent=known.get('project:'+project)?.parent||''
  while(parent&&!seen.has(parent)) {
   seen.add(parent)
   if(items.some(item=>item.type==='project'&&item.entityId===parent&&inWorkspace(item,workspace)))break
   parent=known.get('project:'+parent)?.parent||''
  }
  if(parent&&items.some(item=>item.type==='project'&&item.entityId===parent&&inWorkspace(item,workspace)))next.set('project',parent)
  else next.delete('project')
  next.delete('item')
 } else if(selected&&!items.some(item=>item.id===selected&&(!workspace||inWorkspace(item,workspace))))next.delete('item')
 return next.toString()===params.toString()?null:next
}
