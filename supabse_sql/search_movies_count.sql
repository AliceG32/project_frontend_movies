-- Функция для подсчета результатов с ILIKE
CREATE OR REPLACE FUNCTION search_movies_count(search_text TEXT)
RETURNS BIGINT
LANGUAGE SQL
AS $$
  WITH q AS (
    SELECT plainto_tsquery('russian', search_text) AS query
  )
SELECT COUNT(*)::BIGINT
FROM public.movies f, q
WHERE
    (setweight(to_tsvector('russian', coalesce(f.subtitles, '')), 'A') ||
     setweight(to_tsvector('russian', coalesce(f.description, '')), 'B'))
    @@ q.query OR f.title ILIKE '%' || search_text || '%';
$$;