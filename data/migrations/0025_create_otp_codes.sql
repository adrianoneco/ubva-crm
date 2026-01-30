-- Create OTP codes table for password recovery
CREATE TABLE IF NOT EXISTS otp_codes (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(50) NOT NULL,
  code VARCHAR(6) NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  used_at TIMESTAMP WITH TIME ZONE
);

-- Create index on phone and expires_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_otp_codes_phone ON otp_codes(phone);
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires_at ON otp_codes(expires_at);
