import type {Item} from './data'
/** Display department membership without moving the saved employee records. */
export function hrNavigationFolders(items:Item[]){
 const folders=items.filter(i=>i.type==='project')
 const root=folders.find(i=>i.intent==='hr_departments_root')
 if(!root)return folders
 const departments=folders.filter(i=>['hr_department_unit','hr_sub_department_unit'].includes(i.intent||''))
 const units=new Set(departments.map(i=>i.entityId))
 return folders.map(i=>{
  if(i.intent==='hr_employee_profile'){
   const profile=i.projectData?.hrProfile
   const department=profile?.departmentId?departments.find(d=>d.entityId===profile.departmentId):departments.find(d=>d.title===profile?.department)
   return department?{...i,parent:department.entityId}:i
  }
  return units.has(i.entityId)&&!units.has(i.parent)?{...i,parent:root.entityId}:i
 })
}
