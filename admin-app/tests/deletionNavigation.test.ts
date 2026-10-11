import {expect,it} from 'vitest'
import {recoverMissingRoute,rememberNavigationItems} from '../apps/workhub/prototype/deletionNavigation'
import type {Item} from '../apps/workhub/prototype/data'
const folder=(id:string,parent='')=>({id:'project:'+id,entityId:id,type:'project',workspace:'w',parent,title:id} as Item)
const recover=(route:string,current:Item[],previous:Item[]=current,workspaces=['w'])=>{
 const known=new Map<string,Item>();rememberNavigationItems(previous,known)
 return recoverMissingRoute(new URLSearchParams(route),current,workspaces,known)?.toString()
}
it('returns to the nearest surviving parent after a subtree is deleted',()=>{
 const root=folder('root'),parent=folder('parent','root'),child=folder('child','parent')
 expect(recover('view=workspaces&workspace=w&project=child&item=project:child',[root],[root,parent,child])).toBe('view=workspaces&workspace=w&project=root')
})
it('recovers stale deleted links to the workspace and missing workspaces to the list',()=>{
 expect(recover('view=workspaces&workspace=w&project=gone',[])).toBe('view=workspaces&workspace=w')
 expect(recover('view=workspaces&workspace=w&project=gone',[],[],[])).toBe('view=workspaces')
})
it('closes a missing inbox task without leaving the inbox',()=>{
 expect(recover('view=inbox&item=task:gone',[])).toBe('view=inbox')
 expect(recover('view=workspaces&workspace=w&project=p&item=task:gone',[folder('p')])).toBe('view=workspaces&workspace=w&project=p')
})
it('uses the employee department shown in the tree as the parent',()=>{
 const root={...folder('departments'),intent:'hr_departments_root'}
 const department={...folder('media'),intent:'hr_department_unit'}
 const employee={...folder('person','employees'),intent:'hr_employee_profile',projectData:{hrProfile:{departmentId:'media'}}} as Item
 expect(recover('view=workspaces&workspace=w&project=person',[root,department],[root,department,employee])).toBe('view=workspaces&workspace=w&project=media')
})
it('leaves valid selections unchanged and terminates cyclic deleted ancestry',()=>{
 expect(recover('view=workspaces&workspace=w&project=p',[folder('p')])).toBeUndefined()
 expect(recover('view=workspaces&workspace=w&project=a',[],[folder('a','b'),folder('b','a')])).toBe('view=workspaces&workspace=w')
})
it('keeps a Plans link after its project moves to implementation',()=>{
 const moved={...folder('p'),workspace:'destination',projectData:{planSettings:{sourceWorkspaceId:'w'}}} as Item
 expect(recover('view=workspaces&workspace=w&project=p',[moved],[folder('p')],['w','destination'])).toBeUndefined()
})
it('keeps links to new subfolders created under an implemented plan',()=>{
 const moved={...folder('p'),workspace:'destination',projectData:{planSettings:{sourceWorkspaceId:'w'}}} as Item
 const child={...folder('new','p'),workspace:'destination'}
 expect(recover('view=workspaces&workspace=w&project=new',[moved,child],[],['w','destination'])).toBeUndefined()
})
