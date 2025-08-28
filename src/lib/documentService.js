import { supabase } from './supabase.js';

class DocumentService {
  // Get user documents with filters
  static async getUserDocuments(userId, filters = {}) {
    try {
      const {
        search = null,
        category = null,
        tags = null,
        status = null,
        sortBy = 'updated_at',
        limit = 50,
        offset = 0
      } = filters;

      // Try RPC function first, fallback to direct query if not available
      try {
        const { data, error } = await supabase.rpc('get_user_documents', {
          p_user_id: userId,
          p_search: search,
          p_category: category,
          p_tags: tags,
          p_status: status,
          p_sort_by: sortBy,
          p_limit: limit,
          p_offset: offset
        });

        if (error && error.code !== '42883') throw error; // 42883 = function does not exist
        if (!error) return data || [];
      } catch (rpcError) {
        console.warn('RPC function not available, using fallback:', rpcError.message);
      }

      // Fallback: Direct table query
      let query = supabase
        .from('documents')
        .select(`
          id, title, description, category, status, tags,
          word_count, reading_time_minutes, last_edited_at,
          created_at, updated_at, is_public, is_template,
          version, metadata
        `)
        .eq('user_id', userId);

      if (search) {
        query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
      }
      if (category) query = query.eq('category', category);
      if (status) query = query.eq('status', status);

      query = query.order(sortBy, { ascending: false }).range(offset, offset + limit - 1);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user documents:', error);
      throw error;
    }
  }

  // Get shared documents
  static async getSharedDocuments(userId) {
    try {
      // Try RPC function first, fallback to empty array if not available
      try {
        const { data, error } = await supabase.rpc('get_shared_documents', {
          p_user_id: userId
        });

        if (error && error.code !== '42883') throw error;
        if (!error) return data || [];
      } catch (rpcError) {
        console.warn('RPC function get_shared_documents not available:', rpcError.message);
      }

      // Fallback: Return empty array for now (shared documents require complex joins)
      return [];
    } catch (error) {
      console.error('Error fetching shared documents:', error);
      throw error;
    }
  }

