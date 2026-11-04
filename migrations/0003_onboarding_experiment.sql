-- Additive only. Legacy analytics_events is unchanged.
CREATE TABLE IF NOT EXISTS experiment_events (
 event_id TEXT PRIMARY KEY, experiment_id TEXT NOT NULL, variant TEXT NOT NULL CHECK(variant IN ('A','B')),
 experience_version TEXT NOT NULL, anonymous_visitor_id TEXT NOT NULL, session_id TEXT NOT NULL,
 event_name TEXT NOT NULL, event_timestamp TEXT NOT NULL, game_mode TEXT, play_type TEXT,
 entry_point TEXT NOT NULL, traffic_type TEXT NOT NULL CHECK(traffic_type IN ('qa','experiment')), received_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS experiment_cohort ON experiment_events(experiment_id,traffic_type,anonymous_visitor_id,event_timestamp);
CREATE INDEX IF NOT EXISTS experiment_received ON experiment_events(received_at);
