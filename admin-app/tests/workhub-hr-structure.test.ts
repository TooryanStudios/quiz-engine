import {beforeEach,it,expect,vi} from 'vitest'
const state=vi.hoisted(()=>({rows:new Map<string,Record<string,unknown>>(),next:0}))
vi.mock('../src/lib/firebase',()=>({db:{},functions:{}}))
vi.mock('firebase/functions',()=>({httpsCallable:vi.fn()}))
vi.mock('firebase/firestore',()=>{
 const snapshot=(id:string)=>({id,exists:()=>state.rows.has(id),data:()=>state.rows.get(id)})
 return {collection:(_db:unknown,name:string)=>({name}),doc:(...args:unknown[])=>({id:String(args.at(-1)?.constructor===String?args.at(-1):'new-'+(++state.next))}),serverTimestamp:()=>123,query:()=>({}),where:()=>({}),getDocs:async()=>({docs:[...state.rows.keys()].map(snapshot)}),runTransaction:async(_db:unknown,fn:(tx:unknown)=>unknown)=>fn({get:async(ref:{id:string})=>snapshot(ref.id),set:(ref:{id:string},data:Record<string,unknown>)=>state.rows.set(ref.id,data),update:(ref:{id:string},data:Record<string,unknown>)=>state.rows.set(ref.id,{...state.rows.get(ref.id),...data})}),writeBatch:()=>{const writes:(()=>void)[]=[];return {set:(ref:{id:string},data:Record<string,unknown>)=>writes.push(()=>{state.rows.set(ref.id,data)}),commit:async()=>{writes.forEach(fn=>fn())}}},addDoc:vi.fn(),arrayRemove:vi.fn(),arrayUnion:vi.fn(),deleteDoc:vi.fn(),deleteField:vi.fn(),getDoc:vi.fn(),limit:vi.fn(),onSnapshot:vi.fn(),orderBy:vi.fn(),setDoc:vi.fn(),updateDoc:vi.fn()}
})
import {ensureWorkhubHrStructure,createWorkhubWorkspace} from '../src/lib/workhubRepo'
beforeEach(()=>{state.rows.clear();state.next=0})
it('adds only missing roots and reuses a pre-existing Departments folder',async()=>{
 state.rows.set('existing',{workspaceId:'w',name:'Departments',parentProjectId:null,intent:'project'})
 state.rows.set('employee',{workspaceId:'w',name:'Alice',intent:'hr_employee_profile',hrProfile:{department:'Finance'}})
 const result=await ensureWorkhubHrStructure('w','admin');await ensureWorkhubHrStructure('w','admin')
 expect(result.departmentsId).toBe('existing');expect(state.rows.size).toBe(3);expect(state.rows.get('employee')?.hrProfile).toEqual({department:'Finance'});expect(state.rows.get(result.employeesId)?.intent).toBe('hr_employees_root')
})
it('creates the default folders with every new HR workspace but leaves other workspace types alone',async()=>{
 await createWorkhubWorkspace({name:'Company HR',description:'',type:'hr',createdBy:'admin'})
 expect([...state.rows.values()].filter(r=>r.intent).map(r=>r.intent).sort()).toEqual(['hr_departments_root','hr_employees_root'])
 state.rows.clear();await createWorkhubWorkspace({name:'Projects',description:'',type:'technical',createdBy:'admin'});expect(state.rows.size).toBe(1)
})
