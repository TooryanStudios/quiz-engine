import {useState} from 'react'
export function UserAvatar({url,name,initials}:{url?:string|null;name:string;initials:string}){
 const [failed,setFailed]=useState('')
 return <span className="avatar">{url&&failed!==url?<img src={url} alt={name} onError={()=>setFailed(url)}/>:initials}</span>
}
