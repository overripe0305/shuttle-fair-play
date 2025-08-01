-- Update all existing player status values to lowercase
UPDATE players 
SET status = CASE 
  WHEN status = 'Available' THEN 'available'
  WHEN status = 'In progress' THEN 'in_progress' 
  WHEN status = 'Done' THEN 'done'
  WHEN status = 'Queued' THEN 'waiting'
  ELSE LOWER(status)
END;