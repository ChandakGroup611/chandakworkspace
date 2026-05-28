-- Enable pg_stat_statements if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- List top 20 slowest queries
-- Exclude typical internal Supabase/Postgres queries
SELECT 
    query, 
    calls, 
    total_exec_time, 
    mean_exec_time, 
    rows 
FROM 
    pg_stat_statements 
WHERE 
    query NOT ILIKE '%pg_stat%' AND 
    query NOT ILIKE '%information_schema%' 
ORDER BY 
    mean_exec_time DESC 
LIMIT 20;

-- Reset statistics if needed to start a fresh audit (uncomment to use)
-- SELECT pg_stat_statements_reset();

-- How to use:
-- 1. Run this in the Supabase SQL Editor.
-- 2. Identify the slow query.
-- 3. Run EXPLAIN ANALYZE <your_query> to see the query plan.
