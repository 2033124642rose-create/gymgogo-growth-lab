import {beforeEach,it,expect,vi} from 'vitest'
import {entry,homeVisible,gameStarted,setOptOut,VERSION} from '../src/analytics/client'
beforeEach(()=>{vi.stubEnv('MODE','development');sessionStorage.clear();localStorage.clear();vi.stubGlobal('fetch',vi.fn(()=>Promise.resolve(new Response('{}'))));vi.spyOn(document,'hidden','get').mockReturnValue(false)})
const events=()=>vi.mocked(fetch).mock.calls.map(c=>JSON.parse(String(c[1]?.body)))
it('deduplicates homepage and actual start across remount and repeated rounds; excludes no artificial clicks for restore',()=>{
 homeVisible(true);homeVisible(false);homeVisible(true);entry('party','party_hero','real');gameStarted('party','real','party_flow');gameStarted('party','real','party_flow')
 expect(events().map(e=>e.event_name)).toEqual(['page_view','start_click','mode_select','game_start'])
 sessionStorage.clear();homeVisible(false);gameStarted('party','real','party_restore');expect(events().at(-1)).toMatchObject({entry_point:'party_restore',event_name:'game_start'})
})
it('refresh keeps session; inactivity rotates; demo and solo have explicit attribution',()=>{
 homeVisible(true);const first=events()[0].session_id;entry('solo','solo_prepare','demo');expect(events()[1].session_id).toBe(first)
 const key='growth.analytics.session.v1',s=JSON.parse(sessionStorage.getItem(key)!);s.last=Date.now()-1800001;sessionStorage.setItem(key,JSON.stringify(s));homeVisible(true)
 expect(events().at(-1).session_id).not.toBe(first);expect(events()[1]).toMatchObject({play_type:'demo',game_mode:'solo',product_version:VERSION})
})
it('opt out prevents collection and failures never break play',()=>{
 setOptOut(true);entry('solo','solo_prepare','real');gameStarted('solo','real','solo_prepare');expect(fetch).not.toHaveBeenCalled()
 setOptOut(false);vi.mocked(fetch).mockImplementation(()=>{throw Error('offline')});expect(()=>entry('solo','solo_prepare','real')).not.toThrow()
})
