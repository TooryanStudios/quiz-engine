import {useState,type ReactNode} from 'react'
import {Search,SlidersHorizontal,X} from 'lucide-react'
export function MobileTools({children,t,filters=true}:{children:ReactNode;t:(key:string)=>string;filters?:boolean}){
 const [mode,setMode]=useState('')
 return <div className={'mobile-tools '+(mode?'show-'+mode:'')}><div className="mobile-tools-buttons">{filters&&<button className="icon-button" aria-label={t('mobileFilters')} aria-expanded={mode==='filters'} onClick={()=>setMode(mode==='filters'?'':'filters')}><SlidersHorizontal size={20}/></button>}<button className="icon-button" aria-label={t('search')} aria-expanded={mode==='search'} onClick={()=>setMode(mode==='search'?'':'search')}><Search size={20}/></button>{mode&&<button className="icon-button" aria-label={t('close')} onClick={()=>setMode('')}><X size={18}/></button>}</div><div className="mobile-tools-content">{children}</div></div>
}
