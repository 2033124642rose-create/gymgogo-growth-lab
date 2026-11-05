export const EXPERIMENT_ID='onboarding-v1-v2-20261104'
export type Assignment={experiment_id:string;variant:'A'|'B';experience_version:'v1'|'v2';anonymous_visitor_id:string;traffic_type:'qa'|'experiment'}
let cached:Assignment|null|undefined
export function assignment():Assignment|null {
 if(cached!==undefined)return cached
 cached=null
 if(import.meta.env.VITE_AB_ENABLED!=='true')return null
 if(location.hostname==='gymgogo-growth-lab.pages.dev'&&!['v1','v2'].includes(new URLSearchParams(location.search).get('experience')||''))return null
 try{
 const key='growth.experiment.visitor.v1';let id=localStorage.getItem(key)
 if(!id||! /^[0-9a-f-]{36}$/.test(id)){id=crypto.randomUUID();localStorage.setItem(key,id)}
 const forced=new URLSearchParams(location.search).get('experience')
 const variant=forced==='v1'?'A':forced==='v2'?'B':parseInt(id[0],16)%2===0?'A':'B'
 cached={experiment_id:EXPERIMENT_ID,variant,experience_version:variant==='A'?'v1':'v2',anonymous_visitor_id:id,traffic_type:forced==='v1'||forced==='v2'||location.hostname!=='gymgogo-growth-lab.pages.dev'?'qa':'experiment'}
 }catch{/* no stable storage means no experiment enrollment */}
 return cached
}
