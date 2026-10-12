import {httpsCallable} from 'firebase/functions'
import {functions} from '../../../src/lib/firebase'
import type {CompanyModule,CompanyRecord} from '../../../functions/src/workhubCompanyModel'
export type CompanyCursor={id:string;updatedAt:number}|null
export type CompanyHistory={id:string;action:string;actorUid:string;at:number;from:string;to:string;changed:string[];revision:number}
export const companyCall=async<T,>(data:Record<string,unknown>)=>(await httpsCallable<Record<string,unknown>,T>(functions,'workhubCompanyAction')(data)).data
export const listCompany=(module:CompanyModule,cursor:CompanyCursor=null)=>companyCall<{items:CompanyRecord[];cursor:CompanyCursor}>({action:'list',module,cursor})
export function companyCsv(records:CompanyRecord[],labels:Record<string,string>={}){
 const keys=[...new Set(records.flatMap(r=>Object.keys(r.fields)))],cell=(v:unknown)=>{const value=String(v??'');return '"'+(/^[\s]*[=+\-@]/.test(value)?"'":'')+value.replace(/"/g,'""')+'"'}
 return '\ufeff'+[['Title','Status','Responsible','Created by',...keys.map(k=>labels[k]||k)],...records.map(r=>[r.title,r.status,r.ownerUid,r.createdBy,...keys.map(k=>r.fields[k])])].map(row=>row.map(cell).join(',')).join('\r\n')
}
