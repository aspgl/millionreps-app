-- Simple Documents Table for MillionReps
-- Basic structure that works with our fallback queries

CREATE TABLE IF NOT EXISTS public.documents (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    content_html TEXT NOT NULL DEFAULT '',
    description TEXT,
    tags TEXT[] DEFAULT '{}',
    category VARCHAR(50) DEFAULT 'general',
    word_count INTEGER DEFAULT 0,
    reading_time_minutes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT documents_pkey PRIMARY KEY (id),
    CONSTRAINT documents_title_length CHECK (char_length(title) >= 1)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON public.documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON public.documents(created_at);
CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON public.documents(updated_at);

-- Enable Row Level Security
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- RLS Policy - Users can only access their own documents
DROP POLICY IF EXISTS "Users can manage their own documents" ON public.documents;
CREATE POLICY "Users can manage their own documents" ON public.documents
    FOR ALL USING (auth.uid() = user_id);

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to calculate word count and reading time
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

-- Insert a sample document to test
INSERT INTO public.documents (
    user_id, 
    title, 
    content, 
    content_html, 
    description, 
    category,
    tags
) VALUES (
    '00000000-0000-0000-0000-000000000000', -- Will be replaced with actual user_id
    'Welcome to MillionReps Documents! 🚀',
    '# Welcome to MillionReps Documents!\n\nThis is your **powerful** document editor.\n\n## Features:\n\n* Markdown support\n* Live preview\n* Auto-save\n* Slash commands\n\nType `/` to see available commands!\n\n> **Pro Tip:** Use Ctrl+B for bold and Ctrl+I for italic.',
    '<h1 class="text-3xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent mb-4 mt-6">Welcome to MillionReps Documents!</h1><p class="mb-4">This is your <strong class="font-bold">powerful</strong> document editor.</p><h2 class="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-3 mt-5">Features:</h2><li class="ml-4 mb-1">• Markdown support</li><li class="ml-4 mb-1">• Live preview</li><li class="ml-4 mb-1">• Auto-save</li><li class="ml-4 mb-1">• Slash commands</li><p class="mb-4">Type <code class="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-sm font-mono">/</code> to see available commands!</p><blockquote class="border-l-4 border-blue-500 pl-4 py-2 my-3 bg-blue-50 dark:bg-blue-900/20 italic text-gray-700 dark:text-gray-300"><strong class="font-bold">Pro Tip:</strong> Use Ctrl+B for bold and Ctrl+I for italic.</blockquote>',
    'Your first document with examples of all editor features',
    'general',
    ARRAY['welcome', 'tutorial', 'examples']
) ON CONFLICT DO NOTHING;
