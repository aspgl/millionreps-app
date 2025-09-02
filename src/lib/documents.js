import { supabase } from './supabase';

// Markdown to HTML conversion utility
const convertMarkdownToHtml = (markdown) => {
  // Simple markdown to HTML conversion
  // In production, you might want to use a library like marked or remark
  return markdown
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    .replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>')
    .replace(/`([^`]+)`/gim, '<code>$1</code>')
    .replace(/^- (.*$)/gim, '<li>$1</li>')
    .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
    .replace(/\n\n/gim, '</p><p>')
    .replace(/^(.+)$/gim, '<p>$1</p>');
};

// Convert block-based content to markdown
const blocksToMarkdown = (blocks) => {
  if (!blocks || !Array.isArray(blocks)) return '';
  
  return blocks.map(block => {
    switch (block.type) {
      case 'heading1':
        return `# ${block.content}\n\n`;
      case 'heading2':
        return `## ${block.content}\n\n`;
      case 'heading3':
        return `### ${block.content}\n\n`;
      case 'text':
        return `${block.content}\n\n`;
      case 'bullet-list':
        return `- ${block.content}\n`;
      case 'numbered-list':
        return `1. ${block.content}\n`;
      case 'quote':
        return `> ${block.content}\n\n`;
      case 'code':
        return `\`\`\`\n${block.content}\n\`\`\`\n\n`;
      case 'checklist':
        return `- [ ] ${block.content}\n`;
      case 'divider':
        return `---\n\n`;
      default:
        return `${block.content}\n\n`;
    }
  }).join('');
};

// Convert markdown to block-based content
const markdownToBlocks = (markdown) => {
  if (!markdown) return [];
  
  const lines = markdown.split('\n');
  const blocks = [];
  let currentList = null;
  
  lines.forEach(line => {
    const trimmedLine = line.trim();
    
    if (!trimmedLine) {
      if (currentList) {
        blocks.push(...currentList);
        currentList = null;
      }
      return;
    }
    
    if (trimmedLine.startsWith('# ')) {
      if (currentList) {
        blocks.push(...currentList);
        currentList = null;
      }
      blocks.push({
        type: 'heading1',
        content: trimmedLine.substring(2)
      });
    } else if (trimmedLine.startsWith('## ')) {
      if (currentList) {
        blocks.push(...currentList);
        currentList = null;
      }
      blocks.push({
        type: 'heading2',
        content: trimmedLine.substring(3)
      });
    } else if (trimmedLine.startsWith('### ')) {
      if (currentList) {
        blocks.push(...currentList);
        currentList = null;
      }
      blocks.push({
        type: 'heading3',
        content: trimmedLine.substring(4)
      });
    } else if (trimmedLine.startsWith('- ')) {
      if (!currentList) currentList = [];
      currentList.push({
        type: 'bullet-list',
        content: trimmedLine.substring(2)
      });
    } else if (trimmedLine.startsWith('1. ')) {
      if (!currentList) currentList = [];
      currentList.push({
        type: 'numbered-list',
        content: trimmedLine.substring(3)
      });
    } else if (trimmedLine.startsWith('> ')) {
      if (currentList) {
        blocks.push(...currentList);
        currentList = null;
      }
      blocks.push({
        type: 'quote',
        content: trimmedLine.substring(2)
      });
    } else if (trimmedLine.startsWith('```')) {
      if (currentList) {
        blocks.push(...currentList);
        currentList = null;
      }
      // Handle code blocks (simplified)
      blocks.push({
        type: 'code',
        content: 'Code block'
      });
    } else if (trimmedLine === '---') {
      if (currentList) {
        blocks.push(...currentList);
        currentList = null;
      }
      blocks.push({
        type: 'divider',
        content: ''
      });
    } else {
      if (currentList) {
        blocks.push(...currentList);
        currentList = null;
      }
      blocks.push({
        type: 'text',
        content: trimmedLine
      });
    }
  });
  
  if (currentList) {
    blocks.push(...currentList);
  }
  
  return blocks;
};

