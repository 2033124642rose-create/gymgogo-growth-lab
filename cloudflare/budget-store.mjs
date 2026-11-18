// All public parties and reservations share ONE Durable Object / SQLite row.
export function openBudgetStore(storage) {
  let poisoned=false
  storage.sql.exec('CREATE TABLE IF NOT EXISTS quiz_state (id INTEGER PRIMARY KEY CHECK(id=1), body TEXT NOT NULL)')
  const initial=()=>({version:1,totalCalls:0,totalReservedMicro:0,day:'',dailyCalls:0,reservedMicro:0,recent:[],parties:{},sources:{}})
  const read=()=>{
    const rows=storage.sql.exec('SELECT body FROM quiz_state WHERE id=1').toArray()
    const d=rows.length?JSON.parse(rows[0].body):initial()
    if(d.version!==1||!['totalCalls','totalReservedMicro','dailyCalls','reservedMicro'].every(k=>Number.isSafeInteger(d[k])&&d[k]>=0)||!Array.isArray(d.recent)||!d.parties||!d.sources||
      Object.values(d.sources).some(v=>!Number.isSafeInteger(v.calls)||v.calls<0||!Array.isArray(v.recent)||v.recent.some(t=>!Number.isFinite(t))))throw Error('store_unavailable')
    return d
  }
  return {read,close(){},write(change){
    if(poisoned)throw Error('store_unavailable')
    try{return storage.transactionSync(()=>{
      const d=read(),before=d.totalCalls,result=change(d),delta=d.totalCalls-before
      if(delta){
        if(delta!==1)throw Error('store_unavailable')
      }
      // Bounded storage; stop rather than discard outstanding budget / idempotency records.
      const body=JSON.stringify(d)
      if(body.length>8_000_000)throw Error('store_unavailable')
      storage.sql.exec('INSERT INTO quiz_state(id,body) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body',body)
      return structuredClone(result)
    })}catch(e){poisoned=true;throw Error('store_unavailable')}
  }}
}
