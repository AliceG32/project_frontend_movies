INSERT INTO public.users (name, password_hash)
VALUES ('user', crypt('user', gen_salt('bf')));
INSERT INTO public.users (name, password_hash)
VALUES ('user1', crypt('user1', gen_salt('bf')));