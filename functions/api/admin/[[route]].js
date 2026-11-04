import {experimentStats,experimentSessions} from '../../_lib/experiment-stats.js'
import {session,configured,authenticate,cookie,clearCookie,sameOrigin,limit,smallBody,json} from '../../_lib/admin-auth.js'
import {statistics} from '../../_lib/admin-stats.js'
export async function onRequest({request,env}){try{const route=new URL(request.url).pathname.split('/').at(-1)
 if(route==='login'){
 const failure=(error,status)=>request.headers.get('content-type')?.startsWith('application/json')?json({error},status):new Response(null,{status:303,headers:{Location:'/admin/login?error='+ (status===401?'invalid':status===429?'limited':'unavailable'),'Cache-Control':'no-store'}})
 if(request.method!=='POST')return json({error:'method'},405)
 if(!sameOrigin(request))return json({error:'origin'},403)
 if(!configured(env))return failure('登录尚未配置，请联系管理员',503)
 if(!await limit(request,env))return failure('登录尝试过多，请15分钟后重试',429)
 const raw=await smallBody(request);let v;if(request.headers.get('content-type')?.startsWith('application/json'))v=JSON.parse(raw);else v=Object.fromEntries(new URLSearchParams(raw));if(Object.keys(v).some(k=>!['username','password'].includes(k))||typeof v.username!=='string'||typeof v.password!=='string'||v.username.length>128||v.password.length>256)return json({error:'输入无效'},400)
 const role=await authenticate(env,v.username,v.password);if(!role)return failure('账号或密码错误',401)
 return new Response(null,{status:303,headers:{Location:'/admin','Set-Cookie':await cookie(env,role),'Cache-Control':'no-store'}})
 }
 const user=await session(request,env);if(!user)return json({error:'unauthorized'},401)
 if(route==='logout'){if(request.method!=='POST'||!sameOrigin(request))return json({error:'origin'},403);return new Response(null,{status:303,headers:{Location:'/admin/login','Set-Cookie':clearCookie,'Cache-Control':'no-store'}})}
 if(request.method!=='GET')return json({error:'method'},405)
 if(route==='experiment'){if(env.AB_ENABLED!=='true')return json({error:'disabled'},503);return json({rows:await experimentStats(env),sessionRows:await experimentSessions(env),notice:'QA与正式实验分列；小样本仅描述，不作显著性结论。'})}
 if(!['stats','export'].includes(route))return json({error:'not_found'},404)
 if(route==='export'&&user.role!=='admin')return json({error:'forbidden'},403)
 const raw=new URL(request.url).searchParams.get('days')||'7';if(!['7','30'].includes(raw))return json({error:'range'},400)
 if(!env.ANALYTICS_DB)return json({error:'unavailable'},503)
 const data=await statistics(env,Number(raw))
 if(route==='stats')return json({...data,role:user.role})
 const keys=['day',...Object.keys(data.total)];const csv='\uFEFF'+keys.join(',')+'\r\n'+data.trend.map(r=>keys.map(k=>r[k]).join(',')).join('\r\n');return new Response(csv,{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="growth-aggregate.csv"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}})
 }catch{return json({error:'服务暂不可用，请稍后重试'},503)}}
