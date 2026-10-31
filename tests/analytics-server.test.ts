// @vitest-environment node
import {it,expect} from 'vitest'
import {Miniflare,convertV4MiniflareOptions} from 'miniflare'
import {readFileSync} from 'node:fs'
import {onRequest,validEvent} from '../functions/api/events.js'
const make=(extra={})=>({event_id:crypto.randomUUID(),session_id:crypto.randomUUID(),event_name:'page_view',event_time:new Date().toISOString(),game_mode:null,entry_point:'home',play_type:null,product_version:'v1-analytics-1',...extra})
it('rejects extra personal fields, invalid names, time, version and spoofed mode',()=>{
 expect(validEvent(make())).toBe(true)
 for(const extra of [{name:'private'},{ip:'private'},{event_name:'unknown'},{event_time:'bad'},{product_version:'bad'},{game_mode:'party'},{event_id:'bad'},{event_time:new Date(0).toISOString()}])expect(validEvent(make(extra))).toBe(false)
})
it('uses real local D1 for writes, deduplication, atomic limits and SQL funnel',async()=>{
 const mf=new Miniflare(convertV4MiniflareOptions({workers:[{name:'analytics-local-test',modules:true,script:'export default {fetch(){return new Response("local")}}',compatibilityDate:'2026-10-30',d1Databases:{ANALYTICS_DB:'local-analytics-test'}}]}))
 try{
 const db=await mf.getD1Database('ANALYTICS_DB');const schema=readFileSync('migrations/0001_analytics.sql','utf8').replace(/^\uFEFF/,'')
 for(const q of schema.split(';').filter(s=>s.trim()))await db.prepare(q).run()
 const req=(v:any,headers={},host='https://gymgogo-growth-lab.pages.dev')=>new Request(host+'/api/events',{method:'POST',headers:{origin:host,'content-type':'application/json',...headers},body:JSON.stringify(v)})
 const send=(v:any)=>onRequest({request:req(v),env:{ANALYTICS_DB:db}})
 const first=make();expect((await send(first)).status).toBe(201);expect((await send(first)).status).toBe(200)
 expect((await onRequest({request:req(first,{origin:'https://evil.example'}),env:{ANALYTICS_DB:db}})).status).toBe(403)
 expect((await onRequest({request:req(first,{},'https://preview.example'),env:{ANALYTICS_DB:db}})).status).toBe(403)
 expect((await send({foo:'x'.repeat(2200)})).status).toBe(413)
 expect((await onRequest({request:req(first),env:{}})).status).toBe(503)
 expect((await onRequest({request:req(first),env:{ANALYTICS_DB:{prepare(){throw Error('private-db-error')}}}})).status).toBe(503)
 const id=crypto.randomUUID();const responses=await Promise.all(Array.from({length:28},()=>send(make({session_id:id}))));expect(responses.filter(r=>r.status===201)).toHaveLength(20);expect(responses.filter(r=>r.status===429)).toHaveLength(8)
 await db.prepare('DELETE FROM analytics_events').run()
 const a=crypto.randomUUID(),b=crypto.randomUUID(),c=crypto.randomUUID(),orphan=crypto.randomUUID()
 const put=async(s:string,name:string,mode:string|null,play:string|null,t:number)=>{
 const e=make({session_id:s,event_name:name,game_mode:mode,play_type:play,event_time:new Date(Date.now()+t).toISOString(),entry_point:mode==='party'?'party_hero':mode==='solo'?'solo_prepare':'home'});await send(e)
 }
 for(const s of [a,b,c])await put(s,'page_view',null,null,0)
 for(const name of ['start_click','mode_select']){await put(a,name,'party','real',10);await put(b,name,'solo','demo',10);await put(c,name,'solo','real',10)}
 await put(a,'game_start','party','real',20);await put(a,'game_start','party','real',21);await put(b,'game_start','solo','demo',20);await put(orphan,'game_start','party','real',20)
 const sql=readFileSync('sql/funnel.sql','utf8').replace(/^\uFEFF/,'');const row=await db.prepare(sql).first()
 expect(row).toMatchObject({home_sessions:3,click_sessions:2,start_sessions:1,click_start_sessions:1,solo_path_sessions:1,party_path_sessions:1,effective_start_rate_pct:33.33,click_to_start_rate_pct:50})
 // Time ordering and cross-mode attribution cannot inflate conversion.
 await db.prepare('DELETE FROM analytics_events').run();await put(a,'game_start','solo','real',0);await put(a,'page_view',null,null,10);await put(a,'start_click','party','real',20);await put(a,'game_start','solo','real',30)
 expect(await db.prepare(sql).first()).toMatchObject({home_sessions:1,start_sessions:1,click_start_sessions:0})
 }finally{await mf.dispose()}
},20000)
