// @vitest-environment node
import {it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {DatabaseSync} from 'node:sqlite'
import {openBudgetStore} from '../cloudflare/budget-store.mjs'
it('Growth Lab references only its independent AI Worker and SQLite budget, never analytics or the original service',()=>{
 const worker=JSON.parse(readFileSync('cloudflare/wrangler.jsonc','utf8')),pages=JSON.parse(readFileSync('wrangler.jsonc','utf8'))
 expect(worker.name).toBe('gymgogo-growth-lab-quiz-service');expect(worker.workers_dev).toBe(false);expect(worker.preview_urls).toBe(false)
 expect(worker.durable_objects.bindings).toEqual([{name:'QUIZ_BUDGET',class_name:'QuizBudget'}]);expect(worker.d1_databases).toBeUndefined();expect(worker.vars.AI_API_KEY).toBeUndefined();expect(worker.vars.SOURCE_HASH_SECRET).toBeUndefined();expect(worker.vars.QUIZ_ADMIN_TOKEN).toBeUndefined()
 expect(worker.vars).toMatchObject({AI_MODEL:'qwen-flash',QUIZ_APPROVED_CALLS:'1000',QUIZ_DAILY_CALLS:'300',QUIZ_SOURCE_DAILY_CALLS:'60',QUIZ_SOURCE_MINUTE_CALLS:'10'})
 for(const c of [pages,pages.env.preview])for(const s of c.services||[])expect(s.service).toBe('gymgogo-growth-lab-quiz-service')
 expect(pages.d1_databases[0].binding).toBe('ANALYTICS_DB')
})
it('independent storage objects do not share a budget despite identical singleton names',()=>{
 const dbs:DatabaseSync[]=[];const create=()=>{const db=new DatabaseSync(':memory:');dbs.push(db);return openBudgetStore({sql:{exec(sql:string,...args:unknown[]){const p=db.prepare(sql);if(sql.startsWith('SELECT'))return{toArray:()=>p.all(...args as [])};p.run(...args as []);return{toArray:()=>[]}}},transactionSync<T>(fn:()=>T){db.exec('BEGIN');try{const x=fn();db.exec('COMMIT');return x}catch(e){db.exec('ROLLBACK');throw e}}},{source:'a'.repeat(64),limits:{total:1000,daily:300,sourceDaily:60,sourceMinute:10}})}
 try{const a=create(),b=create();a.write(d=>{d.totalCalls++;d.dailyCalls++;return true});expect(a.read().totalCalls).toBe(1);expect(b.read().totalCalls).toBe(0)}finally{dbs.forEach(d=>d.close())}
})