  // Create new document
  static async createDocument(userId, documentData) {
    try {
      const {
        title,
        content = '',
        contentHtml = '',
        description = null,
        tags = [],
        category = 'general',
        status = 'draft',
        isPublic = false,
        metadata = {}
      } = documentData;

      const { data, error } = await supabase.rpc('create_document', {
        p_user_id: userId,
        p_title: title,
        p_content: content,
        p_content_html: contentHtml,
        p_description: description,
        p_tags: tags,
        p_category: category,
        p_status: status,
        p_is_public: isPublic,
        p_metadata: metadata
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating document:', error);
      throw error;
    }
  }

  // Update document
  static async updateDocument(documentId, userId, updateData) {
    try {
      const {
        title,
        content,
        contentHtml,
        description,
        tags,
        category,
        status,
        isPublic,
        metadata
      } = updateData;

      const { data, error } = await supabase.rpc('update_document', {
        p_document_id: documentId,
        p_user_id: userId,
        p_title: title,
        p_content: content,
        p_content_html: contentHtml,
        p_description: description,
        p_tags: tags,
        p_category: category,
        p_status: status,
        p_is_public: isPublic,
        p_metadata: metadata
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating document:', error);
      throw error;
    }
  }

  // Get document with full content
  static async getDocumentFull(documentId, userId) {
    try {
      // Try RPC function first, fallback to direct query
      try {
        const { data, error } = await supabase.rpc('get_document_full', {
          p_document_id: documentId,
          p_user_id: userId
        });

        if (error && error.code !== '42883') throw error;
        if (!error) return data?.[0] || null;
      } catch (rpcError) {
        console.warn('RPC function get_document_full not available:', rpcError.message);
      }

      // Fallback: Direct table query
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data || null;
    } catch (error) {
      console.error('Error fetching document:', error);
      throw error;
    }
  }

  // Delete document
  static async deleteDocument(documentId, userId) {
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId)
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }

  // Search documents
  static async searchDocuments(userId, query, limit = 20, offset = 0) {
    try {
      const { data, error } = await supabase.rpc('search_documents', {
        p_user_id: userId,
        p_query: query,
        p_limit: limit,
        p_offset: offset
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching documents:', error);
      throw error;
    }
  }

  // Get document statistics
  static async getDocumentStats(userId) {
    try {
      // Try RPC function first, fallback to basic stats
      try {
        const { data, error } = await supabase.rpc('get_document_stats', {
          p_user_id: userId
        });

        if (error && error.code !== '42883') throw error;
        if (!error) return data?.[0] || { total_documents: 0, total_words: 0, categories: [] };
      } catch (rpcError) {
        console.warn('RPC function get_document_stats not available:', rpcError.message);
      }

      // Fallback: Basic stats from direct query
      const { data, error } = await supabase
        .from('documents')
        .select('id, word_count, category')
        .eq('user_id', userId);

      if (error) throw error;
      
      // Calculate basic stats from documents
      const docs = data || [];
      const totalDocuments = docs.length;
      const totalWords = docs.reduce((sum, doc) => sum + (doc.word_count || 0), 0);
      
      const categoryCount = {};
      docs.forEach(doc => {
        if (doc.category) {
          categoryCount[doc.category] = (categoryCount[doc.category] || 0) + 1;
        }
      });
      
      const mostUsedCategory = Object.keys(categoryCount).length > 0 
        ? Object.keys(categoryCount).reduce((a, b) => categoryCount[a] > categoryCount[b] ? a : b)
        : null;

      return {
        total_documents: totalDocuments,
        total_words: totalWords,
        total_reading_time: Math.ceil(totalWords / 200),
        documents_this_week: totalDocuments, // Simplified for fallback
        documents_this_month: totalDocuments,
        most_used_category: mostUsedCategory,
        most_used_tags: []
      };
    } catch (error) {
      console.error('Error fetching document stats:', error);
      throw error;
    }
  }

  // Get document versions
  static async getDocumentVersions(documentId) {
    try {
      const { data, error } = await supabase
        .from('document_versions')
        .select('*')
        .eq('document_id', documentId)
        .order('version_number', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching document versions:', error);
      throw error;
    }
  }

  // Get document comments
  static async getDocumentComments(documentId) {
    try {
      const { data, error } = await supabase
        .from('document_comments')
        .select(`
          *,
          profiles:user_id (
            id,
            firstname,
            lastname,
            avatar_url
          )
        `)
        .eq('document_id', documentId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching document comments:', error);
      throw error;
    }
  }

  // Add comment to document
  static async addComment(documentId, userId, commentData) {
    try {
      const {
        content,
        selectionText = null,
        selectionRange = null,
        parentCommentId = null
      } = commentData;

      const { data, error } = await supabase
        .from('document_comments')
        .insert({
          document_id: documentId,
          user_id: userId,
          content,
          selection_text: selectionText,
          selection_range: selectionRange,
          parent_comment_id: parentCommentId
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  }

  // Share document
  static async shareDocument(documentId, sharedBy, sharedWith, permission = 'view', expiresAt = null) {
    try {
      const { data, error } = await supabase
        .from('document_shares')
        .insert({
          document_id: documentId,
          shared_by: sharedBy,
          shared_with: sharedWith,
          permission,
          expires_at: expiresAt
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error sharing document:', error);
      throw error;
    }
  }

  // Get document shares
  static async getDocumentShares(documentId) {
    try {
      const { data, error } = await supabase
        .from('document_shares')
        .select(`
          *,
          shared_with_profile:shared_with (
            id,
            firstname,
            lastname,
            avatar_url
          )
        `)
        .eq('document_id', documentId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching document shares:', error);
      throw error;
    }
  }

  // Remove document share
  static async removeDocumentShare(shareId) {
    try {
      const { error } = await supabase
        .from('document_shares')
        .delete()
        .eq('id', shareId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error removing document share:', error);
      throw error;
    }
  }

  // Auto-save document (for real-time editing)
  static async autoSaveDocument(documentId, userId, content, contentHtml) {
    try {
      const { data, error } = await supabase.rpc('update_document', {
        p_document_id: documentId,
        p_user_id: userId,
        p_content: content,
        p_content_html: contentHtml
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error auto-saving document:', error);
      throw error;
    }
  }

  // Export document as different formats
  static async exportDocument(documentId, userId, format = 'html') {
    try {
      const document = await this.getDocumentFull(documentId, userId);
      if (!document) throw new Error('Document not found');

      switch (format) {
        case 'html':
          return document.content_html;
        case 'text':
          return document.content;
        case 'markdown':
          return this.htmlToMarkdown(document.content_html);
        case 'pdf':
          // This would require a PDF generation service
          throw new Error('PDF export not implemented yet');
        default:
          throw new Error(`Unsupported format: ${format}`);
      }
    } catch (error) {
      console.error('Error exporting document:', error);
      throw error;
    }
  }

  // Convert HTML to Markdown (basic implementation)
  static htmlToMarkdown(html) {
    // Basic HTML to Markdown conversion
    let markdown = html
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
      .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
      .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n')
      .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n')
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
      .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
      .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
      .replace(/<ul[^>]*>(.*?)<\/ul>/gis, (match, content) => {
        return content.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n') + '\n';
      })
      .replace(/<ol[^>]*>(.*?)<\/ol>/gis, (match, content) => {
        let counter = 1;
        return content.replace(/<li[^>]*>(.*?)<\/li>/gi, () => `${counter++}. $1\n`) + '\n';
      })
      .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
      .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    return markdown.trim();
  }

  // Get document templates
  static async getTemplates(userId) {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('is_template', true)
        .or(`user_id.eq.${userId},is_public.eq.true`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching templates:', error);
      throw error;
    }
  }

  // Create document from template
  static async createFromTemplate(userId, templateId, title) {
    try {
      const template = await this.getDocumentFull(templateId, userId);
      if (!template) throw new Error('Template not found');

      return await this.createDocument(userId, {
        title,
        content: template.content,
        contentHtml: template.content_html,
        description: `Created from template: ${template.title}`,
        tags: template.tags,
        category: template.category,
        status: 'draft',
        isPublic: false,
        metadata: { ...template.metadata, template_id: templateId }
      });
    } catch (error) {
      console.error('Error creating document from template:', error);
      throw error;
    }
  }

  // Duplicate document
  static async duplicateDocument(documentId, userId, newTitle) {
    try {
      const document = await this.getDocumentFull(documentId, userId);
      if (!document) throw new Error('Document not found');

      return await this.createDocument(userId, {
        title: newTitle || `${document.title} (Kopie)`,
        content: document.content,
        contentHtml: document.content_html,
        description: document.description,
        tags: document.tags,
        category: document.category,
        status: 'draft',
        isPublic: false,
        metadata: { ...document.metadata, duplicated_from: documentId }
      });
    } catch (error) {
      console.error('Error duplicating document:', error);
      throw error;
    }
  }

  // Get recent documents
  static async getRecentDocuments(userId, limit = 10) {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', userId)
        .order('last_edited_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching recent documents:', error);
      throw error;
    }
  }

  // Get documents by category
  static async getDocumentsByCategory(userId, category) {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', userId)
        .eq('category', category)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching documents by category:', error);
      throw error;
    }
  }

  // Get documents by tag
  static async getDocumentsByTag(userId, tag) {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', userId)
        .contains('tags', [tag])
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching documents by tag:', error);
      throw error;
    }
  }

  // Get all user tags
  static async getUserTags(userId) {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('tags')
        .eq('user_id', userId)
        .not('tags', 'eq', '{}');

      if (error) throw error;

      const allTags = data.flatMap(doc => doc.tags || []);
      const uniqueTags = [...new Set(allTags)];
      return uniqueTags.sort();
    } catch (error) {
      console.error('Error fetching user tags:', error);
      throw error;
    }
  }

  // Get document activity (versions, comments, shares)
  static async getDocumentActivity(documentId) {
    try {
      const [versions, comments, shares] = await Promise.all([
        this.getDocumentVersions(documentId),
        this.getDocumentComments(documentId),
        this.getDocumentShares(documentId)
      ]);

      const activity = [
        ...versions.map(v => ({ ...v, type: 'version' })),
        ...comments.map(c => ({ ...c, type: 'comment' })),
        ...shares.map(s => ({ ...s, type: 'share' }))
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      return activity;
    } catch (error) {
      console.error('Error fetching document activity:', error);
      throw error;
    }
  }
}

export default DocumentService;
