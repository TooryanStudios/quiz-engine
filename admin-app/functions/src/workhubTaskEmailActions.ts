export type TaskEmailAction={kind:'comment'}|{kind:'approve'|'reject'}|{kind:'status';status:string}
export function parseTaskEmailAction(text:string):TaskEmailAction {
 const first=text.trim().split(/\r?\n/)[0].trim()
 if(/^WORKHUB APPROVE$/i.test(first))return {kind:'approve'}
 if(/^WORKHUB REJECT$/i.test(first))return {kind:'reject'}
 const status=first.match(/^WORKHUB STATUS:\s*([a-zA-Z0-9_-]{1,100})$/i)
 return status?{kind:'status',status:status[1]}:{kind:'comment'}
}
export function taskEmailTarget(path:unknown,originalText:unknown):{workspaceId:string;taskId:string}|null {
 if(typeof path!=='string'||typeof originalText!=='string'||!originalText.includes('[WORKHUB TASK REQUEST]'))return null
 const match=path.match(/^\/workhub\/w\/([^/?#]+)\/t\/([^/?#]+)(?:[?#]|$)/)
 if(!match)return null
 try{return {workspaceId:decodeURIComponent(match[1]),taskId:decodeURIComponent(match[2])}}catch{return null}
}

export function defaultTaskEmailStatuses(workspaceType:unknown):{id:string}[] {
 const ids=workspaceType==='finance'?['received','review','approved','paid','hold','rejected']:workspaceType==='hr'?['intake','screening','interview','offer','onboarded','closed']:['backlog','open','in_progress','review','completed','canceled']
 return ids.map(id=>({id}))
}
