-- Create a function to execute SQL statements in Supabase
-- This function allows the backup import to run TRUNCATE and INSERT statements

CREATE OR REPLACE FUNCTION execute_sql(sql_query text, parameters any[] DEFAULT '{}')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result RECORD;
BEGIN
    -- For simple TRUNCATE statements without parameters
    IF LEFT(TRIM(sql_query), 8) = 'TRUNCATE' THEN
        EXECUTE sql_query;
        RETURN;
    END IF;
    
    -- For INSERT statements with parameters
    IF LEFT(TRIM(sql_query), 6) = 'INSERT' THEN
        EXECUTE sql_query USING VARIADIC parameters;
        RETURN;
    END IF;
    
    -- For other SQL statements
    EXECUTE sql_query;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION execute_sql TO authenticated;
GRANT EXECUTE ON FUNCTION execute_sql TO service_role;