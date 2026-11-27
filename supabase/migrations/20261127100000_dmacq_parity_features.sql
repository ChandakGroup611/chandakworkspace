-- ============================================================================
-- dMACQ DMS 7.0 Parity Features (Batches 2, 3, 4)
-- Favourites, Multi-Category Tagging, Document Linking, Auto-Index/Rename,
-- Private View, and Default Saved View.
-- ============================================================================

-- 1. Favourite Documents (per user)
CREATE TABLE IF NOT EXISTS public.dms_document_favourites (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.dms_documents(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, document_id)
);

ALTER TABLE public.dms_document_favourites ENABLE ROW LEVEL SECURITY;

-- 2. Multi-Category Tagging (document visible in additional folders without moving host folder)
CREATE TABLE IF NOT EXISTS public.dms_document_folder_tags (
  document_id uuid NOT NULL REFERENCES public.dms_documents(id) ON DELETE CASCADE,
  folder_id uuid NOT NULL REFERENCES public.dms_folders(id) ON DELETE CASCADE,
  tagged_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (document_id, folder_id)
);

CREATE INDEX IF NOT EXISTS idx_dms_doc_folder_tags_folder ON public.dms_document_folder_tags(folder_id);
ALTER TABLE public.dms_document_folder_tags ENABLE ROW LEVEL SECURITY;

-- 3. Unidirectional Document Linking (Main Document -> Linked Document)
CREATE TABLE IF NOT EXISTS public.dms_document_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_document_id uuid NOT NULL REFERENCES public.dms_documents(id) ON DELETE CASCADE,
  target_document_id uuid NOT NULL REFERENCES public.dms_documents(id) ON DELETE CASCADE,
  link_note text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_document_id, target_document_id),
  CHECK (source_document_id <> target_document_id)
);

CREATE INDEX IF NOT EXISTS idx_dms_doc_links_source ON public.dms_document_links(source_document_id);
ALTER TABLE public.dms_document_links ENABLE ROW LEVEL SECURITY;

-- 4. Folder Auto-Index & Auto-Rename Patterns
ALTER TABLE public.dms_folders
  ADD COLUMN IF NOT EXISTS auto_index_pattern jsonb,
  ADD COLUMN IF NOT EXISTS rename_pattern jsonb;

-- 5. Private View (uploader-only visibility) & Default Saved View
ALTER TABLE public.dms_documents
  ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false;

ALTER TABLE public.dms_saved_views
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;
