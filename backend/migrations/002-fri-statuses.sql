ALTER TABLE fri_requests DROP CONSTRAINT fri_requests_status_check;
UPDATE fri_requests SET status = 'Pendiente a revisar' WHERE status = 'Nueva';
-- Un cierre anterior no demuestra una compra confirmada: vuelve a revisión.
UPDATE fri_requests SET status = 'En revisión' WHERE status = 'Cerrada';
ALTER TABLE fri_requests ALTER COLUMN status SET DEFAULT 'Pendiente a revisar';
ALTER TABLE fri_requests ADD CONSTRAINT fri_requests_status_check
  CHECK (status IN ('Pendiente a revisar', 'En revisión', 'Cotizado', 'Confirmado a compra'));
