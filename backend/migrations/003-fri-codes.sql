LOCK TABLE fri_requests IN ACCESS EXCLUSIVE MODE;
CREATE TABLE document_counters (
  name text PRIMARY KEY,
  last_value bigint NOT NULL CHECK (last_value >= 0)
);
INSERT INTO document_counters(name, last_value)
SELECT 'fri', COALESCE(MAX(SUBSTRING(code FROM 5)::bigint), 0)
FROM fri_requests WHERE code ~ '^TMB-[0-9]+$';

WITH missing AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS position
  FROM fri_requests WHERE code IS NULL
), numbered AS (
  SELECT missing.id, (counter.last_value + missing.position)::text AS number
  FROM missing CROSS JOIN document_counters counter WHERE counter.name = 'fri'
)
UPDATE fri_requests request
SET code = 'TMB-' || LPAD(numbered.number, GREATEST(6, LENGTH(numbered.number)), '0')
FROM numbered WHERE request.id = numbered.id;

UPDATE document_counters SET last_value = (
  SELECT COALESCE(MAX(SUBSTRING(code FROM 5)::bigint), 0)
  FROM fri_requests WHERE code ~ '^TMB-[0-9]+$'
) WHERE name = 'fri';
ALTER TABLE fri_requests ALTER COLUMN code SET NOT NULL;
