SELECT id, name
FROM public.users
WHERE name = 'user'
  AND password_hash = crypt('password', password_hash);