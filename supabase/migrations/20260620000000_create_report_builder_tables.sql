-- Create Report Master Table
CREATE TABLE IF NOT EXISTS public.report_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_code VARCHAR(255) UNIQUE NOT NULL,
    report_name VARCHAR(255) NOT NULL,
    module_name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create Report Field Master Table
CREATE TABLE IF NOT EXISTS public.report_field_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES public.report_master(id) ON DELETE CASCADE,
    field_key VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    data_type VARCHAR(50) DEFAULT 'text',
    is_default BOOLEAN DEFAULT false,
    default_width INTEGER DEFAULT 150,
    is_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(report_id, field_key)
);

-- Create User Report Layout Table
CREATE TABLE IF NOT EXISTS public.user_report_layout (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    report_id UUID REFERENCES public.report_master(id) ON DELETE CASCADE,
    field_id UUID REFERENCES public.report_field_master(id) ON DELETE CASCADE,
    display_order INTEGER NOT NULL,
    is_visible BOOLEAN DEFAULT true,
    column_width INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, report_id, field_id)
);

-- Add RLS Policies
ALTER TABLE public.report_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_field_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_report_layout ENABLE ROW LEVEL SECURITY;

-- Report Master is readable by authenticated users
CREATE POLICY "Report Master is readable by all authenticated users"
    ON public.report_master FOR SELECT
    TO authenticated
    USING (true);

-- Report Field Master is readable by authenticated users
CREATE POLICY "Report Field Master is readable by all authenticated users"
    ON public.report_field_master FOR SELECT
    TO authenticated
    USING (true);

-- Users can read their own report layouts
CREATE POLICY "Users can read their own report layouts"
    ON public.user_report_layout FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Users can insert their own report layouts
CREATE POLICY "Users can insert their own report layouts"
    ON public.user_report_layout FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own report layouts
CREATE POLICY "Users can update their own report layouts"
    ON public.user_report_layout FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own report layouts
CREATE POLICY "Users can delete their own report layouts"
    ON public.user_report_layout FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Allow super admins to manage master tables
CREATE POLICY "Super admins can manage report master"
    ON public.report_master FOR ALL
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() AND r.code IN ('SUPER_ADMIN', 'ROLE_SUPER_ADMIN')
    ));

CREATE POLICY "Super admins can manage report fields"
    ON public.report_field_master FOR ALL
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() AND r.code IN ('SUPER_ADMIN', 'ROLE_SUPER_ADMIN')
    ));

-- Insert default reports
INSERT INTO public.report_master (report_code, report_name, module_name)
VALUES 
('WORKSPACE_TASKS', 'All Workspace Tasks', 'Tasks'),
('REPORTS_ANALYTICS', 'Reports & Analytics', 'Reports')
ON CONFLICT (report_code) DO NOTHING;
