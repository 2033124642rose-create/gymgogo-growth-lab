-- Run on one version/cohort; all timestamps are UTC ISO, cohort day uses Beijing time.
WITH homes AS (
 SELECT session_id,product_version,MIN(event_time) AS home_time
 FROM analytics_events WHERE event_name='page_view' AND product_version='v1-analytics-1'
 GROUP BY session_id,product_version
), relevant AS (
 SELECT e.* FROM analytics_events e JOIN homes h USING(session_id,product_version)
 WHERE e.event_time>=h.home_time
), clicks AS (
 SELECT session_id,game_mode,MIN(event_time) AS click_time FROM relevant
 WHERE event_name='start_click' AND play_type='real' GROUP BY session_id,game_mode
), starts AS (
 SELECT DISTINCT session_id,game_mode,event_time FROM relevant
 WHERE event_name='game_start' AND play_type='real'
), click_starts AS (
 SELECT DISTINCT c.session_id FROM clicks c JOIN starts s
 ON s.session_id=c.session_id AND s.game_mode=c.game_mode AND s.event_time>=c.click_time
), selected AS (
 SELECT DISTINCT session_id,game_mode FROM relevant WHERE event_name='mode_select' AND play_type='real'
), counts AS (
 SELECT (SELECT COUNT(*) FROM homes) AS home_sessions,
 (SELECT COUNT(DISTINCT session_id) FROM clicks) AS click_sessions,
 (SELECT COUNT(DISTINCT session_id) FROM starts) AS start_sessions,
 (SELECT COUNT(*) FROM click_starts) AS click_start_sessions,
 (SELECT COUNT(*) FROM selected WHERE game_mode='solo') AS solo_path_sessions,
 (SELECT COUNT(*) FROM selected WHERE game_mode='party') AS party_path_sessions
)
SELECT *,ROUND(100.0*click_sessions/NULLIF(home_sessions,0),2) AS click_rate_pct,
 ROUND(100.0*start_sessions/NULLIF(home_sessions,0),2) AS effective_start_rate_pct,
 ROUND(100.0*click_start_sessions/NULLIF(click_sessions,0),2) AS click_to_start_rate_pct
FROM counts;
