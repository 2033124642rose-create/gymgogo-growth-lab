export const statsSQL=`WITH homes AS (
 SELECT session_id,MIN(event_time) AS home_time FROM analytics_events WHERE event_name='page_view' AND product_version IN ('v1-analytics-1','v2-release-20261105') GROUP BY session_id
), flags AS (
 SELECT h.session_id,date(h.home_time,'+8 hours') AS day,
 MIN(CASE WHEN e.event_name='start_click' AND e.play_type='real' THEN e.event_time END) AS clicked,
 MIN(CASE WHEN (e.event_name='start_click' OR (e.event_name='mode_select' AND e.product_version='v2-release-20261105')) AND e.play_type='real' AND e.game_mode='solo' THEN e.event_time END) AS sc,
 MIN(CASE WHEN (e.event_name='start_click' OR (e.event_name='mode_select' AND e.product_version='v2-release-20261105')) AND e.play_type='real' AND e.game_mode='party' THEN e.event_time END) AS pc,
 MAX(CASE WHEN e.event_name='game_start' AND e.play_type='real' AND e.game_mode='solo' THEN e.event_time END) AS ss,
 MAX(CASE WHEN e.event_name='game_start' AND e.play_type='real' AND e.game_mode='party' THEN e.event_time END) AS ps
 FROM homes h LEFT JOIN analytics_events e ON e.session_id=h.session_id AND e.product_version IN ('v1-analytics-1','v2-release-20261105') AND e.event_time>=h.home_time AND e.event_time<=?
 WHERE h.home_time>=? AND h.home_time<? GROUP BY h.session_id
) SELECT day,COUNT(*) AS home_sessions,
 SUM(clicked IS NOT NULL) AS click_sessions,
 SUM(ss IS NOT NULL OR ps IS NOT NULL) AS start_sessions,
 SUM((sc IS NOT NULL AND ss>=sc) OR (pc IS NOT NULL AND ps>=pc)) AS click_start_sessions,
 SUM(sc IS NOT NULL) AS solo_clicks,SUM(pc IS NOT NULL) AS party_clicks,
 SUM(sc IS NOT NULL AND ss>=sc) AS solo_starts,SUM(pc IS NOT NULL AND ps>=pc) AS party_starts
 FROM flags GROUP BY day ORDER BY day`
export async function statistics(e,days){const now=new Date(),today=new Date(now.getTime()+8*3600000).toISOString().slice(0,10);const end=Date.parse(today+'T00:00:00Z')-8*3600000+86400000;const start=end-days*86400000;const result=await e.ANALYTICS_DB.prepare(statsSQL).bind(now.toISOString(),new Date(start).toISOString(),new Date(end).toISOString()).all();const rows=result.results;const total={home_sessions:0,click_sessions:0,start_sessions:0,click_start_sessions:0,solo_clicks:0,party_clicks:0,solo_starts:0,party_starts:0};for(const row of rows)for(const key of Object.keys(total))total[key]+=Number(row[key]||0);const trend=[];for(let t=start;t<end;t+=86400000){const day=new Date(t+8*3600000).toISOString().slice(0,10);trend.push(rows.find(r=>r.day===day)||{day,...Object.fromEntries(Object.keys(total).map(k=>[k,0]))})}return {days,version:'v1+v2-release',generated_at:now.toISOString(),total,trend}}
