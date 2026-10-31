DELETE FROM analytics_events WHERE received_at < strftime('%Y-%m-%dT%H:%M:%fZ','now','-30 days');
