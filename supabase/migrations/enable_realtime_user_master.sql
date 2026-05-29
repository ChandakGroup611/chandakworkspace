-- Enable Realtime for user_master to allow presence subscriptions
BEGIN;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'user_master'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_master;
  END IF;
COMMIT;
