// @vitest-environment node
import {DatabaseSync} from 'node:sqlite'
import {afterEach,describe,it,expect,vi} from 'vitest'
import {QuizBudget,default as worker} from '../cloudflare/worker.mjs'
import {onRequest} from '../functions/api/quiz/[[route]].js'
import {openBudgetStore} from '../cloudflare/budget-store.mjs'
const databases:DatabaseSync[]=[]
afterEach(()=>{vi.unstubAllGlobals();for(const d of databases.splice(0))d.close()})
function sqlite(){
 const db=new DatabaseSync(':memory:');databases.push(db)
 return {sql:{exec(query:string,...args:unknown[]){const stmt=db.prepare(query);if(query.startsWith('SELECT'))return {toArray:()=>stmt.all(...args as [])};stmt.run(...args as []);return {toArray:()=>[]}}},transactionSync<T>(fn:()=>T){db.exec('BEGIN IMMEDIATE');try{const r=fn();db.exec('COMMIT');return r}catch(e){db.exec('ROLLBACK');throw e}}}
}
const env={PUBLIC_AI_ENABLED:'true',FREE_QUOTA_CONFIRMED:'true',AI_API_KEY:'fixture-cloud-only',AI_PROVIDER:'bailian',AI_MODEL:'qwen-flash',QUIZ_APPROVED_CALLS:'1000',QUIZ_DAILY_CALLS:'300',QUIZ_BUDGET_CNY:'3',QUIZ_INPUT_CNY_PER_MILLION:'.15',QUIZ_OUTPUT_CNY_PER_MILLION:'1.5',QUIZ_PRICE_CHECKED_ON:new Date().toISOString().slice(0,10)}
function setup(overrides={}){
 const storage=sqlite(),settings={...env,...overrides};let serial=0,verdict='correct'
 const provider=vi.fn(async(_url,request)=>{const messages=JSON.parse(request.body).messages;const isQuestion=messages[0].content.includes('出题员');return Response.json({choices:[{message:{content:JSON.stringify(isQuestion?{question:'模拟运动常识问题'+(++serial),referenceAnswer:'隐藏的参考答案',keyPoints:['核心意思'],explanation:'隐藏解释',topic:'warmup',difficulty:JSON.parse(messages[1].content).difficulty,answerability:'clear'}:{verdict,basis:verdict==='correct'?'matches_core':verdict==='incorrect'?'contradicts_core':'insufficient',explanation:'模拟解释',monsterReaction:'怪兽模拟认输吐槽'})}}]})})
 vi.stubGlobal('fetch',provider)
 const object=new QuizBudget({storage},settings)
 const call=async(route:string,input?:unknown,token?:string,source='a'.repeat(64))=>{const response=await object.fetch(new Request('https://internal/'+route,{method:input===undefined?'GET':'POST',headers:{'X-Quiz-Source':source,'Content-Type':'application/json',...(token?{'X-Party-Token':token}:{})},body:input===undefined?undefined:JSON.stringify(input)}));return response.json()}
 const seed=(update:(d:any)=>void)=>{const s=openBudgetStore(storage);const d=s.read();update(d);storage.sql.exec('INSERT INTO quiz_state(id,body) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body',JSON.stringify(d))}
 return {storage,settings,object,provider,call,seed,setVerdict:(v:string)=>{verdict=v}}
}
const operation=(party:any,id=1,kind='question',extra={})=>({partyId:party.partyId,levelId:'slime-forest',levelAttemptId:1,playerId:'player-1',operationId:id,kind,...extra})
describe('Cloudflare handlers + actual SQLite transactions; provider simulated',()=>{
 it.each(['2020-01-01', '', 'not-a-date', '2099-01-01'])('ignores audit date %s and still counts provider calls',async date=>{
  const s=setup({QUIZ_PRICE_CHECKED_ON:date});const p=await s.call('party',{players:2})
  const q=await s.call('question',operation(p),p.token)
  expect(q.source).toBe('ai');expect(s.provider).toHaveBeenCalledTimes(1)
  expect(openBudgetStore(s.storage).read().totalCalls).toBe(1)
 })
 it.each(['correct','incorrect','uncertain'])('returns a structured question and %s judgment without exposing references',async verdict=>{
  const s=setup();const p=await s.call('party',{players:2});const q=await s.call('question',operation(p),p.token)
  expect(q.source).toBe('ai');expect(JSON.stringify(q)).not.toContain('隐藏');s.setVerdict(verdict)
  const j=await s.call('judge',operation(p,2,'judge',{questionId:q.questionId,answer:'模拟答案'}),p.token)
  expect(j.verdict).toBe(verdict);expect(j.monsterReaction).toBe('怪兽模拟认输吐槽');expect(s.provider).toHaveBeenCalledTimes(2)
 })
 it('deduplicates concurrent operations and persists that result across object recreation',async()=>{
  const s=setup();const p=await s.call('party',{players:2}),op=operation(p)
  const r=await Promise.all([s.call('question',op,p.token),s.call('question',op,p.token)])
  expect(r[0]).toEqual(r[1]);expect(s.provider).toHaveBeenCalledTimes(1)
  const next=new QuizBudget({storage:s.storage},s.settings)
  const response=await next.fetch(new Request('https://internal/question',{method:'POST',headers:{'X-Quiz-Source':'a'.repeat(64),'X-Party-Token':p.token,'Content-Type':'application/json'},body:JSON.stringify(op)}))
  expect(await response.json()).toEqual(r[0]);expect(s.provider).toHaveBeenCalledTimes(1)
 })
 it('dispatches after the old global, party and source limits have been reached',async()=>{
  const s=setup({QUIZ_BUDGET_CNY:'0'}),p=await s.call('party',{players:2})
  s.seed(d=>{
   const day=new Date(Date.now()+8*3600000).toISOString().slice(0,10)
   d.day=day;d.totalCalls=1000;d.dailyCalls=300;d.totalReservedMicro=5_000_000
   d.parties[p.partyId].totalCalls=100
   d.sources['a'.repeat(64)]={day,calls:60,recent:Array(10).fill(Date.now())}
  })
  expect((await s.call('question',operation(p),p.token)).source).toBe('ai')
  expect(s.provider).toHaveBeenCalledTimes(1)
  expect(openBudgetStore(s.storage).read().totalCalls).toBe(1001)
 })
 it.each([[403,'AllocationQuota.FreeTierOnly','model_quota_exhausted'],[429,'insufficient_quota','model_quota_exhausted'],[429,'Throttling.Concurrency','model_busy']])(
  'maps provider response %s %s to %s',async(status,code,error)=>{
   const s=setup(),p=await s.call('party',{players:2})
   s.provider.mockResolvedValueOnce(Response.json({error:{code}},{status}))
   expect((await s.call('question',operation(p),p.token)).error).toBe(error)
   expect(s.provider).toHaveBeenCalledTimes(1)
  })
 it('fails closed on missing secrets, flags and unavailable SQLite',async()=>{
  for(const overrides of [{AI_API_KEY:''},{PUBLIC_AI_ENABLED:'false'}]){
   const s=setup(overrides);expect((await s.call('status')).enabled).toBe(false);expect(s.provider).not.toHaveBeenCalled()
  }
  const s=setup();vi.spyOn(s.storage.sql,'exec').mockImplementation(()=>{throw Error('private-storage-detail')})
  expect((await s.call('party',{players:2})).error).toBe('store_unavailable');expect(s.provider).not.toHaveBeenCalled()
 })
 it('retains counts and cached failures after provider errors',async()=>{
  const s=setup(),p=await s.call('party',{players:2});s.provider.mockRejectedValue(Error('private fixture-cloud-only'))
  const result=await s.call('question',operation(p),p.token);expect(result.error).toBe('model_unavailable')
  await s.call('question',operation(p),p.token);expect(s.provider).toHaveBeenCalledTimes(1)
  const d=openBudgetStore(s.storage).read();expect(d.totalCalls).toBe(1);expect(d.totalReservedMicro).toBe(0)
  expect(JSON.stringify(result)).not.toContain('fixture-cloud-only')
 })
 it('keeps timeout attempts charged and never repeats an unknown model result',async()=>{
  const s=setup({MODEL_TIMEOUT_MS:'5'}),p=await s.call('party',{players:2})
  s.provider.mockImplementation(()=>new Promise(()=>{}))
  expect((await s.call('question',operation(p),p.token)).error).toBe('model_timeout')
  expect((await s.call('question',operation(p),p.token)).error).toBe('model_timeout')
  expect(s.provider).toHaveBeenCalledTimes(1)
  expect(openBudgetStore(s.storage).read().totalCalls).toBe(1)
 })
 it('requires administrator authorization and returns counters only',async()=>{
  const s=setup({PUBLIC_AI_ENABLED:'false',QUIZ_ADMIN_TOKEN:'fixture-admin-secret-at-least-32-characters'})
  expect((await s.call('admin-status')).error).toBe('forbidden')
  const response=await s.object.fetch(new Request('https://internal/admin-status',{headers:{'X-Quiz-Source':'a'.repeat(64),Authorization:'Bearer fixture-admin-secret-at-least-32-characters'}}))
  const value=await response.json();expect(value.totalCalls).toBe(0);expect(value).not.toHaveProperty('parties');expect(JSON.stringify(value)).not.toContain('fixture')
 })
 it('Pages replaces spoofable source headers, validates origin and caps request bodies',async()=>{
  const service={fetch:vi.fn(async()=>Response.json({fixture:true}))},context={env:{PUBLIC_AI_ENABLED:'true',QUIZ_SERVICE:service}}
  const request=(body:string,origin='https://gymgogo.pages.dev')=>new Request('https://gymgogo.pages.dev/api/quiz/party',{method:'POST',headers:{origin,'CF-Connecting-IP':'192.0.2.1','X-Quiz-Source':'spoof','X-Verified-Source':'spoof','Content-Type':'application/json'},body})
  expect((await onRequest({...context,request:request('{}','https://evil.example')})).status).toBe(403)
  expect((await onRequest({...context,request:request('x'.repeat(2049))})).status).toBe(413)
  await onRequest({...context,request:request('{}')});const forwarded=service.fetch.mock.calls[0][0]
  expect(forwarded.headers.get('X-Verified-Source')).toBe('192.0.2.1');expect(forwarded.headers.has('X-Quiz-Source')).toBe(false)
 })
 it('keeps Worker inaccessible without a source hash secret and never provides a reset route',async()=>{
  expect((await worker.fetch(new Request('https://internal/status'),{})).status).toBe(503)
  const s=setup();expect((await s.call('reset',{})).error).toBe('not_found')
 })
})
