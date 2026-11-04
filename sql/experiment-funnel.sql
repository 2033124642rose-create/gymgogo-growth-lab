-- QA and experiment returned separately: never sum them.
WITH exposure AS (
 SELECT traffic_type,variant,anonymous_visitor_id,MIN(event_timestamp) exposed FROM experiment_events
 WHERE experiment_id='onboarding-v1-v2-20261104' AND event_name='experiment_exposure'
 GROUP BY traffic_type,variant,anonymous_visitor_id
), flags AS (
 SELECT x.*,MIN(CASE WHEN e.event_name='page_view' THEN e.event_timestamp END) home,
 MIN(CASE WHEN e.event_name='start_click' AND (e.play_type='real' OR e.play_type IS NULL) THEN e.event_timestamp END) clicked,
 MAX(CASE WHEN e.event_name='game_start' AND e.play_type='real' THEN 1 ELSE 0 END) started,
 MAX(CASE WHEN e.event_name='tutorial_view' THEN 1 ELSE 0 END) tutorial_view,
 MAX(CASE WHEN e.event_name='tutorial_skip' THEN 1 ELSE 0 END) tutorial_skip,
 MAX(CASE WHEN e.event_name='tutorial_complete' THEN 1 ELSE 0 END) tutorial_complete
 FROM exposure x LEFT JOIN experiment_events e ON e.anonymous_visitor_id=x.anonymous_visitor_id AND e.variant=x.variant AND e.traffic_type=x.traffic_type AND e.experiment_id='onboarding-v1-v2-20261104' AND e.event_timestamp>=x.exposed
 GROUP BY x.traffic_type,x.variant,x.anonymous_visitor_id
)
SELECT traffic_type,variant,COUNT(*) exposed_visitors,SUM(home IS NOT NULL) home_visitors,SUM(clicked IS NOT NULL) click_visitors,SUM(started) start_visitors,
 SUM(started=1 AND EXISTS(SELECT 1 FROM experiment_events s WHERE s.anonymous_visitor_id=flags.anonymous_visitor_id AND s.traffic_type=flags.traffic_type AND s.variant=flags.variant AND s.experiment_id='onboarding-v1-v2-20261104' AND s.event_name='game_start' AND s.play_type='real' AND s.event_timestamp>=flags.clicked)) click_start_visitors,
 SUM(tutorial_view) tutorial_viewers,SUM(tutorial_skip) tutorial_skippers,SUM(tutorial_complete) tutorial_completers,
 SUM(EXISTS(SELECT 1 FROM experiment_events s WHERE s.anonymous_visitor_id=flags.anonymous_visitor_id AND s.variant=flags.variant AND s.traffic_type=flags.traffic_type AND s.experiment_id='onboarding-v1-v2-20261104' AND s.event_timestamp>=flags.exposed AND s.event_name='game_start' AND s.play_type='real' AND s.game_mode='solo')) solo_starters,
 SUM(EXISTS(SELECT 1 FROM experiment_events s WHERE s.anonymous_visitor_id=flags.anonymous_visitor_id AND s.variant=flags.variant AND s.traffic_type=flags.traffic_type AND s.experiment_id='onboarding-v1-v2-20261104' AND s.event_timestamp>=flags.exposed AND s.event_name='game_start' AND s.play_type='real' AND s.game_mode='party')) party_starters
 FROM flags GROUP BY traffic_type,variant;

-- Auxiliary SESSION unit (column aliases retain *_visitors; interpret as sessions in this result only).
WITH exposure AS (
 SELECT traffic_type,variant,session_id,MIN(event_timestamp) exposed FROM experiment_events
 WHERE experiment_id='onboarding-v1-v2-20261104' AND event_name='experiment_exposure'
 GROUP BY traffic_type,variant,session_id
), flags AS (
 SELECT x.*,MIN(CASE WHEN e.event_name='page_view' THEN e.event_timestamp END) home,
 MIN(CASE WHEN e.event_name='start_click' AND (e.play_type='real' OR e.play_type IS NULL) THEN e.event_timestamp END) clicked,
 MAX(CASE WHEN e.event_name='game_start' AND e.play_type='real' THEN 1 ELSE 0 END) started,
 MAX(CASE WHEN e.event_name='tutorial_view' THEN 1 ELSE 0 END) tutorial_view,
 MAX(CASE WHEN e.event_name='tutorial_skip' THEN 1 ELSE 0 END) tutorial_skip,
 MAX(CASE WHEN e.event_name='tutorial_complete' THEN 1 ELSE 0 END) tutorial_complete
 FROM exposure x LEFT JOIN experiment_events e ON e.session_id=x.session_id AND e.variant=x.variant AND e.traffic_type=x.traffic_type AND e.experiment_id='onboarding-v1-v2-20261104' AND e.event_timestamp>=x.exposed
 GROUP BY x.traffic_type,x.variant,x.session_id
)
SELECT traffic_type,variant,COUNT(*) exposed_visitors,SUM(home IS NOT NULL) home_visitors,SUM(clicked IS NOT NULL) click_visitors,SUM(started) start_visitors,
 SUM(started=1 AND EXISTS(SELECT 1 FROM experiment_events s WHERE s.session_id=flags.session_id AND s.traffic_type=flags.traffic_type AND s.variant=flags.variant AND s.experiment_id='onboarding-v1-v2-20261104' AND s.event_name='game_start' AND s.play_type='real' AND s.event_timestamp>=flags.clicked)) click_start_visitors,
 SUM(tutorial_view) tutorial_viewers,SUM(tutorial_skip) tutorial_skippers,SUM(tutorial_complete) tutorial_completers,
 SUM(EXISTS(SELECT 1 FROM experiment_events s WHERE s.session_id=flags.session_id AND s.variant=flags.variant AND s.traffic_type=flags.traffic_type AND s.experiment_id='onboarding-v1-v2-20261104' AND s.event_timestamp>=flags.exposed AND s.event_name='game_start' AND s.play_type='real' AND s.game_mode='solo')) solo_starters,
 SUM(EXISTS(SELECT 1 FROM experiment_events s WHERE s.session_id=flags.session_id AND s.variant=flags.variant AND s.traffic_type=flags.traffic_type AND s.experiment_id='onboarding-v1-v2-20261104' AND s.event_timestamp>=flags.exposed AND s.event_name='game_start' AND s.play_type='real' AND s.game_mode='party')) party_starters
 FROM flags GROUP BY traffic_type,variant;
