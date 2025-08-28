-- Documents System Schema for MillionReps
-- Comprehensive document management with rich text editor support

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Main documents table
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID NOT NULL DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    content_html TEXT NOT NULL DEFAULT '',
    description TEXT,
    tags TEXT[] DEFAULT '{}',
    category VARCHAR(50) DEFAULT 'general',
    status VARCHAR(20) DEFAULT 'draft',
    is_public BOOLEAN DEFAULT FALSE,
    is_template BOOLEAN DEFAULT FALSE,
    template_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
    version INTEGER DEFAULT 1,
    word_count INTEGER DEFAULT 0,
    reading_time_minutes INTEGER DEFAULT 0,
    last_edited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    collaborators UUID[] DEFAULT '{}',
    parent_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
    
    CONSTRAINT documents_pkey PRIMARY KEY (id),
    CONSTRAINT documents_title_length CHECK (char_length(title) >= 1),
    CONSTRAINT documents_status_valid CHECK (status IN ('draft', 'published', 'archived', 'deleted')),
    CONSTRAINT documents_category_valid CHECK (category IN ('general', 'work', 'personal', 'study', 'project', 'meeting', 'template'))
);

-- Document versions table for version control
CREATE TABLE IF NOT EXISTS public.document_versions (
    id UUID NOT NULL DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    content TEXT NOT NULL,
    content_html TEXT NOT NULL,
    change_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT document_versions_pkey PRIMARY KEY (id),
    CONSTRAINT document_versions_unique_version UNIQUE (document_id, version_number)
);

-- Document comments table
CREATE TABLE IF NOT EXISTS public.document_comments (
    id UUID NOT NULL DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES public.document_comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    selection_text TEXT,
    selection_range JSONB,
    is_resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT document_comments_pkey PRIMARY KEY (id)
);

-- Document shares table for sharing permissions
CREATE TABLE IF NOT EXISTS public.document_shares (
    id UUID NOT NULL DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    shared_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    shared_with UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    permission VARCHAR(20) DEFAULT 'view',
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT document_shares_pkey PRIMARY KEY (id),
    CONSTRAINT document_shares_permission_valid CHECK (permission IN ('view', 'comment', 'edit', 'admin')),
    CONSTRAINT document_shares_unique UNIQUE (document_id, shared_with)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON public.documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON public.documents(created_at);
CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON public.documents(updated_at);
CREATE INDEX IF NOT EXISTS idx_documents_tags ON public.documents USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_documents_collaborators ON public.documents USING GIN(collaborators);
CREATE INDEX IF NOT EXISTS idx_documents_metadata ON public.documents USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_documents_title_search ON public.documents USING GIN(to_tsvector('german', title));
CREATE INDEX IF NOT EXISTS idx_documents_content_search ON public.documents USING GIN(to_tsvector('german', content));

CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON public.document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_version_number ON public.document_versions(version_number);
CREATE INDEX IF NOT EXISTS idx_document_comments_document_id ON public.document_comments(document_id);
CREATE INDEX IF NOT EXISTS idx_document_shares_document_id ON public.document_shares(document_id);
CREATE INDEX IF NOT EXISTS idx_document_shares_shared_with ON public.document_shares(shared_with);

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.last_edited_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to update word count and reading time
CREATE OR REPLACE FUNCTION update_document_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate word count (rough estimation)
    NEW.word_count = array_length(regexp_split_to_array(NEW.content, '\s+'), 1);
    
    -- Calculate reading time (average 200 words per minute)
    NEW.reading_time_minutes = GREATEST(1, (NEW.word_count / 200)::INTEGER);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS update_documents_updated_at_trigger ON public.documents;
CREATE TRIGGER update_documents_updated_at_trigger
    BEFORE UPDATE ON public.documents
    FOR EACH ROW
    EXECUTE FUNCTION update_documents_updated_at();

DROP TRIGGER IF EXISTS update_document_stats_trigger ON public.documents;
CREATE TRIGGER update_document_stats_trigger
    BEFORE INSERT OR UPDATE ON public.documents
    FOR EACH ROW
    EXECUTE FUNCTION update_document_stats();

-- Enable Row Level Security
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies for documents
DROP POLICY IF EXISTS "Users can view their own documents" ON public.documents;
CREATE POLICY "Users can view their own documents" ON public.documents
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view shared documents" ON public.documents;
CREATE POLICY "Users can view shared documents" ON public.documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.document_shares 
            WHERE document_id = documents.id 
            AND shared_with = auth.uid()
            AND (expires_at IS NULL OR expires_at > NOW())
        )
    );

