import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Filter, Grid, List, FileText, Calendar, Clock, 
  Eye, Edit3, Trash2, Share2, Download, MoreHorizontal, Star,
  Folder, Tag, Users, TrendingUp, BarChart3, BookOpen,
  FilePlus, Copy, Archive, Settings, RefreshCw, X, User, Briefcase
} from 'lucide-react';
import { useAuth } from './AuthContext';
import DocumentService from './lib/documentService';
import RichTextEditor from './components/RichTextEditor';

const Documents = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [sharedDocuments, setSharedDocuments] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // UI States
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [editingDocument, setEditingDocument] = useState(null);
  
  // Filters and Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedTags, setSelectedTags] = useState([]);
  const [sortBy, setSortBy] = useState('updated_at');
  
  // Document creation/editing
  const [newDocument, setNewDocument] = useState({
    title: '',
    description: '',
    category: 'general',
    tags: [],
    status: 'draft',
    isPublic: false
  });

  // Categories
  const categories = [
    { id: 'all', name: 'Alle', icon: FileText, color: 'text-gray-500' },
    { id: 'general', name: 'Allgemein', icon: FileText, color: 'text-blue-500' },
    { id: 'work', name: 'Arbeit', icon: Briefcase, color: 'text-green-500' },
    { id: 'personal', name: 'Persönlich', icon: User, color: 'text-purple-500' },
    { id: 'study', name: 'Studium', icon: BookOpen, color: 'text-orange-500' },
    { id: 'project', name: 'Projekte', icon: Folder, color: 'text-red-500' },
    { id: 'meeting', name: 'Meetings', icon: Users, color: 'text-indigo-500' },
    { id: 'template', name: 'Vorlagen', icon: FilePlus, color: 'text-pink-500' }
  ];

  // Status options
  const statusOptions = [
    { id: 'all', name: 'Alle', color: 'text-gray-500' },
    { id: 'draft', name: 'Entwurf', color: 'text-yellow-500' },
    { id: 'published', name: 'Veröffentlicht', color: 'text-green-500' },
    { id: 'archived', name: 'Archiviert', color: 'text-gray-500' }
  ];

  // Load documents
  const loadDocuments = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const filters = {
        search: searchTerm || null,
        category: selectedCategory === 'all' ? null : selectedCategory,
        status: selectedStatus === 'all' ? null : selectedStatus,
        tags: selectedTags.length > 0 ? selectedTags : null,
        sortBy
      };

      const [userDocs, sharedDocs, userStats] = await Promise.all([
        DocumentService.getUserDocuments(user.id, filters),
        DocumentService.getSharedDocuments(user.id),
        DocumentService.getDocumentStats(user.id)
      ]);

      setDocuments(userDocs);
      setSharedDocuments(sharedDocs);
      setStats(userStats);
    } catch (err) {
      setError(err.message);
      console.error('Error loading documents:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load data on mount and filter changes
  useEffect(() => {
    loadDocuments();
  }, [user, searchTerm, selectedCategory, selectedStatus, selectedTags, sortBy]);

  // Create new document
  const handleCreateDocument = async () => {
    if (!user || !newDocument.title.trim()) return;

    try {
      const documentId = await DocumentService.createDocument(user.id, {
        ...newDocument,
        content: '',
        contentHtml: ''
      });

      setShowCreateModal(false);
      setNewDocument({
        title: '',
        description: '',
        category: 'general',
        tags: [],
        status: 'draft',
        isPublic: false
      });

      // Open the new document for editing
      setEditingDocument(documentId);
      setShowDocumentModal(true);
      
      // Reload documents
      loadDocuments();
    } catch (err) {
      setError(err.message);
      console.error('Error creating document:', err);
    }
  };

  // Save document
  const handleSaveDocument = async (content, contentHtml) => {
    if (!editingDocument || !user) return;

    try {
      await DocumentService.updateDocument(editingDocument, user.id, {
        content,
        contentHtml
      });
      
      // Reload documents to update stats
      loadDocuments();
    } catch (err) {
      setError(err.message);
      console.error('Error saving document:', err);
    }
  };

  // Delete document
  const handleDeleteDocument = async (documentId) => {
    if (!user || !confirm('Dokument wirklich löschen?')) return;

    try {
      await DocumentService.deleteDocument(documentId, user.id);
      loadDocuments();
    } catch (err) {
      setError(err.message);
      console.error('Error deleting document:', err);
    }
  };

  // Export document
  const handleExportDocument = async (documentId, format = 'html') => {
    if (!user) return;

    try {
      const content = await DocumentService.exportDocument(documentId, user.id, format);
      
      // Create download link
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `document-${documentId}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
      console.error('Error exporting document:', err);
    }
  };

  // Get category icon
  const getCategoryIcon = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.icon : FileText;
  };

  // Get category color
  const getCategoryColor = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.color : 'text-gray-500';
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Gestern';
    if (diffDays < 7) return `vor ${diffDays} Tagen`;
    if (diffDays < 30) return `vor ${Math.floor(diffDays / 7)} Wochen`;
    
    return date.toLocaleDateString('de-DE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Bitte melde dich an
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Du musst angemeldet sein, um deine Dokumente zu verwalten.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Dokumente
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Verwalte deine Dokumente und Notizen
              </p>
            </div>
            
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="h-4 w-4" />
              Neues Dokument
            </button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Dokumente</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.total_documents || 0}
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-green-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Wörter</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.total_words || 0}
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-purple-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Lesezeit</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.total_reading_time || 0}h
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-orange-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Diese Woche</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.documents_this_week || 0}
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-red-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Diesen Monat</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.documents_this_month || 0}
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-indigo-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Tags</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.most_used_tags?.length || 0}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Dokumente durchsuchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2">
              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {statusOptions.map(status => (
                  <option key={status.id} value={status.id}>
                    {status.name}
                  </option>
                ))}
              </select>

              {/* Sort By */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="updated_at">Zuletzt bearbeitet</option>
                <option value="created_at">Erstellt am</option>
                <option value="title">Titel</option>
                <option value="word_count">Wörter</option>
              </select>

              {/* View Mode */}
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1 rounded transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Grid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1 rounded transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-2 text-gray-600 dark:text-gray-400">Lade Dokumente...</span>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-red-500 mb-4">Fehler beim Laden der Dokumente</div>
            <button
              onClick={loadDocuments}
              className="flex items-center gap-2 mx-auto px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Erneut versuchen
            </button>
          </div>
        ) : (
          <>
            {/* Documents Grid/List */}
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {documents.map(document => (
                  <motion.div
                    key={document.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 border border-gray-200 dark:border-gray-700 overflow-hidden group"
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {React.createElement(getCategoryIcon(document.category), { 
                            className: `h-5 w-5 ${getCategoryColor(document.category)}` 
                          })}
                          <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                            {document.status}
                          </span>
                        </div>
                        
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setSelectedDocument(document);
                              setEditingDocument(document.id);
                              setShowDocumentModal(true);
                            }}
                            className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                            title="Bearbeiten"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                        {document.title}
                      </h3>
                      
                      {document.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                          {document.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-3">
                        <span>{document.word_count} Wörter</span>
                        <span>{document.reading_time_minutes} Min.</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(document.updated_at)}
                        </span>
                        
                        <div className="flex items-center gap-1">
                          {document.tags?.slice(0, 2).map(tag => (
                            <span
                              key={tag}
                              className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full"
                            >
                              #{tag}
                            </span>
                          ))}
                          {document.tags?.length > 2 && (
                            <span className="text-xs text-gray-400">
                              +{document.tags.length - 2}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="border-t border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-900/50">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => {
                            setSelectedDocument(document);
                            setEditingDocument(document.id);
                            setShowDocumentModal(true);
                          }}
                          className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                        >
                          <Edit3 className="h-3 w-3" />
                          Bearbeiten
                        </button>
                        
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleExportDocument(document.id, 'html')}
                            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            title="Exportieren"
                          >
                            <Download className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteDocument(document.id)}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                            title="Löschen"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map(document => (
                  <motion.div
                    key={document.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 dark:border-gray-700 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex items-center gap-2">
                          {React.createElement(getCategoryIcon(document.category), { 
                            className: `h-5 w-5 ${getCategoryColor(document.category)}` 
                          })}
                          <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                            {document.status}
                          </span>
                        </div>

                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {document.title}
                          </h3>
                          {document.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {document.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                          <span>{document.word_count} Wörter</span>
                          <span>{document.reading_time_minutes} Min.</span>
                          <span>{formatDate(document.updated_at)}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          {document.tags?.slice(0, 3).map(tag => (
                            <span
                              key={tag}
                              className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedDocument(document);
                            setEditingDocument(document.id);
                            setShowDocumentModal(true);
                          }}
                          className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                        >
                          <Edit3 className="h-3 w-3" />
                          Bearbeiten
                        </button>
                        
                        <button
                          onClick={() => handleExportDocument(document.id, 'html')}
                          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                          title="Exportieren"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        
                        <button
                          onClick={() => handleDeleteDocument(document.id)}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                          title="Löschen"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {documents.length === 0 && !loading && (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Keine Dokumente gefunden
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Erstelle dein erstes Dokument oder passe deine Filter an.
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 mx-auto px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Neues Dokument erstellen
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Document Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  Neues Dokument erstellen
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Titel
                    </label>
                    <input
                      type="text"
                      value={newDocument.title}
                      onChange={(e) => setNewDocument(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Dokumenttitel eingeben..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Beschreibung
                    </label>
                    <textarea
                      value={newDocument.description}
                      onChange={(e) => setNewDocument(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Optionale Beschreibung..."
                      rows={3}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Kategorie
                      </label>
                      <select
                        value={newDocument.category}
                        onChange={(e) => setNewDocument(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {categories.filter(c => c.id !== 'all').map(category => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Status
                      </label>
                      <select
                        value={newDocument.status}
                        onChange={(e) => setNewDocument(prev => ({ ...prev, status: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {statusOptions.filter(s => s.id !== 'all').map(status => (
                          <option key={status.id} value={status.id}>
                            {status.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isPublic"
                      checked={newDocument.isPublic}
                      onChange={(e) => setNewDocument(prev => ({ ...prev, isPublic: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                    />
                    <label htmlFor="isPublic" className="text-sm text-gray-700 dark:text-gray-300">
                      Öffentlich verfügbar
                    </label>
                  </div>
                </div>
                
                <div className="flex items-center justify-end gap-3 mt-6">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={handleCreateDocument}
                    disabled={!newDocument.title.trim()}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  >
                    Erstellen
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Document Editor Modal */}
      <AnimatePresence>
        {showDocumentModal && editingDocument && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowDocumentModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {selectedDocument?.title || 'Dokument bearbeiten'}
                </h2>
                <button
                  onClick={() => setShowDocumentModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-hidden">
                <DocumentEditor
                  documentId={editingDocument}
                  userId={user.id}
                  onSave={handleSaveDocument}
                  onClose={() => setShowDocumentModal(false)}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Document Editor Component
const DocumentEditor = ({ documentId, userId, onSave, onClose }) => {
  const [document, setDocument] = useState(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDocument();
  }, [documentId]);

  const loadDocument = async () => {
    try {
      setLoading(true);
      const doc = await DocumentService.getDocumentFull(documentId, userId);
      setDocument(doc);
      setContent(doc.content_html || '');
    } catch (error) {
      console.error('Error loading document:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (content, contentHtml) => {
    try {
      await onSave(content, contentHtml);
    } catch (error) {
      console.error('Error saving document:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <RichTextEditor
        content={content}
        onChange={setContent}
        onSave={handleSave}
        autoSave={true}
        autoSaveInterval={3000}
        className="h-full"
      />
    </div>
  );
};

export default Documents;
