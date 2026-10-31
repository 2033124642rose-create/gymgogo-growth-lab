CREATE TABLE IF NOT EXISTS analytics_events (
 event_id TEXT PRIMARY KEY,
 session_id TEXT NOT NULL,
 event_name TEXT NOT NULL CHECK(event_name IN ('page_view','start_click','mode_select','game_start')),
 event_time TEXT NOT NULL,
 entry_point TEXT NOT NULL,
 play_type TEXT CHECK(play_type IN ('real','demo') OR play_type IS NULL),
 game_mode TEXT CHECK(game_mode IN ('solo','party') OR game_mode IS NULL),
 product_version TEXT NOT NULL,
 received_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS analytics_session_received ON analytics_events(session_id,received_at);
CREATE INDEX IF NOT EXISTS analytics_received ON analytics_events(received_at);
CREATE INDEX IF NOT EXISTS analytics_cohort ON analytics_events(product_version,event_name,event_time,session_id);
