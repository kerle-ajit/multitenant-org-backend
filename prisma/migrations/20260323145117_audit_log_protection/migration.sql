-- This is an empty migration.
-- Prevent UPDATE or DELETE on AuditLog
CREATE OR REPLACE FUNCTION prevent_auditlog_modifications()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog table is append-only. % operations are not allowed.', TG_OP;
END;
$$ LANGUAGE plpgsql;

-- Trigger for UPDATE
CREATE TRIGGER auditlog_no_update
BEFORE UPDATE ON "AuditLog"
FOR EACH ROW
EXECUTE FUNCTION prevent_auditlog_modifications();

-- Trigger for DELETE
CREATE TRIGGER auditlog_no_delete
BEFORE DELETE ON "AuditLog"
FOR EACH ROW
EXECUTE FUNCTION prevent_auditlog_modifications();