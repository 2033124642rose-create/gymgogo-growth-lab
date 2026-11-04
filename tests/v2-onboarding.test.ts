import {createElement} from 'react'
import {render,fireEvent,screen,act,cleanup} from '@testing-library/react'
import {beforeEach,afterEach,it,expect,vi} from 'vitest'
import App from '../src/App'
import {GUIDE_KEY} from '../src/v2/StartGuide'
import {makeSequence} from './squat-fixtures'
const capture=vi.hoisted(()=>({frame:null as null|((f:any)=>void)}))
vi.mock('../src/camera/CameraCamp',()=>({default:({onPoseFrame}:any)=>{capture.frame=onPoseFrame;return createElement('p',null,'摄像头准备区')}}))
beforeEach(()=>{localStorage.clear();sessionStorage.clear();capture.frame=null;vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('{}')));vi.spyOn(performance,'now').mockReturnValue(0);vi.spyOn(document,'hidden','get').mockReturnValue(false);Element.prototype.scrollIntoView=vi.fn()})
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals()})
it('shows a short skippable tutorial once without requesting a camera',()=>{
 const page=render(createElement(App,{experienceV2:true}));expect(screen.getByRole('dialog')).toBeTruthy();expect(capture.frame).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'跳过教程'}));expect(localStorage.getItem(GUIDE_KEY)).toBe('1');page.unmount()
 render(createElement(App,{experienceV2:true}));expect(screen.queryByRole('dialog')).toBeNull()
})
it('V2 primary CTA asks mode rather than assuming party; solo automatically prepares but does not start early',()=>{
 localStorage.setItem(GUIDE_KEY,'1');render(createElement(App,{experienceV2:true}));fireEvent.click(screen.getByRole('button',{name:'立即开始'}))
 fireEvent.click(screen.getByRole('button',{name:/单人挑战/}));expect(screen.getByRole('button',{name:'取消准备'})).toBeTruthy();expect(screen.queryByText('真实动作计数中')).toBeNull()
 act(()=>makeSequence().hold(175,0,5500).forEach(f=>capture.frame!(f)));expect(screen.getByText('真实动作计数中')).toBeTruthy()
})
it('V2 party selection keeps nickname, hat and optional AI setup',()=>{
 localStorage.setItem(GUIDE_KEY,'1');render(createElement(App,{experienceV2:true}));fireEvent.click(screen.getByRole('button',{name:'立即开始'}));fireEvent.click(screen.getByRole('button',{name:/多人派对（2–6人）/}))
 expect(screen.getByLabelText('玩家 1 昵称')).toBeTruthy();expect(screen.getByLabelText('玩家 1 帽子')).toBeTruthy();expect(screen.getByRole('checkbox',{name:/开启 AI/})).toBeTruthy()
})
it('default V1 keeps the direct party CTA and visible solo prepare entry',()=>{
 render(createElement(App));expect(screen.queryByRole('dialog')).toBeNull();expect(screen.getByRole('button',{name:'准备挑战'})).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'立即开始'}));expect(screen.getByLabelText('玩家 1 昵称')).toBeTruthy()
})

it('navigates three distinct illustrations, returns back, and completes into mode selection',()=>{
 render(createElement(App,{experienceV2:true}))
 expect(screen.getByRole('heading',{name:'准备摄像头'})).toBeTruthy();expect(screen.queryByRole('button',{name:'上一步'})).toBeNull()
 expect(screen.getByRole('img',{name:/全身位于摄像头/})).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'下一步'}));expect(screen.getByRole('heading',{name:'学会动作'})).toBeTruthy();expect(screen.getByRole('img',{name:/连续三个动作/})).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'上一步'}));expect(screen.getByRole('heading',{name:'准备摄像头'})).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'下一步'}));fireEvent.click(screen.getByRole('button',{name:'下一步'}))
 expect(screen.getByRole('img',{name:'勇者通过深蹲攻击森林怪兽'})).toBeTruthy();expect(screen.queryByRole('button',{name:'下一步'})).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'知道了，去冒险'}))
 expect(localStorage.getItem(GUIDE_KEY)).toBe('1');expect(screen.getByRole('heading',{name:'今天，怎么出发？'})).toBeTruthy()
})
it('skip closes without mode selection; help reopens the completed tutorial on page one',()=>{
 render(createElement(App,{experienceV2:true}));fireEvent.click(screen.getByRole('button',{name:'下一步'}));fireEvent.click(screen.getByRole('button',{name:'跳过教程'}))
 expect(screen.queryByRole('dialog')).toBeNull();expect(localStorage.getItem(GUIDE_KEY)).toBe('1')
 fireEvent.click(screen.getByRole('button',{name:'玩法说明'}));expect(screen.getByRole('heading',{name:'准备摄像头'})).toBeTruthy()
 fireEvent.keyDown(screen.getByRole('dialog'),{key:'Escape'});expect(screen.queryByRole('dialog')).toBeNull()
})
