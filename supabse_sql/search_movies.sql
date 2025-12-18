-- Функция для полнотекстового поиска с ilike
CREATE OR REPLACE FUNCTION search_movies(
  search_text TEXT,
  offset_val INT DEFAULT 0,
  limit_val INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  release_year INTEGER,
  duration_minutes INTEGER,
  description TEXT,
  rating DOUBLE PRECISION,  -- float8 это DOUBLE PRECISION
  subtitles TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  rank DOUBLE PRECISION
)
LANGUAGE SQL
AS $$
  WITH q AS (
    SELECT plainto_tsquery('russian', search_text) AS query
  )
SELECT
    f.id,
    f.title,
    f.release_year,
    f.duration_minutes,
    f.description,
    f.rating,
    f.subtitles,
    f.created_at,
    f.updated_at,
    ts_rank_cd(
            setweight(to_tsvector('russian', coalesce(f.subtitles, '')), 'A') ||
            setweight(to_tsvector('russian', coalesce(f.description, '')), 'B'),
            q.query
    ) AS rank
FROM public.movies f, q
WHERE
    (setweight(to_tsvector('russian', coalesce(f.subtitles, '')), 'A') ||
     setweight(to_tsvector('russian', coalesce(f.description, '')), 'B'))
    @@ q.query OR f.title ILIKE '%' || search_text || '%'
ORDER BY rank DESC
    LIMIT limit_val
OFFSET offset_val;
$$;