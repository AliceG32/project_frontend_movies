-- Функция для выполнения RAW SQL запросов
CREATE OR REPLACE FUNCTION execute_sql(sql_query TEXT)
RETURNS SETOF JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
RETURN QUERY EXECUTE sql_query;
END;
$$;