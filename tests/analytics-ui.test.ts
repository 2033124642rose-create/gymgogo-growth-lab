import {createElement} from 'react'
import {render,fireEvent,screen,act,cleanup} from '@testing-library/react'
import {beforeEach,afterEach,it,expect,vi} from 'vitest'
import App from '../src/App'
import {makeSequence} from './squat-fixtures'
import type {PoseFrame} from '../src/camera/pose'
const capture=vi.hoisted(()=>({frame:null as null|((f:PoseFrame)=>void)}))
vi.mock('../src/camera/CameraCamp',()=>({default:({onPoseFrame}:any)=>{capture.frame=onPoseFrame;return null}}))
beforeEach(()=>{sessionStorage.clear();localStorage.clear();vi.stubEnv('MODE','development');vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('{}')));vi.spyOn(document,'hidden','get').mockReturnValue(false);vi.spyOn(performance,'now').mockReturnValue(0)})
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.unstubAllEnvs()})
const events=()=>vi.mocked(fetch).mock.calls.filter(c=>c[0]==='/api/events').map(c=>JSON.parse(String(c[1]?.body)))
const feed=()=>{const seq=makeSequence();act(()=>seq.hold(175,0,5500).forEach(f=>capture.frame!(f)))}
it('solo reports game_start only after actual ready-state transition with synthetic landmarks',()=>{
 render(createElement(App));expect(events().map(e=>e.event_name)).toEqual(['page_view']);fireEvent.click(screen.getByRole('button',{name:'准备挑战'}));expect(events().filter(e=>e.event_name==='game_start')).toHaveLength(0);feed();expect(events().filter(e=>e.event_name==='game_start')).toMatchObject([{game_mode:'solo',play_type:'real'}])
})
it('party main CTA records path not preference; creation alone is not a game_start',()=>{
 render(createElement(App));fireEvent.click(screen.getByRole('button',{name:'立即开始'}));expect(events().map(e=>e.event_name)).toEqual(['page_view','start_click','mode_select']);fireEvent.change(screen.getByLabelText('玩家 1 昵称'),{target:{value:'合成甲'}});fireEvent.change(screen.getByLabelText('玩家 2 昵称'),{target:{value:'合成乙'}});fireEvent.click(screen.getByRole('button',{name:'创建派对 · 进入第一关'}));expect(events().filter(e=>e.event_name==='game_start')).toHaveLength(0);fireEvent.click(screen.getByRole('button',{name:'准备挑战'}));feed();expect(events().filter(e=>e.event_name==='game_start')).toMatchObject([{game_mode:'party',play_type:'real'}]);expect(events().every(e=>!JSON.stringify(e).includes('合成'))).toBe(true)
})
