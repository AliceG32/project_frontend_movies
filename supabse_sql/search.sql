-- :search_text замените на ваш поисковый текст (или используйте параметр)
WITH q AS (
    SELECT plainto_tsquery('russian', :search_text) AS query
)
SELECT
    f.*,
    ts_rank_cd(
            setweight(to_tsvector('russian', coalesce(f.subtitles, '')), 'A') ||
            setweight(to_tsvector('russian', coalesce(f.description, '')), 'B'),
            q.query
    ) AS rank
FROM public.movies f, q
WHERE
    (setweight(to_tsvector('russian', coalesce(f.subtitles, '')), 'A') ||
     setweight(to_tsvector('russian', coalesce(f.description, '')), 'B'))
    @@ q.query OR f.title = :search_text
ORDER BY rank DESC
    LIMIT 50;