CREATE TABLE IF NOT EXISTS admin_login_limits (
 bucket TEXT PRIMARY KEY,
 attempts INTEGER NOT NULL,
 expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS admin_login_expiry ON admin_login_limits(expires_at);