DROP POLICY IF EXISTS "Users can view public documents" ON public.documents;
CREATE POLICY "Users can view public documents" ON public.documents
    FOR SELECT USING (is_public = TRUE);

DROP POLICY IF EXISTS "Users can insert their own documents" ON public.documents;
CREATE POLICY "Users can insert their own documents" ON public.documents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own documents" ON public.documents;
CREATE POLICY "Users can update their own documents" ON public.documents
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own documents" ON public.documents;
CREATE POLICY "Users can delete their own documents" ON public.documents
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for document_versions
DROP POLICY IF EXISTS "Users can view document versions" ON public.document_versions;
CREATE POLICY "Users can view document versions" ON public.document_versions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.documents 
            WHERE documents.id = document_versions.document_id 
            AND (documents.user_id = auth.uid() OR documents.is_public = TRUE)
        )
    );

DROP POLICY IF EXISTS "Users can insert document versions" ON public.document_versions;
CREATE POLICY "Users can insert document versions" ON public.document_versions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for document_comments
DROP POLICY IF EXISTS "Users can view document comments" ON public.document_comments;
CREATE POLICY "Users can view document comments" ON public.document_comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.documents 
            WHERE documents.id = document_comments.document_id 
            AND (documents.user_id = auth.uid() OR documents.is_public = TRUE)
        )
    );

DROP POLICY IF EXISTS "Users can insert document comments" ON public.document_comments;
CREATE POLICY "Users can insert document comments" ON public.document_comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own comments" ON public.document_comments;
CREATE POLICY "Users can update their own comments" ON public.document_comments
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for document_shares
DROP POLICY IF EXISTS "Users can view document shares" ON public.document_shares;
CREATE POLICY "Users can view document shares" ON public.document_shares
    FOR SELECT USING (
        shared_by = auth.uid() OR shared_with = auth.uid()
    );

DROP POLICY IF EXISTS "Users can insert document shares" ON public.document_shares;
CREATE POLICY "Users can insert document shares" ON public.document_shares
    FOR INSERT WITH CHECK (shared_by = auth.uid());

-- RPC Functions for document operations

