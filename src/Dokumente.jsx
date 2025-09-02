import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Plus, 
  Search, 
  Edit3,
  Trash2,
  Share2,
  Download,
  Eye,
  Star,
  Grid3X3,
  List,
  X
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { documentsService, documentsRealtime } from './lib/documents';



// Sample documents data
const SAMPLE_DOCUMENTS = [
  {
    id: 1,
    title: "Projekt-Roadmap 2024",
    description: "Strategische Planung für das kommende Jahr",
    type: "document",
    category: "Projektmanagement",
    tags: ["roadmap", "strategie", "planung"],
    content: [
      { type: 'heading1', content: 'Projekt-Roadmap 2024' },
      { type: 'text', content: 'Dies ist unsere strategische Planung für das kommende Jahr.' },
      { type: 'heading2', content: 'Q1 Ziele' },
      { type: 'bullet-list', content: 'Feature A implementieren' },
      { type: 'bullet-list', content: 'Team erweitern' },
      { type: 'bullet-list', content: 'Kunden-Feedback sammeln' },
      { type: 'heading2', content: 'Q2 Ziele' },
      { type: 'numbered-list', content: 'Beta-Version veröffentlichen' },
      { type: 'numbered-list', content: 'Marketing-Kampagne starten' },
      { type: 'numbered-list', content: 'Partnerschaften aufbauen' }
    ],
    size: "2.4 KB",
    views: 1247,
    favorites: 156,
    created_at: "2024-01-15",
    updated_at: "2024-01-20",
    author: "Max Mustermann",
    is_public: false,
    collaborators: [],
    version: 1.2
  },
  {
    id: 2,
    title: "Technische Dokumentation",
    description: "API-Dokumentation und Architektur-Übersicht",
    type: "document",
    category: "Technik",
    tags: ["api", "dokumentation", "architektur"],
    content: [
      { type: 'heading1', content: 'Technische Dokumentation' },
      { type: 'text', content: 'Umfassende Dokumentation unserer API und Architektur.' },
      { type: 'heading2', content: 'API Endpoints' },
      { type: 'code', content: 'GET /api/users\nPOST /api/users\nPUT /api/users/:id' },
      { type: 'heading2', content: 'Architektur' },
      { type: 'text', content: 'Unsere Anwendung basiert auf einer modernen Microservices-Architektur.' },
      { type: 'quote', content: 'Simplicity is the ultimate sophistication.' }
    ],
    size: "5.8 KB",
    views: 892,
    favorites: 89,
    created_at: "2024-01-10",
    updated_at: "2024-01-18",
    author: "Dr. Sarah Chen",
    is_public: true,
    collaborators: ["user1", "user2"],
    version: 2.1
  },
  {
    id: 3,
    title: "Meeting-Notizen",
    description: "Notizen vom wöchentlichen Team-Meeting",
    type: "document",
    category: "Meetings",
    tags: ["meeting", "notizen", "team"],
    content: [
      { type: 'heading1', content: 'Wöchentliches Team-Meeting' },
      { type: 'text', content: 'Notizen vom Team-Meeting am 15. Januar 2024.' },
      { type: 'heading2', content: 'Besprochene Themen' },
      { type: 'bullet-list', content: 'Projekt-Status Updates' },
      { type: 'bullet-list', content: 'Neue Feature-Ideen' },
      { type: 'bullet-list', content: 'Technische Herausforderungen' },
      { type: 'heading2', content: 'Action Items' },
      { type: 'checklist', content: 'API-Dokumentation aktualisieren' },
      { type: 'checklist', content: 'Design-Review durchführen' },
      { type: 'checklist', content: 'Performance-Tests planen' }
    ],
    size: "1.2 KB",
    views: 567,
    favorites: 34,
    created_at: "2024-01-15",
    updated_at: "2024-01-15",
    author: "Lisa Weber",
    is_public: false,
    collaborators: ["user3"],
    version: 1.0
  }
];

