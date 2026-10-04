-- Clippeurs, vague 3 : tous ceux qui n'ont encore reçu aucun mail clippeurs.
-- Vague 1 (Resend)  = les 1 000 « jamais payé » les plus récents au 2026-10-02 16:09:59 UTC
--                     (le plus ancien inscrit le 2026-09-29 16:21:29 UTC).
-- Vague 2 (Sender)  = les 2 500 « jamais payé » suivants, inscrits avant cette date.
-- Vague 3           = les inscrits depuis l'export de la vague 1, les « jamais payé » au-delà
--                     des 2 500, et les résiliés. On exclut les abonnés en cours et les candidats.
with eligibles as (
  select u.id, u.created_at, lower(u.email) as email,
    p.subscription_status is null
      and (p.trial_status is null or p.trial_status = 'active') as jamais_paye,
    case when initcap(split_part(trim(coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', '')), ' ', 1)) ~ '^[[:alpha:]]{3,20}$'
         then initcap(split_part(trim(coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', '')), ' ', 1)) else '' end as first_name
  from public.profiles p join auth.users u on u.id = p.id
  where not p.is_admin and not p.is_clipper
    and coalesce(p.subscription_status, '') not in ('active', 'trialing', 'past_due')
    and lower(u.email) ~ '^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$'
    and split_part(lower(u.email), '@', 2) not in ('yopmail.com','yopmail.fr','sweepser.com','aminavin.com','fleo.sl','gmal.com','gmial.com','gmail.fr','icooud.com','iclod.com','hotmial.com','pronton.me','mailinator.com','tempmail.com','guerrillamail.com')
),
vague_1 as (
  select id from eligibles
  where jamais_paye
    and created_at >= '2026-09-29 16:21:29+00'
    and created_at <= '2026-10-02 16:09:59+00'
),
vague_2 as (
  select id from eligibles
  where jamais_paye and created_at < '2026-09-29 16:21:29+00'
  order by created_at desc
  limit 2500
),
candidats as (
  select user_id as id, lower(email) as email from public.clipper_applications
)
select e.email, e.first_name
from eligibles e
where e.id not in (select id from vague_1)
  and e.id not in (select id from vague_2)
  and e.id not in (select id from candidats where id is not null)
  and e.email not in (select email from candidats where email is not null)
order by e.created_at desc;
