-- Add code column to tasks table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'code') THEN
    ALTER TABLE tasks ADD COLUMN code TEXT;
  END IF;
END $$;

-- Create sequence for task codes
CREATE SEQUENCE IF NOT EXISTS tasks_code_seq START 1;

-- Create trigger function for task code generation
CREATE OR REPLACE FUNCTION generate_task_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.code IS NULL THEN
    NEW.code := 'TSK-' || LPAD(nextval('tasks_code_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and create it
DROP TRIGGER IF EXISTS trg_generate_task_code ON tasks;
CREATE TRIGGER trg_generate_task_code
BEFORE INSERT ON tasks
FOR EACH ROW
EXECUTE FUNCTION generate_task_code();
