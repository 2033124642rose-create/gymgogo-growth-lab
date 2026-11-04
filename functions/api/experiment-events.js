const names=['page_view','start_click','mode_select','game_start','experiment_exposure','tutorial_view','tutorial_skip','tutorial_complete']
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
export function validExperiment(v,host,now=Date.now()){
 if(!v||Object.keys(v).sort().join(',')!==['experiment_id','variant','experience_version','anonymous_visitor_id','traffic_type','event_timestamp','event_id','session_id','event_name','event_time','game_mode','entry_point','play_type','product_version'].sort().join(','))return false
 if(v.experiment_id!=='onboarding-v1-v2-20261104'||!names.includes(v.event_name)||!uuid.test(v.anonymous_visitor_id)||!uuid.test(v.session_id)||!uuid.test(v.event_id))return false
 if(!['A','B'].includes(v.variant)||v.experience_version!==(v.variant==='A'?'v1':'v2')||!['qa','experiment'].includes(v.traffic_type))return false
 if((host!=='gymgogo-growth-lab.pages.dev'&&v.traffic_type!=='qa')||(v.traffic_type==='experiment'&&v.variant!==(parseInt(v.anonymous_visitor_id[0],16)%2===0?'A':'B')))return false
 if(!/^\d{4}-\d\d-\d\dT.*Z$/.test(v.event_timestamp)||!Number.isFinite(Date.parse(v.event_timestamp))||Math.abs(now-Date.parse(v.event_timestamp))>600000)return false
 if(!['home','solo_prepare','solo_replay','party_hero','party_header','party_flow','party_restore'].includes(v.entry_point)||![null,'solo','party'].includes(v.game_mode)||![null,'real','demo'].includes(v.play_type)||v.product_version!=='v1-analytics-1')return false
 if(v.event_name==='game_start'&&(!v.game_mode||!v.play_type))return false
 if(v.event_name==='mode_select'&&!v.game_mode)return false
 if(v.event_name.startsWith('tutorial_')&&v.variant!=='B')return false
 return true
}
export async function onRequest({request,env}){
 const reply=(v,s)=>Response.json(v,{status:s,headers:{'Cache-Control':'no-store'}}),u=new URL(request.url)
 if(env.AB_ENABLED!=='true')return reply({error:'disabled'},503)
 if(request.method!=='POST')return reply({error:'method'},405)
 if(request.headers.get('origin')!==u.origin||!request.headers.get('content-type')?.startsWith('application/json'))return reply({error:'origin'},403)
 try{
 const reader=request.body?.getReader();if(!reader)return reply({error:'invalid'},400);let size=0;const chunks=[]
 while(true){const r=await reader.read();if(r.done)break;size+=r.value.length;if(size>3072){await reader.cancel();return reply({error:'size'},413)}chunks.push(r.value)}
 const body=new Uint8Array(size);let offset=0;for(const c of chunks){body.set(c,offset);offset+=c.length}
 const v=JSON.parse(new TextDecoder().decode(body));if(!validExperiment(v,u.hostname))return reply({error:'invalid'},400)
 const now=new Date().toISOString(),minute=new Date(Date.now()-60000).toISOString(),day=now.slice(0,10)+'T00:00:00.000Z'
 return await insert(env,v,now,minute,day,reply)
 }catch{return reply({error:'unavailable'},503)}
}
async function insert(env,v,now,minute,day,reply){
 const r=await env.ANALYTICS_DB.prepare(`INSERT OR IGNORE INTO experiment_events SELECT ?,?,?,?,?,?,?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM experiment_events WHERE anonymous_visitor_id=? AND received_at>=?)<60 AND (SELECT COUNT(*) FROM experiment_events WHERE received_at>=?)<10000`).bind(v.event_id,v.experiment_id,v.variant,v.experience_version,v.anonymous_visitor_id,v.session_id,v.event_name,v.event_timestamp,v.game_mode,v.play_type,v.entry_point,v.traffic_type,now,v.anonymous_visitor_id,minute,day).run()
 if(r.meta.changes)return reply({accepted:true},201)
 const duplicate=await env.ANALYTICS_DB.prepare('SELECT 1 FROM experiment_events WHERE event_id=?').bind(v.event_id).first();return duplicate?reply({accepted:true,duplicate:true},200):reply({error:'rate_limited'},429)
}
