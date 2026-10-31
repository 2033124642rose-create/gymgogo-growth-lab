// @vitest-environment node
import {it,expect} from 'vitest'
import {Miniflare,convertV4MiniflareOptions} from 'miniflare'
import {readFileSync} from 'node:fs'
import {onRequest as api} from '../functions/api/admin/[[route]].js'
import {onRequest as page} from '../functions/admin/[[route]].js'
import {cookie} from '../functions/_lib/admin-auth.js'
it('protects pages and APIs, enforces roles, queries real local D1 and persists login limits',async()=>{
const mf=new Miniflare(convertV4MiniflareOptions({workers:[{name:'admin-test',modules:true,script:'export default {fetch(){return new Response("test")}}',compatibilityDate:'2026-10-30',d1Databases:{ANALYTICS_DB:'admin-local-test'}}]}))
try{const db=await mf.getD1Database('ANALYTICS_DB');for(const f of ['migrations/0001_analytics.sql','migrations/0002_admin_login_limits.sql'])for(const sql of readFileSync(f,'utf8').replace(/^\uFEFF/,'').split(';').filter(s=>s.trim()))await db.prepare(sql).run()
const env={ANALYTICS_DB:db,ADMIN_USERNAME:'fixture-admin',ADMIN_PASSWORD:'fixture-admin-password',VIEWER_USERNAME:'fixture-viewer',VIEWER_PASSWORD:'fixture-viewer-password',ADMIN_SESSION_SECRET:'fixture-session-secret-'.repeat(4)}
const req=(route:string,opts:RequestInit={})=>new Request('https://preview.example'+route,opts)
expect((await page({request:req('/admin'),env})).headers.get('location')).toBe('/admin/login')
expect((await api({request:req('/api/admin/stats'),env})).status).toBe(401)
expect((await api({request:req('/api/admin/export?role=admin'),env})).status).toBe(401)
const loginPage=await page({request:req('/admin/login'),env});expect(loginPage.status).toBe(200);expect(loginPage.headers.get('referrer-policy')).toBe('same-origin')
const login=async(user:string,password:string,origin='https://preview.example')=>api({request:req('/api/admin/login',{method:'POST',headers:{origin,'CF-Connecting-IP':'192.0.2.1','content-type':'application/json'},body:JSON.stringify({username:user,password})}),env})
expect((await login('fixture-admin','wrong')).status).toBe(401)
expect((await login('fixture-admin',env.ADMIN_PASSWORD,'https://evil.example')).status).toBe(403)
const nullOrigin=await login('fixture-admin',env.ADMIN_PASSWORD,'null');expect(nullOrigin.status).toBe(403)
const formResponse=await api({request:req('/api/admin/login',{method:'POST',headers:{origin:'https://preview.example','CF-Connecting-IP':'192.0.2.55','content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({username:'fixture-viewer',password:env.VIEWER_PASSWORD}).toString()}),env});expect(formResponse.status).toBe(303);expect(formResponse.headers.get('location')).toBe('/admin')
const response=await login('fixture-admin',env.ADMIN_PASSWORD);expect(response.status).toBe(303);expect(response.headers.get('set-cookie')).toContain('HttpOnly; Secure; SameSite=Strict')
const admin=response.headers.get('set-cookie')!.split(';')[0],viewer=(await cookie(env,'viewer')).split(';')[0]
const data=await api({request:req('/api/admin/stats?days=7',{headers:{cookie:viewer}}),env});expect(data.status).toBe(200);const v=await data.json();expect(v.total.home_sessions).toBe(0);expect(v.trend).toHaveLength(7);expect(JSON.stringify(v)).not.toContain('session_id')
expect((await api({request:req('/api/admin/export',{headers:{cookie:viewer}}),env})).status).toBe(403)
expect((await api({request:req('/api/admin/raw',{headers:{cookie:admin}}),env})).status).toBe(404)
expect((await api({request:req('/api/admin/stats?days=99',{headers:{cookie:admin}}),env})).status).toBe(400)
expect((await api({request:req('/api/admin/export',{headers:{cookie:admin}}),env})).headers.get('content-type')).toContain('text/csv')
expect((await api({request:req('/api/admin/stats',{headers:{cookie:admin+'x'}}),env})).status).toBe(401)
expect((await api({request:req('/api/admin/stats',{headers:{cookie:admin}}),env:{...env,ADMIN_SESSION_SECRET:'changed-'.repeat(12)}})).status).toBe(401)
expect((await page({request:req('/admin',{headers:{cookie:admin}}),env})).headers.get('referrer-policy')).toBe('same-origin')
expect((await api({request:req('/api/admin/logout',{method:'POST',headers:{cookie:admin,origin:'https://preview.example'}}),env})).headers.get('set-cookie')).toContain('Max-Age=0')
for(let i=0;i<12;i++)await login('fixture-admin','wrong');expect((await login('fixture-admin',env.ADMIN_PASSWORD)).status).toBe(429)
expect((await api({request:req('/api/admin/stats',{headers:{cookie:admin}}),env:{}})).status).toBe(401)
// Seed local-only events and verify ordered attribution and exclusion of demo, never remote data.
const now=Date.now()-10000;for(const [session,mode,play] of [['a','solo','real'],['b','party','real'],['c','solo','demo']])for(const [i,event] of ['page_view','start_click','game_start'].entries())await db.prepare('INSERT INTO analytics_events VALUES(?,?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),session,event,new Date(now+i*100).toISOString(),'home',event==='page_view'?null:play,event==='page_view'?null:mode,'v1-analytics-1',new Date().toISOString()).run()
const stats=await(await api({request:req('/api/admin/stats',{headers:{cookie:viewer}}),env})).json();expect(stats.total).toMatchObject({home_sessions:3,click_sessions:2,start_sessions:2,click_start_sessions:2,solo_starts:1,party_starts:1})
expect((await(await page({request:req('/admin',{headers:{cookie:viewer}}),env})).text())).toContain('样本不足')
}finally{await mf.dispose()}
},20000)