export default function Dokumente() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState(SAMPLE_DOCUMENTS);
  const [filteredDocuments, setFilteredDocuments] = useState(SAMPLE_DOCUMENTS);
  const [view, setView] = useState('grid'); // grid, list
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTags, setSelectedTags] = useState([]);
  const [sortBy, setSortBy] = useState('updated'); // updated, created, title, views

  const [favorites, setFavorites] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    byCategory: {},
    totalViews: 0,
    totalFavorites: 0
  });

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [newDocument, setNewDocument] = useState({
    title: '',
    description: '',
    category: 'Allgemein',
    tags: [],
    content: []
  });

  const searchRef = useRef(null);

  // Load documents and stats
  useEffect(() => {
    loadDocuments();
    loadStats();
  }, [user]);

  // Filter documents based on search and filters
  useEffect(() => {
    let filtered = documents;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(doc => 
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(doc => doc.category === selectedCategory);
    }

    // Tags filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter(doc => 
        selectedTags.some(tag => doc.tags.includes(tag))
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'updated':
          return new Date(b.updated_at) - new Date(a.updated_at);
        case 'created':
          return new Date(b.created_at) - new Date(a.created_at);
        case 'title':
          return a.title.localeCompare(b.title);
        case 'views':
          return b.views - a.views;
        default:
          return 0;
      }
    });

    setFilteredDocuments(filtered);
  }, [documents, searchTerm, selectedCategory, selectedTags, sortBy]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const filters = {
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        search: searchTerm || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        isArchived: false
      };
      
      const data = await documentsService.getDocuments(filters);
      setDocuments(data);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await documentsService.getStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const toggleFavorite = async (documentId) => {
    try {
      const isFavorited = await documentsService.toggleFavorite(documentId);
      const newFavorites = new Set(favorites);
      if (isFavorited) {
        newFavorites.add(documentId);
      } else {
        newFavorites.delete(documentId);
      }
      setFavorites(newFavorites);
      
      // Reload documents to update favorite counts
      loadDocuments();
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setSelectedTags([]);
    setSortBy('updated');
  };

  const getCategories = () => {
    const categories = [...new Set(documents.map(doc => doc.category))];
    return categories.filter(cat => cat); // Filter out null/undefined categories
  };

  const getAllTags = () => {
    const allTags = documents.flatMap(doc => doc.tags);
    return [...new Set(allTags)];
  };

  const formatFileSize = (size) => {
    return size;
  };

  const openDocument = (document) => {
    // Öffne das Dokument in einem Modal statt Navigation
    setSelectedDocument(document);
    setShowDocumentModal(true);
  };

  const createNewDocument = () => {
    // Erstelle ein neues Dokument direkt in der Komponente
    setNewDocument({
      title: '',
      description: '',
      category: 'Allgemein',
      tags: [],
      content: []
    });
    setShowCreateModal(true);
  };

  const handleCreateDocument = async () => {
    try {
      setLoading(true);
      
      // Erstelle das Dokument über den Service
      const createdDoc = await documentsService.createDocument({
        title: newDocument.title || 'Neues Dokument',
        description: newDocument.description,
        category: newDocument.category,
        tags: newDocument.tags,
        content: newDocument.content
      });
      
      // Füge es zur Liste hinzu
      setDocuments(prev => [createdDoc, ...prev]);
      setShowCreateModal(false);
      
      // Reset form
      setNewDocument({
        title: '',
        description: '',
        category: 'Allgemein',
        tags: [],
        content: []
      });
      
      // Reload stats
      loadStats();
    } catch (error) {
      console.error('Error creating document:', error);
      alert('Fehler beim Erstellen des Dokuments: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDocument = async (documentId, updates) => {
    try {
      setLoading(true);
      
      // Update das Dokument über den Service
      const updatedDoc = await documentsService.updateDocument(documentId, updates);
      
      // Update die Liste
      setDocuments(prev => prev.map(doc => 
        doc.id === documentId ? updatedDoc : doc
      ));
      
      setShowDocumentModal(false);
      setSelectedDocument(null);
      
      // Reload stats
      loadStats();
    } catch (error) {
      console.error('Error updating document:', error);
      alert('Fehler beim Aktualisieren des Dokuments: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (documentId) => {
    if (!confirm('Möchtest du dieses Dokument wirklich löschen?')) return;
    
    try {
      setLoading(true);
      
      // Lösche das Dokument über den Service
      await documentsService.deleteDocument(documentId);
      
      // Entferne es aus der Liste
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      
      // Reload stats
      loadStats();
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Fehler beim Löschen des Dokuments: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">Dokumente</h1>
              </div>
              
              {/* Stats */}
              <div className="hidden md:flex items-center space-x-6 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <FileText className="w-4 h-4" />
                  <span>{stats.total} Dokumente</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Eye className="w-4 h-4" />
                  <span>{stats.totalViews.toLocaleString()} Views</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Star className="w-4 h-4" />
                  <span>{stats.totalFavorites.toLocaleString()} Favoriten</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={createNewDocument}
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Plus className="w-4 h-4 mr-2" />
                Neues Dokument
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
          {/* Search Bar */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Durchsuchen Sie Ihre Dokumente..."
              value={searchTerm}
              onChange={handleSearch}
              className="w-full pl-12 pr-4 py-4 text-lg border-0 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-200"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Ansicht:</span>
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setView('grid')}
                  className={`p-2 rounded-md transition-all duration-200 ${
                    view === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                  }`}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setView('list')}
                  className={`p-2 rounded-md transition-all duration-200 ${
                    view === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="updated">Zuletzt bearbeitet</option>
              <option value="created">Erstellt</option>
              <option value="title">Titel</option>
              <option value="views">Beliebteste</option>
            </select>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="all">Alle Kategorien</option>
              {getCategories().map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>

            {(searchTerm || selectedCategory !== 'all' || selectedTags.length > 0) && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all duration-200"
              >
                <X className="w-4 h-4 mr-1" />
                Filter löschen
              </button>
            )}
          </div>

          {/* Tags Filter */}
          <div className="flex flex-wrap gap-2">
            {getAllTags().slice(0, 10).map(tag => (
              <button
                key={tag}
                onClick={() => {
                  if (selectedTags.includes(tag)) {
                    setSelectedTags(selectedTags.filter(t => t !== tag));
                  } else {
                    setSelectedTags([...selectedTags, tag]);
                  }
                }}
                className={`px-3 py-1 text-xs rounded-full transition-all duration-200 ${
                  selectedTags.includes(tag)
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>

        {/* Documents Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Keine Dokumente gefunden</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || selectedCategory !== 'all' || selectedTags.length > 0
                ? 'Versuchen Sie andere Suchkriterien.'
                : 'Erstellen Sie Ihr erstes Dokument.'}
            </p>
          </div>
        ) : (
          <div className={`grid gap-6 ${
            view === 'grid' 
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
              : 'grid-cols-1'
          }`}>
            {filteredDocuments.map((doc) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 ${
                  view === 'list' ? 'flex' : ''
                }`}
              >
                {/* Document Preview */}
                <div className={`relative ${view === 'list' ? 'w-48 h-32' : 'h-48'}`}>
                  <div className="w-full h-full bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
                    <div className="text-center">
                      <FileText className="mx-auto h-12 w-12 text-blue-500 mb-2" />
                      <p className="text-xs text-gray-600">{doc.type}</p>
                    </div>
                  </div>
                  
                  {/* Category Badge */}
                  <div className="absolute top-3 left-3">
                    <div className="px-2 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-gray-700">
                      {doc.category}
                    </div>
                  </div>

                  {/* Favorite Button */}
                  <button
                    onClick={() => toggleFavorite(doc.id)}
                    className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-all duration-200"
                  >
                    <Star 
                      className={`w-4 h-4 ${
                        favorites.has(doc.id) ? 'text-yellow-500 fill-current' : 'text-gray-600'
                      }`} 
                    />
                  </button>

                  {/* Version Badge */}
                  <div className="absolute bottom-3 left-3">
                    <div className="px-2 py-1 bg-black/70 backdrop-blur-sm rounded-full text-xs text-white">
                      v{doc.version}
                    </div>
                  </div>
                </div>

                {/* Document Info */}
                <div className={`p-6 ${view === 'list' ? 'flex-1' : ''}`}>
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 line-clamp-2 cursor-pointer hover:text-blue-600 transition-colors"
                        onClick={() => openDocument(doc)}>
                      {doc.title}
                    </h3>
                  </div>

                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {doc.description}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {doc.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                        #{tag}
                      </span>
                    ))}
                    {doc.tags.length > 3 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                        +{doc.tags.length - 3}
                      </span>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                    <div className="flex items-center space-x-4">
                      <span className="flex items-center space-x-1">
                        <Eye className="w-3 h-3" />
                        <span>{(doc.views_count || 0).toLocaleString()}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Star className="w-3 h-3" />
                        <span>{(doc.favorites_count || 0).toLocaleString()}</span>
                      </span>
                    </div>
                    <span>{formatFileSize(doc.size_bytes ? `${Math.round(doc.size_bytes / 1024)} KB` : '0 KB')}</span>
                  </div>

                                     {/* Actions */}
                   <div className="flex items-center justify-between">
                     <div className="flex items-center space-x-2 text-xs text-gray-500">
                       <span>von {doc.owner?.firstname ? `${doc.owner.firstname} ${doc.owner.lastname}` : 'Unbekannt'}</span>
                       <span>•</span>
                       <span>{new Date(doc.updated_at).toLocaleDateString('de-DE')}</span>
                     </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openDocument(doc)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200">
                        <Share2 className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Create Document Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-4">Neues Dokument erstellen</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Titel
                  </label>
                  <input
                    type="text"
                    value={newDocument.title}
                    onChange={(e) => setNewDocument(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Dokumenttitel eingeben"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Beschreibung
                  </label>
                  <textarea
                    value={newDocument.description}
                    onChange={(e) => setNewDocument(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Kurze Beschreibung des Dokuments"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kategorie
                  </label>
                  <select
                    value={newDocument.category}
                    onChange={(e) => setNewDocument(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Allgemein">Allgemein</option>
                    <option value="Arbeit">Arbeit</option>
                    <option value="Studium">Studium</option>
                    <option value="Projekt">Projekt</option>
                    <option value="Persönlich">Persönlich</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleCreateDocument}
                  disabled={loading || !newDocument.title.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Erstelle...' : 'Erstellen'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Document View Modal */}
      <AnimatePresence>
        {showDocumentModal && selectedDocument && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowDocumentModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold">{selectedDocument.title}</h3>
                <button
                  onClick={() => setShowDocumentModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>Kategorie: {selectedDocument.category}</span>
                  <span>•</span>
                  <span>Erstellt: {new Date(selectedDocument.created_at).toLocaleDateString()}</span>
                  <span>•</span>
                  <span>Aktualisiert: {new Date(selectedDocument.updated_at).toLocaleDateString()}</span>
                </div>
                
                {selectedDocument.description && (
                  <p className="text-gray-700">{selectedDocument.description}</p>
                )}
                
                {selectedDocument.tags && selectedDocument.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedDocument.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Inhalt:</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    {selectedDocument.content && selectedDocument.content.length > 0 ? (
                      <div className="space-y-2">
                        {selectedDocument.content.map((block, index) => (
                          <div key={index} className="text-sm">
                            {block.type === 'heading1' && (
                              <h1 className="text-lg font-bold">{block.content}</h1>
                            )}
                            {block.type === 'heading2' && (
                              <h2 className="text-base font-semibold">{block.content}</h2>
                            )}
                            {block.type === 'text' && (
                              <p>{block.content}</p>
                            )}
                            {block.type === 'bullet-list' && (
                              <p>• {block.content}</p>
                            )}
                            {block.type === 'numbered-list' && (
                              <p>{index + 1}. {block.content}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 italic">Kein Inhalt verfügbar</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                <button
                  onClick={() => handleDeleteDocument(selectedDocument.id)}
                  className="px-4 py-2 text-red-600 hover:text-red-800 transition-colors"
                >
                  Löschen
                </button>
                <button
                  onClick={() => setShowDocumentModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Schließen
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}




