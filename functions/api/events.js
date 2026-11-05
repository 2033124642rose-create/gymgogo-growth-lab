const KEYS=['event_id','session_id','event_name','event_time','entry_point','play_type','game_mode','product_version']
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const ENTRIES={solo_prepare:'solo',solo_replay:'solo',party_hero:'party',party_header:'party',party_flow:'party',party_restore:'party'}
export function validEvent(v,now=Date.now()){
 if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length!==KEYS.length||Object.keys(v).some(k=>!KEYS.includes(k)))return false
 if(!uuid.test(v.event_id)||!uuid.test(v.session_id)||!['v1-analytics-1','v2-release-20261105'].includes(v.product_version))return false
 if(typeof v.event_time!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(v.event_time)||!Number.isFinite(Date.parse(v.event_time))||Math.abs(now-Date.parse(v.event_time))>600000)return false
 if(v.event_name==='page_view')return v.game_mode===null&&v.play_type===null&&v.entry_point==='home'
 if(v.product_version==='v2-release-20261105'&&v.event_name==='start_click'&&v.game_mode===null&&v.play_type==='real'&&v.entry_point==='home')return true
 if(!['start_click','mode_select','game_start'].includes(v.event_name)||!['real','demo'].includes(v.play_type)||ENTRIES[v.entry_point]!==v.game_mode)return false
 if(v.game_mode==='party'&&v.play_type!=='real')return false
 if(v.event_name!=='game_start'&&['party_flow','party_restore'].includes(v.entry_point))return false
 return true
}
export async function onRequest({request,env}){
 const reply=(v,status)=>Response.json(v,{status,headers:{'Cache-Control':'no-store'}})
 const url=new URL(request.url)
 if(!['gymgogo-growth-lab.pages.dev','localhost','127.0.0.1'].includes(url.hostname))return reply({error:'collection_disabled'},403)
 if(request.method!=='POST')return reply({error:'method'},405)
 if(request.headers.get('origin')!==url.origin)return reply({error:'origin'},403)
 if(!request.headers.get('content-type')?.startsWith('application/json'))return reply({error:'content_type'},415)
 if(!env.ANALYTICS_DB)return reply({error:'unavailable'},503)
 try{
  const reader=request.body?.getReader();if(!reader)return reply({error:'invalid'},400)
  let size=0;const chunks=[];while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2048){await reader.cancel();return reply({error:'size'},413)}chunks.push(value)}
  const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length}
  let v;try{v=JSON.parse(new TextDecoder().decode(bytes))}catch{return reply({error:'invalid'},400)}
  if(!validEvent(v))return reply({error:'invalid'},400)
  const now=new Date().toISOString(),minute=new Date(Date.now()-60000).toISOString(),day=now.slice(0,10)+'T00:00:00.000Z'
  // One atomic SQLite statement. No IP, identity, separate counters or in-memory rate limits.
  const result=await env.ANALYTICS_DB.prepare(`INSERT OR IGNORE INTO analytics_events
   (event_id,session_id,event_name,event_time,entry_point,play_type,game_mode,product_version,received_at)
   SELECT ?,?,?,?,?,?,?,?,?
   WHERE (SELECT COUNT(*) FROM analytics_events WHERE session_id=? AND received_at>=?)<20
   AND (SELECT COUNT(*) FROM analytics_events WHERE session_id=? AND received_at>=?)<200
   AND (SELECT COUNT(*) FROM analytics_events WHERE received_at>=?)<5000`).bind(v.event_id,v.session_id,v.event_name,v.event_time,v.entry_point,v.play_type,v.game_mode,v.product_version,now,v.session_id,minute,v.session_id,day,day).run()
  if(result.meta.changes)return reply({accepted:true},201)
  const duplicate=await env.ANALYTICS_DB.prepare('SELECT event_id FROM analytics_events WHERE event_id=?').bind(v.event_id).first()
  return duplicate?reply({accepted:true,duplicate:true},200):reply({error:'rate_limited'},429)
 }catch{return reply({error:'unavailable'},503)}
}
