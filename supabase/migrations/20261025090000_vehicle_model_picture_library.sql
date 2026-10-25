-- Vehicle model picture library
-- One approved, standardised studio picture per make + model (optionally per variant).
-- Pictures are made automatically per model + colour (AI-generated via Cloudflare Workers AI, or a
-- studio render when IMAGIN_CUSTOMER_KEY is set); an admin may also set one for a whole model.
-- Every vehicle of that model in the fleet shows this picture in the inventory grid,
-- showroom and vehicle details. Pictures are stored in the private storage bucket
-- "vehicle-model-images" and served to signed-in users through /api/vehicle/model-image/file.

create table if not exists public.vehicle_model_images (
  id            uuid primary key default gen_random_uuid(),
  model_key     text not null unique,          -- "make|model" (one picture for the model) or "make|model#colour" (automatic pictures, per colour)
  make          text not null,
  model         text not null,
  variant       text,
  storage_path  text not null,                 -- path inside the vehicle-model-images bucket
  source        text not null default 'upload' check (source in ('upload', 'commons', 'render', 'ai')),
  source_url    text,                          -- original picture (Wikimedia Commons page or uploaded file name)
  credit        text,                          -- author / licence line shown on the picture
  flipped       boolean not null default false,
  width         integer,
  height        integer,
  created_by    uuid,
  updated_by    uuid,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists vehicle_model_images_make_idx on public.vehicle_model_images (lower(make));

-- Server-only table: read and written through the service role by the API routes.
alter table public.vehicle_model_images enable row level security;

-- Private bucket for the standardised pictures (WebP, transparent background, 1600 x 900).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vehicle-model-images', 'vehicle-model-images', false, 5242880, array['image/webp'])
on conflict (id) do nothing;
