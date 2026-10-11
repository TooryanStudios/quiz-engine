import type { WorkhubMember, WorkhubWorkspace } from '../../../src/lib/workhubRepo'
import { canAccessWorkspace } from '../../../src/pages/workhub/projectUtils'
import type { Item } from './data'
export function eligiblePeople(workspace:WorkhubWorkspace|undefined,target:Item|undefined,items:Item[],people:WorkhubMember[]) {
 if(!workspace)return []
 const chain:Item[]=[];let node=target;const visited=new Set<string>()
 while(node&&!visited.has(node.id)){visited.add(node.id);chain.push(node);node=items.find(i=>i.type==='project'&&i.entityId===node?.parent&&i.workspace===workspace.id)}
 return people.filter(p=>{const full=['admin','administrator','manager'].includes(p.role)||workspace.memberAccessLevels?.[p.uid]==='full';return p.status==='approved'&&canAccessWorkspace(workspace,p.uid,p.email,full)&&chain.every(i=>full||i.visibility!=='restricted'||i.createdBy===p.uid||i.memberUids?.includes(p.uid))})
}
export function remainingDays(due:string,now=new Date()) {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(due))return null
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Muscat',year:'numeric',month:'2-digit',day:'2-digit'}).format(now)
 const [year,month,day]=due.split('-').map(Number);const target=Date.UTC(year,month-1,day)
 if(new Date(target).toISOString().slice(0,10)!==due)return null
 return Math.round((target-Date.parse(today+'T00:00:00Z'))/86400000)
}

export function folderContent(items:Item[],folderId:string){return items.filter(item=>item.parent===folderId&&item.type!=='project')}
