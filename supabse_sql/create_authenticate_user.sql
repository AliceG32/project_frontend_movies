-- Удалите старую функцию если существует
DROP FUNCTION IF EXISTS authenticate_user(text, text);

-- Создайте новую функцию для UUID
CREATE OR REPLACE FUNCTION authenticate_user(username_param text, password_param text)
RETURNS TABLE(id uuid, name text)
LANGUAGE sql
SECURITY DEFINER
AS $$
SELECT id, name
FROM users
WHERE name = username_param
  AND password_hash = crypt(password_param, password_hash)
    LIMIT 1;
$$;