-- Get user documents with filters
DROP FUNCTION IF EXISTS get_user_documents(uuid, text, text, text[], text, text, integer, integer);
CREATE OR REPLACE FUNCTION get_user_documents(
    p_user_id UUID,
    p_search TEXT DEFAULT NULL,
    p_category TEXT DEFAULT NULL,
    p_tags TEXT[] DEFAULT NULL,
    p_status TEXT DEFAULT NULL,
    p_sort_by TEXT DEFAULT 'updated_at',
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    category TEXT,
    status TEXT,
    tags TEXT[],
    word_count INTEGER,
    reading_time_minutes INTEGER,
    last_edited_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    is_public BOOLEAN,
    is_template BOOLEAN,
    version INTEGER,
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.title,
        d.description,
        d.category,
        d.status,
        d.tags,
        d.word_count,
        d.reading_time_minutes,
        d.last_edited_at,
        d.created_at,
        d.updated_at,
        d.is_public,
        d.is_template,
        d.version,
        d.metadata
    FROM public.documents d
    WHERE d.user_id = p_user_id
        AND (p_search IS NULL OR 
             d.title ILIKE '%' || p_search || '%' OR 
             d.content ILIKE '%' || p_search || '%')
        AND (p_category IS NULL OR d.category = p_category)
        AND (p_tags IS NULL OR d.tags && p_tags)
        AND (p_status IS NULL OR d.status = p_status)
    ORDER BY 
        CASE p_sort_by
            WHEN 'title' THEN d.title
            WHEN 'created_at' THEN d.created_at::TEXT
            WHEN 'updated_at' THEN d.updated_at::TEXT
            WHEN 'word_count' THEN d.word_count::TEXT
            ELSE d.updated_at::TEXT
        END DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get shared documents
DROP FUNCTION IF EXISTS get_shared_documents(uuid);
CREATE OR REPLACE FUNCTION get_shared_documents(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    category TEXT,
    status TEXT,
    tags TEXT[],
    word_count INTEGER,
    reading_time_minutes INTEGER,
    last_edited_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    permission TEXT,
    shared_by UUID,
    shared_by_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.title,
        d.description,
        d.category,
        d.status,
        d.tags,
        d.word_count,
        d.reading_time_minutes,
        d.last_edited_at,
        d.created_at,
        d.updated_at,
        ds.permission,
        ds.shared_by,
        p.firstname || ' ' || p.lastname as shared_by_name
    FROM public.documents d
    JOIN public.document_shares ds ON d.id = ds.document_id
    LEFT JOIN public.profiles p ON ds.shared_by = p.id
    WHERE ds.shared_with = p_user_id
        AND (ds.expires_at IS NULL OR ds.expires_at > NOW())
    ORDER BY ds.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new document
DROP FUNCTION IF EXISTS create_document(uuid, text, text, text, text[], text, text, boolean, jsonb);
CREATE OR REPLACE FUNCTION create_document(
    p_user_id UUID,
    p_title TEXT,
    p_content TEXT DEFAULT '',
    p_content_html TEXT DEFAULT '',
    p_description TEXT DEFAULT NULL,
    p_tags TEXT[] DEFAULT '{}',
    p_category TEXT DEFAULT 'general',
    p_status TEXT DEFAULT 'draft',
    p_is_public BOOLEAN DEFAULT FALSE,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    v_document_id UUID;
BEGIN
    INSERT INTO public.documents (
        user_id, title, content, content_html, description, 
        tags, category, status, is_public, metadata
    ) VALUES (
        p_user_id, p_title, p_content, p_content_html, p_description,
        p_tags, p_category, p_status, p_is_public, p_metadata
    ) RETURNING id INTO v_document_id;
    
    -- Create initial version
    INSERT INTO public.document_versions (
        document_id, user_id, version_number, content, content_html, change_summary
    ) VALUES (
        v_document_id, p_user_id, 1, p_content, p_content_html, 'Initial version'
    );
    
    RETURN v_document_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update document
DROP FUNCTION IF EXISTS update_document(uuid, uuid, text, text, text, text, text[], text, text, boolean, jsonb);
CREATE OR REPLACE FUNCTION update_document(
    p_document_id UUID,
    p_user_id UUID,
    p_title TEXT DEFAULT NULL,
    p_content TEXT DEFAULT NULL,
    p_content_html TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_tags TEXT[] DEFAULT NULL,
    p_category TEXT DEFAULT NULL,
    p_status TEXT DEFAULT NULL,
    p_is_public BOOLEAN DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_version INTEGER;
    v_old_content TEXT;
    v_old_html TEXT;
BEGIN
    -- Get current version and content
    SELECT version, content, content_html INTO v_current_version, v_old_content, v_old_html
    FROM public.documents WHERE id = p_document_id AND user_id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Update document
    UPDATE public.documents SET
        title = COALESCE(p_title, title),
        content = COALESCE(p_content, content),
        content_html = COALESCE(p_content_html, content_html),
        description = COALESCE(p_description, description),
        tags = COALESCE(p_tags, tags),
        category = COALESCE(p_category, category),
        status = COALESCE(p_status, status),
        is_public = COALESCE(p_is_public, is_public),
        metadata = COALESCE(p_metadata, metadata),
        version = version + 1
    WHERE id = p_document_id AND user_id = p_user_id;
    
    -- Create new version if content changed
    IF p_content IS NOT NULL AND p_content != v_old_content THEN
        INSERT INTO public.document_versions (
            document_id, user_id, version_number, content, content_html, change_summary
        ) VALUES (
            p_document_id, p_user_id, v_current_version + 1, p_content, p_content_html, 'Content updated'
        );
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get document with full content
DROP FUNCTION IF EXISTS get_document_full(uuid, uuid);
CREATE OR REPLACE FUNCTION get_document_full(p_document_id UUID, p_user_id UUID)
RETURNS TABLE (
    id UUID,
    title TEXT,
    content TEXT,
    content_html TEXT,
    description TEXT,
    category TEXT,
    status TEXT,
    tags TEXT[],
    word_count INTEGER,
    reading_time_minutes INTEGER,
    last_edited_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    is_public BOOLEAN,
    is_template BOOLEAN,
    version INTEGER,
    metadata JSONB,
    collaborators UUID[],
    parent_document_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.title,
        d.content,
        d.content_html,
        d.description,
        d.category,
        d.status,
        d.tags,
        d.word_count,
        d.reading_time_minutes,
        d.last_edited_at,
        d.created_at,
        d.updated_at,
        d.is_public,
        d.is_template,
        d.version,
        d.metadata,
        d.collaborators,
        d.parent_document_id
    FROM public.documents d
    WHERE d.id = p_document_id 
        AND (d.user_id = p_user_id OR d.is_public = TRUE OR 
             EXISTS (
                 SELECT 1 FROM public.document_shares 
                 WHERE document_id = d.id 
                 AND shared_with = p_user_id
                 AND (expires_at IS NULL OR expires_at > NOW())
             ));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Search documents
DROP FUNCTION IF EXISTS search_documents(uuid, text, integer, integer);
CREATE OR REPLACE FUNCTION search_documents(
    p_user_id UUID,
    p_query TEXT,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    category TEXT,
    status TEXT,
    tags TEXT[],
    word_count INTEGER,
    reading_time_minutes INTEGER,
    last_edited_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    is_public BOOLEAN,
    is_template BOOLEAN,
    version INTEGER,
    metadata JSONB,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.title,
        d.description,
        d.category,
        d.status,
        d.tags,
        d.word_count,
        d.reading_time_minutes,
        d.last_edited_at,
        d.created_at,
        d.updated_at,
        d.is_public,
        d.is_template,
        d.version,
        d.metadata,
        ts_rank(
            to_tsvector('german', d.title || ' ' || d.content),
            plainto_tsquery('german', p_query)
        ) as rank
    FROM public.documents d
    WHERE d.user_id = p_user_id
        AND to_tsvector('german', d.title || ' ' || d.content) @@ plainto_tsquery('german', p_query)
    ORDER BY rank DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get document statistics
DROP FUNCTION IF EXISTS get_document_stats(uuid);
CREATE OR REPLACE FUNCTION get_document_stats(p_user_id UUID)
RETURNS TABLE (
    total_documents INTEGER,
    total_words INTEGER,
    total_reading_time INTEGER,
    documents_this_week INTEGER,
    documents_this_month INTEGER,
    most_used_category TEXT,
    most_used_tags TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_documents,
        COALESCE(SUM(word_count), 0)::INTEGER as total_words,
        COALESCE(SUM(reading_time_minutes), 0)::INTEGER as total_reading_time,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::INTEGER as documents_this_week,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::INTEGER as documents_this_month,
        (SELECT category FROM public.documents WHERE user_id = p_user_id GROUP BY category ORDER BY COUNT(*) DESC LIMIT 1) as most_used_category,
        (SELECT array_agg(tag) FROM (
            SELECT unnest(tags) as tag, COUNT(*) as count
            FROM public.documents 
            WHERE user_id = p_user_id 
            GROUP BY tag 
            ORDER BY count DESC 
            LIMIT 5
        ) t) as most_used_tags
    FROM public.documents 
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert sample data for testing (only if profiles table has data)
-- Uncomment and replace with actual user ID from your profiles table
/*
INSERT INTO public.documents (user_id, title, content, content_html, description, category, status, tags, is_public) VALUES
(
    'YOUR-ACTUAL-USER-ID-HERE', -- Replace with actual user ID from profiles table
    'Willkommen bei MillionReps Docs',
    'Dies ist dein erstes Dokument. Hier kannst du deine Gedanken, Notizen und Ideen festhalten.',
    '<h1>Willkommen bei MillionReps Docs</h1><p>Dies ist dein erstes Dokument. Hier kannst du deine Gedanken, Notizen und Ideen festhalten.</p>',
    'Ein Willkommensdokument für neue Benutzer',
    'general',
    'published',
    ARRAY['welcome', 'getting-started'],
    TRUE
),
(
    'YOUR-ACTUAL-USER-ID-HERE', -- Replace with actual user ID from profiles table
    'Meine Ziele für 2024',
    'Hier liste ich meine wichtigsten Ziele für das Jahr 2024 auf:\n\n1. Mehr Sport treiben\n2. Neue Programmiersprache lernen\n3. Reisen planen',
    '<h1>Meine Ziele für 2024</h1><p>Hier liste ich meine wichtigsten Ziele für das Jahr 2024 auf:</p><ol><li>Mehr Sport treiben</li><li>Neue Programmiersprache lernen</li><li>Reisen planen</li></ol>',
    'Persönliche Ziele und Vorsätze',
    'personal',
    'draft',
    ARRAY['goals', '2024', 'personal'],
    FALSE
);
*/

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.documents TO authenticated;
GRANT ALL ON public.document_versions TO authenticated;
GRANT ALL ON public.document_comments TO authenticated;
GRANT ALL ON public.document_shares TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
