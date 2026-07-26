alter table public.enquiries alter column email drop not null;
alter table public.enquiries drop constraint if exists enquiries_email_shape;
alter table public.enquiries add constraint enquiries_email_shape check (email is null or email = '' or public.is_valid_email(email));
