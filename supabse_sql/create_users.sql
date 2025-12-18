-- 1) Убедимся, что расширение pgcrypto установлено (нужны права)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2) Таблица пользователей
CREATE TABLE IF NOT EXISTS public.users (
                                            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    password_hash text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
    );

-- 3) Уникальность имени и индекс
ALTER TABLE public.users
    ADD CONSTRAINT users_name_unique UNIQUE (name);

CREATE INDEX IF NOT EXISTS idx_users_name ON public.users (name);

-- 4) (Опционально) Вспомогательная функция для хеширования пароля (bcrypt-like using crypt)
-- Использует pgcrypto crypt() с солью gen_salt('bf') (Blowfish)
CREATE OR REPLACE FUNCTION public.hash_password(plain text) RETURNS text AS $$
BEGIN
RETURN crypt(plain, gen_salt('bf'));
END;
$$ LANGUAGE plpgsql STABLE;

-- 5) (Опционально) Функция для проверки пароля
CREATE OR REPLACE FUNCTION public.check_password(plain text, hashed text) RETURNS boolean AS $$
BEGIN
RETURN crypt(plain, hashed) = hashed;
END;
$$ LANGUAGE plpgsql STABLE;