// @vitest-environment node
import {DatabaseSync} from 'node:sqlite'
import {readFileSync} from 'node:fs'
import {describe,it,expect} from 'vitest'
import {validExperiment} from '../functions/api/experiment-events.js'
import {experimentSQL,sessionSQL} from '../functions/_lib/experiment-stats.js'
const id='00000000-0000-4000-8000-000000000001',time=new Date().toISOString()
const fixture={experiment_id:'onboarding-v1-v2-20261104',variant:'A',experience_version:'v1',anonymous_visitor_id:id,traffic_type:'experiment',event_timestamp:time,event_id:id,session_id:id,event_name:'experiment_exposure',event_time:time,game_mode:null,entry_point:'home',play_type:null,product_version:'v1-analytics-1'}
describe('isolated onboarding experiment',()=>{
 it('validates fixed assignment, QA isolation and minimal fields',()=>{
 expect(validExperiment(fixture,'gymgogo-growth-lab.pages.dev')).toBe(true)
 expect(validExperiment(fixture,'preview.gymgogo-growth-lab.pages.dev')).toBe(false)
 expect(validExperiment({...fixture,traffic_type:'qa'},'preview.gymgogo-growth-lab.pages.dev')).toBe(true)
 expect(validExperiment({...fixture,variant:'B',experience_version:'v2'},'gymgogo-growth-lab.pages.dev')).toBe(false)
 expect(validExperiment({...fixture,password:'no'},'gymgogo-growth-lab.pages.dev')).toBe(false)
 expect(validExperiment({...fixture,event_name:'tutorial_complete'},'gymgogo-growth-lab.pages.dev')).toBe(false)
 })
 it('migration preserves history; SQL deduplicates visitors, separates QA, excludes demo and wrong order',()=>{
 const db=new DatabaseSync(':memory:');try{
 db.exec("CREATE TABLE analytics_events(id TEXT); INSERT INTO analytics_events VALUES('history')")
 db.exec(readFileSync('migrations/0003_onboarding_experiment.sql','utf8'));db.exec(readFileSync('migrations/0003_onboarding_experiment.sql','utf8'))
 expect(db.prepare('SELECT COUNT(*) n FROM analytics_events').get().n).toBe(1)
 const insert=db.prepare('INSERT INTO experiment_events VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)');let n=0
 function event(visitor:string,name:string,second:number,qa='experiment',mode:any=null,play:any=null,session='s1'){
 insert.run(String(++n),fixture.experiment_id,'A','v1',visitor,session,name,`2026-11-04T00:00:0${second}.000Z`,mode,play,'home',qa,time)
 }
 event('v1','experiment_exposure',0);event('v1','page_view',1);event('v1','start_click',2);event('v1','game_start',3,'experiment','solo','real');event('v1','game_start',4,'experiment','party','real');event('v1','experiment_exposure',5,'experiment',null,null,'s2')
 event('v2','experiment_exposure',0,'qa');event('v2','game_start',2,'qa','solo','real')
 event('v3','experiment_exposure',0);event('v3','game_start',2,'experiment','solo','demo')
 const rows=db.prepare(experimentSQL).all();expect(rows.find(r=>r.traffic_type==='experiment')).toMatchObject({exposed_visitors:2,start_visitors:1,click_start_visitors:1,solo_starters:1,party_starters:1})
 expect(rows.find(r=>r.traffic_type==='qa').exposed_visitors).toBe(1)
 expect(db.prepare(sessionSQL).all().length).toBeGreaterThan(0)
 }finally{db.close()}
 })
})