// Documents Service
export const documentsService = {
  // Get all documents for current user
  async getDocuments(filters = {}) {
    try {
      let query = supabase
        .from('documents')
        .select('*')
        .eq('user_id', (await supabase.auth.getUser()).user?.id)
        .order('updated_at', { ascending: false });

      // Apply filters
      if (filters.category && filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }
      
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error fetching documents:', error);
      throw error;
    }
  },

  // Get single document by ID
  async getDocument(id) {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching document:', error);
      throw error;
    }
  },

  // Create new document
  async createDocument(documentData) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('documents')
        .insert({
          ...documentData,
          user_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating document:', error);
      throw error;
    }
  },

  // Update document
  async updateDocument(id, updates) {
    try {
      const { data, error } = await supabase
        .from('documents')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating document:', error);
      throw error;
    }
  },

  // Delete document
  async deleteDocument(id) {
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  },

  // Toggle favorite
  async toggleFavorite(documentId) {
    try {
      // For now, just return false since document_favorites table might not exist
      return false;
    } catch (error) {
      console.error('Error toggling favorite:', error);
      throw error;
    }
  },

  // Get user's favorite documents
  async getFavorites() {
    try {
      const { user } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // For now, return empty array since document_favorites table might not exist
      return [];
    } catch (error) {
      console.error('Error fetching favorites:', error);
      throw error;
    }
  },

  // Get document templates
  async getTemplates() {
    try {
      const { data, error } = await supabase
        .from('document_templates')
        .select('*')
        .or('is_public.eq.true,created_by.eq.' + (await supabase.auth.getUser()).user?.id)
        .order('usage_count', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching templates:', error);
      throw error;
    }
  },

  // Get document categories
  async getCategories() {
    try {
      const { data, error } = await supabase
        .from('document_categories')
        .select('*')
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  },

  // Get document tags
  async getTags() {
    try {
      const { data, error } = await supabase
        .from('document_tags')
        .select('*')
        .order('usage_count', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching tags:', error);
      throw error;
    }
  },



  // Add comment to document
  async addComment(documentId, comment) {
    try {
      // For now, just return a mock comment since document_comments table might not exist
      return {
        id: Date.now(),
        document_id: documentId,
        content: comment.content,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  },

  // Get document statistics
  async getStats() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      // Get total count
      const { count: total, error: countError } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      if (countError) throw countError;
      
      // Get category breakdown
      const { data: categoryData, error: categoryError } = await supabase
        .from('documents')
        .select('category')
        .eq('user_id', user.id);
      
      if (categoryError) throw categoryError;
      
      const byCategory = {};
      categoryData?.forEach(doc => {
        byCategory[doc.category] = (byCategory[doc.category] || 0) + 1;
      });
      
      return {
        total: total || 0,
        byCategory,
        totalViews: 0, // Placeholder for future implementation
        totalFavorites: 0 // Placeholder for future implementation
      };
    } catch (error) {
      console.error('Error fetching stats:', error);
      throw error;
    }
  },

  // Toggle favorite status
  async toggleFavorite(documentId) {
    try {
      // This is a placeholder - implement actual favorite logic when needed
      console.log('Toggle favorite for document:', documentId);
      return true;
    } catch (error) {
      console.error('Error toggling favorite:', error);
      throw error;
    }
  },

  // Search documents
  async searchDocuments(query, filters = {}) {
    try {
      let searchQuery = supabase
        .from('documents')
        .select('*');

      if (query) {
        // Verwende einfache ILIKE-Suche statt Full-text Search
        searchQuery = searchQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
      }

      // Apply additional filters
      if (filters.category && filters.category !== 'all') {
        searchQuery = searchQuery.eq('category', filters.category);
      }

      const { data, error } = await searchQuery.order('last_edited_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching documents:', error);
      throw error;
    }
  }
};

// Real-time subscriptions
export const documentsRealtime = {
  // Subscribe to document changes
  subscribeToDocument(documentId, callback) {
    return supabase
      .channel(`document:${documentId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'documents',
        filter: `id=eq.${documentId}`
      }, callback)
      .subscribe();
  },

  // Subscribe to user's documents
  subscribeToUserDocuments(callback) {
    return supabase
      .channel('user_documents')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'documents'
      }, callback)
      .subscribe();
  },

  // Subscribe to document comments
  subscribeToComments(documentId, callback) {
    return supabase
      .channel(`document_comments:${documentId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'document_comments',
        filter: `document_id=eq.${documentId}`
      }, callback)
      .subscribe();
  }
};
