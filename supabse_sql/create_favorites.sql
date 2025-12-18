-- 1) Создать таблицу favorites
CREATE TABLE IF NOT EXISTS public.favorites (
                                                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    movie_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
    );

-- 2) Уникальное ограничение на пару (user_id, movie_id)
ALTER TABLE public.favorites
    ADD CONSTRAINT favorites_user_movie_unique UNIQUE (user_id, movie_id);

-- 3) Индекс для быстрого поиска по user_id и movie_id
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites (user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_movie_id ON public.favorites (movie_id);