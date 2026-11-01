-- The owner's time zone, in which civil dates hold: today, overdue tasks and the done window. Null
-- until the first load, when the browser sets its own; until then, UTC.
ALTER TABLE auth_owner ADD COLUMN time_zone TEXT CHECK (time_zone IS NULL OR length(time_zone) BETWEEN 1 AND 64);
