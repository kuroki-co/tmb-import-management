CREATE TABLE IF NOT EXISTS sellers (
  id uuid PRIMARY KEY,
  email varchar(200) NOT NULL UNIQUE,
  name varchar(200) NOT NULL,
  password_hash text NOT NULL,
  active boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY,
  seller_id uuid NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS fri_requests (
  id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  status varchar(30) NOT NULL DEFAULT 'Nueva' CHECK (status IN ('Nueva','En revisión','Cerrada')),
  code varchar(80) UNIQUE,
  data jsonb NOT NULL,
  receipt_hash char(64) NOT NULL
);
CREATE INDEX IF NOT EXISTS fri_created_at_idx ON fri_requests(created_at DESC);
