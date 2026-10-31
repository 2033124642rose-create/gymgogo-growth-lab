import {it,expect,vi} from 'vitest'
import {cookie,session,configured,sameOrigin} from '../functions/_lib/admin-auth.js'
const env={ADMIN_USERNAME:'fixture-admin',ADMIN_PASSWORD:'fixture-admin-password',VIEWER_USERNAME:'fixture-viewer',VIEWER_PASSWORD:'fixture-viewer-password',ADMIN_SESSION_SECRET:'preview-fixture-'.repeat(6)}
it('audit: expiration, separate environment keys, malformed sessions and strict CSRF',async()=>{
 const value=(await cookie(env,'admin')).split(';')[0],req=(c:string)=>new Request('https://fixture.example/api/admin/stats',{headers:{cookie:c}})
 expect(await session(req(value),env)).toEqual({role:'admin'})
 expect(await session(req(value),{...env,ADMIN_SESSION_SECRET:'production-fixture-'.repeat(6)})).toBeNull()
 expect(await session(req(value+'x'),env)).toBeNull()
 expect(await session(req('__Host-growth_admin=viewer.1.bad.bad'),env)).toBeNull()
 expect(await session(req(value),{...env,ADMIN_PASSWORD:'short'})).toBeNull()
 expect(configured({...env,VIEWER_USERNAME:env.ADMIN_USERNAME})).toBe(false)
 expect(sameOrigin(new Request('https://fixture.example/api/admin/logout',{headers:{origin:'null'}}))).toBe(false)
 expect(sameOrigin(new Request('https://fixture.example/api/admin/logout'))).toBe(false)
 vi.useFakeTimers();try{vi.setSystemTime(Date.now()+3601000);expect(await session(req(value),env)).toBeNull()}finally{vi.useRealTimers()}
})
