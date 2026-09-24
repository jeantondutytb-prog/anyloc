-- Retrait du rôle clipper pour brun.jeremy@icloud.com

update public.profiles
set
  is_clipper = false,
  updated_at = now()
where lower(email) = lower('brun.jeremy@icloud.com');
