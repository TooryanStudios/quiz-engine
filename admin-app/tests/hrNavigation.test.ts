import {it,expect} from 'vitest'
import {hrNavigationFolders} from '../apps/workhub/prototype/hrNavigation'
import type {Item} from '../apps/workhub/prototype/data'
const make=(id:string,intent:string,parent='')=>({id,entityId:id,type:'project',intent,parent,title:id} as Item)
it('nests departments and employees according to department membership',()=>{
 const employee={...make('employee','hr_employee_profile','employees'),projectData:{hrProfile:{departmentId:'video'}}} as Item
 const source=[make('root','hr_departments_root'),make('media','hr_department_unit'),make('video','hr_sub_department_unit','media'),employee]
 expect(hrNavigationFolders(source).map(i=>[i.entityId,i.parent])).toEqual([['root',''],['media','root'],['video','media'],['employee','video']]);expect(employee.parent).toBe('employees')
})
it('supports legacy department names and preserves unassigned employees',()=>{
 const legacy={...make('legacy','hr_employee_profile','employees'),projectData:{hrProfile:{department:'media'}}} as Item
 const unassigned=make('unassigned','hr_employee_profile','employees')
 expect(hrNavigationFolders([make('root','hr_departments_root'),make('media','hr_department_unit'),legacy,unassigned]).map(i=>i.parent)).toEqual(['','root','media','employees'])
})
