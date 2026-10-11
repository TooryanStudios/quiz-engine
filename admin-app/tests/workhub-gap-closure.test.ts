import {describe,it,expect} from 'vitest'
import {adaptWorkspaceItems,emptyData} from '../apps/workhub/prototype/data'
import {buildInitialTemplateCreationDraft,buildTemplateCreationDescription,validateTemplateCreation} from '../src/pages/workhub/templateCreationData'
import type {WorkhubWorkspace,WorkhubTask,WorkhubMoodBoard,WorkhubDocument} from '../src/lib/workhubRepo'
const workspace:WorkhubWorkspace={id:'ws',name:'Test',description:'',type:'technical',createdBy:'u'}
describe('feature parity persistence',()=>{
 it('retains task schedules and financial fields and board/document attachment labels',()=>{
  const task={id:'task',workspaceId:'ws',projectId:'',title:'Task',description:'',createdBy:'u',visibility:'workspace',memberUids:[],status:'to-do',assigneeUid:'u',dueDate:'2026-10-20',startDate:'2026-10-10',dueTime:'15:30',milestoneId:'m',valueAmount:30,valueCurrency:'OMR'} as WorkhubTask
  const board={id:'b',workspaceId:'ws',entityType:'workspace',entityId:'ws',title:'Board',createdBy:'u',visibility:'workspace',memberUids:[],images:[{id:'i',url:'https://example.test/image.png',label:'Original image',addedBy:'u'}]} as WorkhubMoodBoard
  const document={id:'d',workspaceId:'ws',title:'Document',body:'',createdBy:'u',visibility:'workspace',memberUids:[],attachments:['https://example.test/file.pdf'],attachmentTitles:{'https://example.test/file.pdf':'Report'}} as WorkhubDocument
  const result=adaptWorkspaceItems(workspace,{...emptyData(),tasks:[task],boards:[board],documents:[document]},'u',false)
  expect(result.find(i=>i.type==='task')).toMatchObject({startDate:'2026-10-10',dueTime:'15:30',milestoneId:'m',valueAmount:30,valueCurrency:'OMR'})
  expect(result.find(i=>i.type==='board')?.attachmentTitles).toEqual({'https://example.test/image.png':'Original image'})
  expect(result.find(i=>i.type==='document')?.attachmentTitles).toEqual({'https://example.test/file.pdf':'Report'})
 })
 it('validates proposal requirements and date ranges before creating records',()=>{
  const draft=buildInitialTemplateCreationDraft('proposal');draft.name='Bid'
  expect(validateTemplateCreation('proposal',draft)).toContain('client')
  Object.assign(draft,{clientId:'client',tenderNumber:'T1',proposalId:'P1',deadline:'2026-10-20',submissionTime:'12:00'})
  expect(validateTemplateCreation('proposal',draft)).toBe('')
  draft.startDate='2026-10-21';expect(validateTemplateCreation('proposal',draft)).toContain('Start date')
 })
 it('keeps HR field formatting compatible with existing record readers',()=>{
  const draft=buildInitialTemplateCreationDraft('hr_employee_profile');Object.assign(draft,{name:'Test profile',employeeId:'E1',department:'Design',jobTitle:'Designer'})
  expect(validateTemplateCreation('hr_employee_profile',draft)).toContain('department')
  expect(validateTemplateCreation('hr_employee_profile',draft,'hr_department_unit')).toBe('')
  expect(buildTemplateCreationDescription('hr_employee_profile',draft)).toContain('Employee ID: E1')
 })
})
