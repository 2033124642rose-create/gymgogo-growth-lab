// @vitest-environment node
import {readFileSync} from 'node:fs'
import vm from 'node:vm'
import {it,expect,vi} from 'vitest'
const source=readFileSync(new URL('../public/pose-worker.js',import.meta.url),'utf8')
function setup(create:ReturnType<typeof vi.fn>){
 const messages:any[]=[];const self:any={postMessage:(m:any)=>messages.push(m)}
 vm.runInNewContext(source,{self,importScripts:vi.fn(),OffscreenCanvas:class{},Vision:{FilesetResolver:{forVisionTasks:async()=>({})},PoseLandmarker:{createFromOptions:create}},performance:{now:()=>1}})
 return {self,messages}
}
it('does not duplicate pending or completed initialization',async()=>{
 let resolve!:(v:any)=>void;const create=vi.fn(()=>new Promise(r=>resolve=r));const {self,messages}=setup(create)
 const first=self.onmessage({data:{type:'init'}});await Promise.resolve();await self.onmessage({data:{type:'init'}});expect(create).toHaveBeenCalledTimes(1)
 resolve({close:vi.fn()});await first;await self.onmessage({data:{type:'init'}});expect(create).toHaveBeenCalledTimes(1);expect(messages.some(m=>m.type==='ready')).toBe(true)
})
it('reports CPU fallback progress without changing detector thresholds',async()=>{
 const create=vi.fn().mockRejectedValueOnce(Error('GPU unavailable')).mockResolvedValueOnce({close:vi.fn()});const {self,messages}=setup(create);await self.onmessage({data:{type:'init'}})
 expect(create).toHaveBeenCalledTimes(2);expect(create.mock.calls[1][1]).toMatchObject({baseOptions:{delegate:'CPU'},minPoseDetectionConfidence:0.5,minTrackingConfidence:0.5});expect(messages.some(m=>m.stage==='cpu')).toBe(true)
})
it('reports model stage failure and permits only manual re-init',async()=>{
 const create=vi.fn().mockRejectedValue(Error('fixture failure'));const {self,messages}=setup(create);await self.onmessage({data:{type:'init'}});expect(create).toHaveBeenCalledTimes(2);expect(messages.at(-1)).toMatchObject({type:'error',code:'model',stage:'cpu'})
})
