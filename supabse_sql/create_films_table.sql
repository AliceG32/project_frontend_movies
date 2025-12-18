CREATE TABLE public.movies (
                              id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                              title varchar NOT NULL,
                              release_year integer NOT NULL,
                              duration_minutes integer NOT NULL,
                              description text NOT NULL,
                              subtitles text,
                              rating double precision NOT NULL,
                              tsv tsvector NOT NULL -- поле для комбинированного full-text поиска
);

-- 2) Функция для нормализации текста в tsvector (использует unaccent, если есть)
CREATE OR REPLACE FUNCTION public.movies_tsv_trigger() RETURNS trigger AS $$
BEGIN
  -- Собираем поля для индексации: description и subtitles (subtitles может быть NULL)
  NEW.tsv :=
    setweight(to_tsvector('pg_catalog.russian', coalesce(unaccent(NEW.description), '')), 'A')
    ||
    setweight(to_tsvector('pg_catalog.russian', coalesce(unaccent(NEW.subtitles), '')), 'B');
RETURN NEW;
END;
$$ LANGUAGE plpgsql IMMUTABLE; -- функция только по входным параметрам, можно пометить IMMUTABLE
-- Примечание: пометьте IMMUTABLE только если unaccent и to_tsvector считаются детерминированными в вашей окружении.

-- 3) Триггер для поддержания tsv при INSERT/UPDATE
CREATE TRIGGER movies_tsv_update
    BEFORE INSERT OR UPDATE ON public.movies
                         FOR EACH ROW EXECUTE FUNCTION public.movies_tsv_trigger();

-- 4) Индекс для полнотекстового поиска
CREATE INDEX idx_movies_tsv ON public.movies USING GIN (tsv);