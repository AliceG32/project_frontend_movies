CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.comments (
                                               id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    comment text NOT NULL,
    movie_id uuid NOT NULL,
    user_id uuid NOT NULL
    );

CREATE INDEX IF NOT EXISTS idx_comments_movie_id ON public.comments (movie_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments (user_id);

ALTER TABLE public.comments
    ADD CONSTRAINT comments_user_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.comments
    ADD CONSTRAINT comments_movie_fkey FOREIGN KEY (movie_id) REFERENCES public.movies(id) ON DELETE CASCADE;