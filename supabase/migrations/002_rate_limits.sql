-- This will be used in edge functions to prevent abuse

CREATE TABLE IF NOT EXISTS rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  count int NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, action, window_start)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action 
ON rate_limits (user_id, action, window_start);
