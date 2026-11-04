import {assignment} from './experiment'
import {isV2Preview} from '../v2/experience'
export const VERSION = 'v1-analytics-1'
const KEY='growth.analytics.session.v1', OPT='growth.analytics.optout.v1', TTL=30*60*1000
export type Mode='solo'|'party'
export type Play='real'|'demo'
type Session={id:string;last:number;seen:string[]}
let memory:Session|null=null, home=false, disabledInMemory=false
const allowed=()=>(import.meta.env.VITE_AB_ENABLED!=='true'||!!assignment())&&(!!assignment()||!isV2Preview())&&import.meta.env.MODE!=='test'&&typeof location!=='undefined'&&(!!assignment()||['gymgogo-growth-lab.pages.dev','127.0.0.1','localhost'].includes(location.hostname))
export function optedOut(){if(disabledInMemory)return true;try{return localStorage.getItem(OPT)==='true'}catch{return true}}
function load():Session|null {try{const s=JSON.parse(sessionStorage.getItem(KEY)||'null');return s&&typeof s.id==='string'&&Number.isFinite(s.last)&&Array.isArray(s.seen)?s:null}catch{return memory}}
function save(s:Session){memory=s;try{sessionStorage.setItem(KEY,JSON.stringify(s))}catch{/* memory-only session; refresh may overcount */}}
function session(){const now=Date.now();let s=load();if(!s||now-s.last>=TTL||now<s.last)s={id:crypto.randomUUID(),last:now,seen:[]};s.last=now;save(s);return s}
function send(event:object){try{void fetch(assignment()?'/api/experiment-events':'/api/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(event),keepalive:true,signal:AbortSignal.timeout(4000)}).catch(()=>{})}catch{/* analytics must never interrupt play */}}
function emit(name:string,mode:Mode|null,entry:string,play:Play|null){
 if(!allowed()||optedOut()||document.hidden)return
 const s=session(),key=name==='game_start'?`${name}/${mode}/${play}`:name==='page_view'?name:`${name}/${mode}/${play}/${entry}`
 if(key&&s.seen.includes(key))return
 if(key){s.seen.push(key);save(s)}
 send({...assignment(),...(assignment()?{event_timestamp:new Date().toISOString()}:{}),event_id:crypto.randomUUID(),session_id:s.id,event_name:name,event_time:new Date().toISOString(),game_mode:mode,entry_point:entry,play_type:play,product_version:VERSION})
}
export function homeVisible(value:boolean){home=value;try{if(home){if(assignment())emit('experiment_exposure',null,'home',null);emit('page_view',null,'home',null)}}catch{/* never block rendering */}}
export function activity(){if(!allowed()||optedOut()||document.hidden)return;session();if(home){if(assignment())emit('experiment_exposure',null,'home',null);emit('page_view',null,'home',null)}}
export function entry(mode:Mode,point:string,play:Play){try{activity();if(assignment()?.variant!=='B')emit('start_click',mode,point,play);emit('mode_select',mode,point,play)}catch{/* fail open for game */}}
export function gameStarted(mode:Mode,play:Play,point:string){try{emit('game_start',mode,point,play)}catch{/* fail open for game */}}
export function setOptOut(value:boolean){disabledInMemory=value;try{localStorage.setItem(OPT,String(value));sessionStorage.removeItem(KEY)}catch{/* privacy: if preferences cannot be saved, do not collect */}memory=null;if(!value)activity()}
export function installActivity(){const fn=()=>activity();for(const e of ['pointerdown','keydown','scroll','visibilitychange'])document.addEventListener(e,fn,{passive:true});return()=>{for(const e of ['pointerdown','keydown','scroll','visibilitychange'])document.removeEventListener(e,fn)}}

export function experimentEvent(name:'start_click'|'tutorial_view'|'tutorial_skip'|'tutorial_complete'){try{if(assignment())emit(name,null,'home',null)}catch{/* fail open */}}
