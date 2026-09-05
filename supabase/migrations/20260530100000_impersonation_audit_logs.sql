-- Impersonation Audit Logs
-- Tracks every time a Super Admin impersonates a restaurant admin

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    super_admin_id UUID NOT NULL REFERENCES auth.users(id),
    super_admin_email TEXT NOT NULL,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id),
    restaurant_name TEXT NOT NULL,
    action TEXT NOT NULL,              -- 'IMPERSONATE_START' or 'IMPERSONATE_END'
    ip_address TEXT,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only Super Admins can view audit logs
CREATE POLICY "Super admins can view audit logs" ON audit_logs
  FOR SELECT USING (get_auth_user_role() = 'SUPER_ADMIN');

-- Only Super Admins can insert audit logs
CREATE POLICY "Super admins can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (get_auth_user_role() = 'SUPER_ADMIN');

-- Index for efficient queries
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_restaurant_id ON audit_logs(restaurant_id);
CREATE INDEX idx_audit_logs_super_admin_id ON audit_logs(super_admin_id);
