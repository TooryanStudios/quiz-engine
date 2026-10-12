// Shared by the callable and the lazy-loaded Company UI. No Firebase dependencies.
export type CompanyModule = 'documents' | 'finance' | 'partners' | 'relations' | 'initiatives' | 'references'
export type CompanyLabel = [string, string]
export type CompanyField = { key: string; label: CompanyLabel; type?: 'textarea' | 'date' | 'number' | 'url' | 'email' | 'select'; required?: boolean; extra?: boolean; options?: CompanyLabel[]; values?: string[] }
export type CompanyDefinition = { label: CompanyLabel; hint: CompanyLabel; fields: CompanyField[]; statuses: string[] }
const field = (key: string, en: string, ar: string, type?: CompanyField['type'], required = false, extra = false): CompanyField => ({key, label: [en, ar], type, required, extra})
const choice = (key: string, en: string, ar: string, values: string[], options: CompanyLabel[]): CompanyField => ({...field(key, en, ar, 'select', true), values, options})
export const COMPANY_MODULES: Record<CompanyModule, CompanyDefinition> = {
 documents: {label: ['Official documents', 'الوثائق الرسمية'], hint: ['Registrations, licences and renewal dates', 'السجلات والتراخيص ومواعيد التجديد'], statuses: ['active', 'archived'], fields: [
  choice('kind', 'Document type', 'نوع الوثيقة', ['registration','licence','card','contract','other'], [['Registration','سجل'],['Licence','ترخيص'],['Card','بطاقة'],['Contract','عقد'],['Other','أخرى']]),
  field('authority','Issuing authority','الجهة المصدرة'), field('reference','Document number','رقم الوثيقة'), field('issuedOn','Issue date','تاريخ الإصدار','date'), field('expiresOn','Expiry date','تاريخ الانتهاء','date',true), field('reminderDays','Remind me this many days before','التنبيه قبل هذا العدد من الأيام','number'), field('url','Document link','رابط الوثيقة','url'), field('notes','Notes','ملاحظات','textarea',false,true)]},
 finance: {label: ['Finance & expenses', 'المالية والمصروفات'], hint: ['Expenses, advances, invoices and recurring costs', 'المصروفات والسلف والفواتير والتكاليف المتكررة'], statuses: ['submitted','approved','paid','rejected','cancelled'], fields: [
  choice('kind','Record type','نوع السجل',['expense','reimbursement','advance','invoice','recurring'],[['Expense','مصروف'],['Reimbursement','استرداد'],['Advance','سلفة'],['Invoice','فاتورة'],['Recurring expense','مصروف متكرر']]),
  field('amount','Amount (OMR)','المبلغ (ر.ع.)','number',true), field('date','Record date','تاريخ السجل','date',true), field('dueOn','Due date','تاريخ الاستحقاق','date'), field('payee','Payee / supplier','المستفيد / المورد'), field('reference','Invoice / reference number','رقم الفاتورة / المرجع'), field('project','Related project','المشروع المرتبط'), field('url','Receipt / invoice link','رابط الإيصال / الفاتورة','url'),
  choice('frequency','Repeat','التكرار',['none','monthly','quarterly','yearly'],[['Does not repeat','لا يتكرر'],['Monthly','شهري'],['Quarterly','ربع سنوي'],['Yearly','سنوي']]), field('notes','Details','التفاصيل','textarea',false,true)]},
 partners: {label: ['External partners', 'المنفذون والمتعاونون'], hint: ['Specialists, companies and project evaluations', 'المختصون والشركات وتقييمات المشاريع'], statuses: ['active','archived'], fields: [
  choice('kind','Partner type','نوع المتعاون',['freelancer','company'],[['Freelancer','مستقل'],['Company','شركة']]), field('specialty','Areas of work','مجالات العمل',undefined,true), field('contact','Contact person','الشخص المسؤول'), field('email','Email','البريد الإلكتروني','email'), field('phone','Phone','الهاتف'), field('url','Website / portfolio','الموقع / الأعمال السابقة','url'), field('notes','Notes','ملاحظات','textarea',false,true)]},
 relations: {label: ['Institutional relations', 'العلاقات المؤسسية'], hint: ['Contacts, opportunities and follow-ups', 'نقاط التواصل والفرص والمتابعات'], statuses: ['active','archived'], fields: [
  choice('kind','Organisation type','نوع الجهة',['government','private','other'],[['Government','حكومية'],['Private sector','قطاع خاص'],['Other','أخرى']]), field('contact','Contact person','نقطة التواصل',undefined,true), field('email','Email','البريد الإلكتروني','email'), field('phone','Phone','الهاتف'), field('cooperation','Areas of cooperation','مجالات التعاون','textarea'), field('opportunities','Potential opportunities','الفرص المحتملة','textarea'), field('lastContact','Last contact','آخر تواصل','date'), field('followUpOn','Next follow-up','المتابعة القادمة','date'), field('notes','Notes','ملاحظات','textarea',false,true)]},
 initiatives: {label: ['Employee initiatives', 'مبادرات الموظفين'], hint: ['Ideas, review, implementation and outcomes', 'الأفكار والدراسة والتنفيذ والنتائج'], statuses: ['submitted','review','approved','implementing','completed','rejected','cancelled'], fields: [
  field('description','Your idea','فكرة المبادرة','textarea',true), field('expected','Expected results','النتائج المتوقعة','textarea',true), field('dueOn','Target date','التاريخ المستهدف','date'), field('project','Related project','المشروع المرتبط'), field('outcome','Results achieved','النتائج المحققة','textarea',false,true), field('recognition','Recognition','التقدير','textarea',false,true)]},
 references: {label: ['HR references', 'مراجع الموارد البشرية'], hint: ['Maintained source links and review dates', 'روابط المصادر ومواعيد مراجعتها'], statuses: ['active','archived'], fields: [
  field('authority','Authority / source','الجهة / المصدر',undefined,true), field('url','Official source link','رابط المصدر الرسمي','url',true), field('version','Version / decision number','الإصدار / رقم القرار'), field('reviewedOn','Last reviewed','آخر مراجعة','date'), field('reviewOn','Next review','المراجعة القادمة','date'), field('notes','Relevant provisions / notes','المواد ذات الصلة / ملاحظات','textarea')]}
}
export const COMPANY_STATUS: Record<string, CompanyLabel> = {active:['Active','نشط'],archived:['Archived','مؤرشف'],submitted:['Submitted','مقدم'],review:['Under review','قيد الدراسة'],approved:['Approved','معتمد'],paid:['Paid','مدفوع'],rejected:['Rejected','مرفوض'],cancelled:['Cancelled','ملغي'],implementing:['In progress','قيد التنفيذ'],completed:['Completed','مكتمل'],expired:['Expired','منتهي'],renewal:['Renew soon','يجدد قريباً']}
export type CompanyEntry = {id: string; date: string; title: string; notes: string; quality?: number; timeliness?: number; cost?: number; amount?: number; lessons?: string; authorUid: string; createdAt: number}
export type CompanyRecord = {id: string; module: CompanyModule; title: string; status: string; ownerUid: string; createdBy: string; accessUids: string[]; fields: Record<string,string>; revision: number; createdAt: number; updatedAt: number; reminderOn: string; entries: CompanyEntry[]; file?:{path:string;name:string;type:string;size:number}; deleted?: boolean}
export type CompanyActor = {uid: string; privileged: boolean}
export function isCompanyModule(value: unknown): value is CompanyModule { return typeof value === 'string' && Object.prototype.hasOwnProperty.call(COMPANY_MODULES, value) }
export function validDate(value: string): boolean { return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10)===value }
export function companyToday(now=Date.now()): string {return new Date(now+4*3600000).toISOString().slice(0,10)}
export function companyReminder(module: CompanyModule, fields: Record<string,string>): string {
 if(module==='documents' && fields.expiresOn) return new Date(Date.parse(fields.expiresOn)-Number(fields.reminderDays||30)*86400000).toISOString().slice(0,10)
 return fields.followUpOn||fields.reviewOn||fields.dueOn||''
}
export function companyDisplayStatus(record: CompanyRecord, today=companyToday()): string {
 if(record.module==='documents' && record.status==='active') {if(record.fields.expiresOn<today)return 'expired';if(record.reminderOn<=today)return 'renewal'}
 return record.status
}
export function canReadCompany(actor: CompanyActor, record: CompanyRecord): boolean {return actor.privileged || record.accessUids.includes(actor.uid)}
export function canEditCompany(actor: CompanyActor, record: CompanyRecord): boolean {
 if(actor.privileged)return true
 if(record.module==='finance'||record.module==='initiatives')return record.createdBy===actor.uid&&record.status==='submitted'
 return record.ownerUid===actor.uid
}
export function companyTransitions(actor: CompanyActor, record: CompanyRecord): string[] {
 if(!canReadCompany(actor,record))return []
 if(record.module==='finance') {
  const transitions: Record<string,string[]>={submitted:['approved','rejected'],approved:['paid','cancelled']}
  if(actor.privileged&&actor.uid!==record.createdBy)return transitions[record.status]||[]
  return record.createdBy===actor.uid&&record.status==='submitted'?['cancelled']:[]
 }
 if(record.module==='initiatives') {
  const transitions: Record<string,string[]>={submitted:['review','rejected'],review:['approved','rejected'],approved:['implementing','cancelled'],implementing:['completed','cancelled']}
  if(actor.privileged)return transitions[record.status]||[]
  return record.createdBy===actor.uid&&record.status==='submitted'?['cancelled']:[]
 }
 return actor.privileged?[record.status==='active'?'archived':'active']:[]
}
export function validateCompanyDraft(module: CompanyModule, input: {title?:unknown;fields?:unknown}): {title:string;fields:Record<string,string>} {
 const title=typeof input.title==='string'?input.title.trim():''
 if(!title||title.length>180)throw new Error('Enter a title of up to 180 characters.')
 const raw=input.fields&&typeof input.fields==='object'?input.fields as Record<string,unknown>:{}
 const fields: Record<string,string>={}
 for(const f of COMPANY_MODULES[module].fields) {
  const value=String(raw[f.key]??'').trim()
  if((f.required&&!value)||value.length>(f.type==='textarea'?6000:1000))throw new Error(`Check ${f.label[0]}.`)
  if(value&&f.type==='date'&&!validDate(value))throw new Error(`Check ${f.label[0]}.`)
  if(value&&f.type==='number'&&(!Number.isFinite(Number(value))||Number(value)<0||Number(value)>1e9))throw new Error(`Check ${f.label[0]}.`)
  if(value&&f.type==='url'){try{if(!['https:','http:'].includes(new URL(value).protocol))throw new Error()}catch{throw new Error('Use a valid http or https link.')}}
  if(value&&f.type==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))throw new Error('Check the email address.')
  if(value&&f.values&&!f.values.includes(value))throw new Error(`Check ${f.label[0]}.`)
  fields[f.key]=value
 }
 if(module==='documents') {
  if(fields.issuedOn&&fields.issuedOn>fields.expiresOn)throw new Error('Expiry must be on or after the issue date.')
  if(Number(fields.reminderDays)>365||!Number.isInteger(Number(fields.reminderDays||30)))throw new Error('Reminder must be between 0 and 365 days.')
 }
 if(module==='finance') {
  if(Number(fields.amount)<=0||Math.abs(Number(fields.amount)*1000-Math.round(Number(fields.amount)*1000))>0.00001)throw new Error('Enter a positive OMR amount with up to three decimal places.')
  if(fields.kind==='recurring'&&(fields.frequency==='none'||!fields.dueOn))throw new Error('Choose a repeat interval and next due date.')
  if(fields.kind!=='recurring')fields.frequency='none'
 }
 return {title,fields}
}
export function nextCompanyDue(date: string, frequency: string): string {
 const months=({monthly:1,quarterly:3,yearly:12} as Record<string,number>)[frequency]
 if(!validDate(date)||!months)throw new Error('Set a due date and repeat interval first.')
 const source=new Date(date),day=source.getUTCDate();source.setUTCDate(1);source.setUTCMonth(source.getUTCMonth()+months)
 const end=new Date(Date.UTC(source.getUTCFullYear(),source.getUTCMonth()+1,0)).getUTCDate();source.setUTCDate(Math.min(day,end))
 return source.toISOString().slice(0,10)
}
