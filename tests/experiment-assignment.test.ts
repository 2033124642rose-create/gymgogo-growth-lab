import {beforeEach,afterEach,it,expect,vi} from 'vitest'
beforeEach(()=>{vi.resetModules();localStorage.clear();vi.stubEnv('VITE_AB_ENABLED','true');history.replaceState(null,'','/')})
afterEach(()=>{vi.unstubAllEnvs();history.replaceState(null,'','/')})
it('assignment survives module reload and a new analytics session',async()=>{
 const first=(await import('../src/analytics/experiment')).assignment()!;expect(['A','B']).toContain(first.variant)
 sessionStorage.clear();vi.resetModules();const next=(await import('../src/analytics/experiment')).assignment()!;expect(next).toEqual(first)
})
it('manual versions are QA and never replace the stable visitor ID',async()=>{
 history.replaceState(null,'','/?experience=v1');const a=(await import('../src/analytics/experiment')).assignment()!
 vi.resetModules();history.replaceState(null,'','/?experience=v2');const b=(await import('../src/analytics/experiment')).assignment()!
 expect(a.variant).toBe('A');expect(b.variant).toBe('B');expect(b.traffic_type).toBe('qa');expect(a.anonymous_visitor_id).toBe(b.anonymous_visitor_id)
})
it('does not enroll if durable visitor storage is blocked',async()=>{
 vi.spyOn(Storage.prototype,'getItem').mockImplementation(()=>{throw Error('blocked')});expect((await import('../src/analytics/experiment')).assignment()).toBeNull()
})
