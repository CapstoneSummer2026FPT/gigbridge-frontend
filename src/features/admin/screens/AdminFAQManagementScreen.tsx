import { useMemo, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Edit,
  Eye,
  FileText,
  FolderPlus,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import {
  FAQ_MANAGEMENT_ARTICLES,
  FAQ_MANAGEMENT_CATEGORIES,
  type FAQArticleRecord,
  type FAQCategoryRecord,
  type FAQStatus,
} from '../mock/data-for-AdminFAQManagementScreen';
import '../styles/admin-faq-management-screen.css';

const emptyArticleForm = {
  title: '',
  content: '',
  categoryId: FAQ_MANAGEMENT_CATEGORIES[0]?.id || '',
  status: 'draft' as FAQStatus,
};

export default function AdminFAQManagementScreen() {
  const [categories, setCategories] = useState<FAQCategoryRecord[]>(FAQ_MANAGEMENT_CATEGORIES);
  const [articles, setArticles] = useState<FAQArticleRecord[]>(FAQ_MANAGEMENT_ARTICLES);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | FAQStatus>('all');
  const [articleForm, setArticleForm] = useState(emptyArticleForm);
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const orderedCategories = useMemo(
    () => [...categories].sort((a, b) => a.order - b.order),
    [categories]
  );

  const filteredArticles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return articles.filter(article => {
      const matchesSearch =
        !query ||
        article.title.toLowerCase().includes(query) ||
        article.content.toLowerCase().includes(query);
      const matchesCategory = selectedCategoryId === 'all' || article.categoryId === selectedCategoryId;
      const matchesStatus = selectedStatus === 'all' || article.status === selectedStatus;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [articles, searchQuery, selectedCategoryId, selectedStatus]);

  const stats = useMemo(() => ({
    total: articles.length,
    published: articles.filter(article => article.status === 'published').length,
    drafts: articles.filter(article => article.status === 'draft').length,
    categories: categories.length,
  }), [articles, categories]);

  const getCategoryName = (categoryId: string) =>
    categories.find(category => category.id === categoryId)?.name || 'Uncategorized';

  const resetArticleForm = () => {
    setArticleForm({ ...emptyArticleForm, categoryId: orderedCategories[0]?.id || '' });
    setEditingArticleId(null);
  };

  const handleSaveArticle = () => {
    setError(null);
    setSuccess(null);

    if (!articleForm.title.trim()) {
      setError('MSG35: This field is required');
      return;
    }

    if (articleForm.title.length > 255) {
      setError('Title must be 255 characters or less');
      return;
    }

    if (!articleForm.content.trim()) {
      setError('MSG35: This field is required');
      return;
    }

    if (editingArticleId) {
      setArticles(current =>
        current.map(article =>
          article.id === editingArticleId
            ? { ...article, ...articleForm, updatedAt: new Date().toISOString() }
            : article
        )
      );
      setSuccess('FAQ article updated successfully');
    } else {
      setArticles(current => [
        {
          id: `faq_${Date.now()}`,
          ...articleForm,
          updatedAt: new Date().toISOString(),
        },
        ...current,
      ]);
      setSuccess(articleForm.status === 'published' ? 'FAQ published and visible on public FAQ page' : 'FAQ saved as draft');
    }

    resetArticleForm();
  };

  const handleEditArticle = (article: FAQArticleRecord) => {
    setEditingArticleId(article.id);
    setArticleForm({
      title: article.title,
      content: article.content,
      categoryId: article.categoryId,
      status: article.status,
    });
    setError(null);
    setSuccess(null);
  };

  const handleDeleteArticle = (articleId: string) => {
    setArticles(current => current.filter(article => article.id !== articleId));
    if (editingArticleId === articleId) resetArticleForm();
  };

  const handleToggleStatus = (articleId: string) => {
    setArticles(current =>
      current.map(article =>
        article.id === articleId
          ? {
              ...article,
              status: article.status === 'published' ? 'draft' : 'published',
              updatedAt: new Date().toISOString(),
            }
          : article
      )
    );
  };

  const handleSaveCategory = () => {
    const trimmedName = categoryName.trim();
    setError(null);
    setSuccess(null);

    if (!trimmedName) {
      setError('MSG35: This field is required');
      return;
    }

    if (editingCategoryId) {
      setCategories(current =>
        current.map(category =>
          category.id === editingCategoryId ? { ...category, name: trimmedName } : category
        )
      );
      setEditingCategoryId(null);
      setSuccess('Category updated successfully');
    } else {
      setCategories(current => [
        ...current,
        {
          id: `cat_${Date.now()}`,
          name: trimmedName,
          description: 'Admin-created FAQ category.',
          order: current.length + 1,
        },
      ]);
      setSuccess('Category created successfully');
    }

    setCategoryName('');
  };

  const handleDeleteCategory = (categoryId: string) => {
    const fallbackCategory = orderedCategories.find(category => category.id !== categoryId);
    setCategories(current => current.filter(category => category.id !== categoryId));
    setArticles(current =>
      current.map(article =>
        article.categoryId === categoryId && fallbackCategory
          ? { ...article, categoryId: fallbackCategory.id }
          : article
      )
    );
  };

  const moveCategory = (categoryId: string, direction: 'up' | 'down') => {
    const ordered = [...orderedCategories];
    const index = ordered.findIndex(category => category.id === categoryId);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (index < 0 || targetIndex < 0 || targetIndex >= ordered.length) return;

    [ordered[index], ordered[targetIndex]] = [ordered[targetIndex], ordered[index]];
    setCategories(ordered.map((category, idx) => ({ ...category, order: idx + 1 })));
  };

  return (
    <AppLayout>
      <div className="admin-faq-wrapper">
        <section className="faq-admin-hero">
          <div>
            <p className="faq-admin-kicker">Admin CMS</p>
            <h1>FAQ Management</h1>
            <p>Create, organize, draft, and publish FAQ articles for the public FAQ page.</p>
          </div>
          <div className="faq-admin-policy">
            <Eye size={18} />
            Published FAQs are immediately visible to users. Draft FAQs stay hidden.
          </div>
        </section>

        <section className="faq-admin-stats">
          <div><span>Total FAQs</span><strong>{stats.total}</strong></div>
          <div><span>Published</span><strong>{stats.published}</strong></div>
          <div><span>Drafts</span><strong>{stats.drafts}</strong></div>
          <div><span>Categories</span><strong>{stats.categories}</strong></div>
        </section>

        {error && (
          <div className="faq-message error">
            <AlertCircle size={18} />
            <span>{error}</span>
            <button onClick={() => setError(null)}><X size={16} /></button>
          </div>
        )}
        {success && (
          <div className="faq-message success">
            <CheckCircle size={18} />
            <span>{success}</span>
            <button onClick={() => setSuccess(null)}><X size={16} /></button>
          </div>
        )}

        <section className="faq-admin-grid">
          <div className="faq-editor-card">
            <div className="faq-section-header">
              <div>
                <p className="faq-admin-kicker">Article Editor</p>
                <h2>{editingArticleId ? 'Edit FAQ Article' : 'Create FAQ Article'}</h2>
              </div>
              <FileText size={22} />
            </div>

            <label>Title</label>
            <input
              value={articleForm.title}
              onChange={(event) => setArticleForm({ ...articleForm, title: event.target.value })}
              maxLength={255}
              placeholder="Enter FAQ title"
            />

            <label>Category</label>
            <select
              value={articleForm.categoryId}
              onChange={(event) => setArticleForm({ ...articleForm, categoryId: event.target.value })}
            >
              {orderedCategories.map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>

            <label>Status</label>
            <select
              value={articleForm.status}
              onChange={(event) => setArticleForm({ ...articleForm, status: event.target.value as FAQStatus })}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>

            <label>Content</label>
            <textarea
              value={articleForm.content}
              onChange={(event) => setArticleForm({ ...articleForm, content: event.target.value })}
              rows={9}
              placeholder="Write the FAQ answer..."
            />

            <div className="faq-editor-actions">
              {editingArticleId && (
                <button className="faq-secondary-btn" onClick={resetArticleForm}>
                  Cancel
                </button>
              )}
              <button className="faq-primary-btn" onClick={handleSaveArticle}>
                <Save size={16} />
                {editingArticleId ? 'Save Changes' : 'Create FAQ'}
              </button>
            </div>
          </div>

          <div className="faq-category-card">
            <div className="faq-section-header">
              <div>
                <p className="faq-admin-kicker">Categories</p>
                <h2>Organize & Reorder</h2>
              </div>
              <FolderPlus size={22} />
            </div>

            <div className="category-create-row">
              <input
                value={categoryName}
                onChange={(event) => setCategoryName(event.target.value)}
                placeholder="Category name"
              />
              <button className="faq-primary-btn" onClick={handleSaveCategory}>
                <Plus size={16} />
                {editingCategoryId ? 'Save' : 'Add'}
              </button>
            </div>

            <div className="category-list">
              {orderedCategories.map((category, index) => (
                <div key={category.id} className="category-row">
                  <div>
                    <strong>{category.name}</strong>
                    <span>{articles.filter(article => article.categoryId === category.id).length} articles</span>
                  </div>
                  <div className="category-actions">
                    <button onClick={() => moveCategory(category.id, 'up')} disabled={index === 0}><ChevronUp size={15} /></button>
                    <button onClick={() => moveCategory(category.id, 'down')} disabled={index === orderedCategories.length - 1}><ChevronDown size={15} /></button>
                    <button onClick={() => {
                      setEditingCategoryId(category.id);
                      setCategoryName(category.name);
                    }}><Edit size={15} /></button>
                    <button onClick={() => handleDeleteCategory(category.id)} disabled={orderedCategories.length <= 1}><Trash2 size={15} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="faq-list-card">
          <div className="faq-list-controls">
            <div className="faq-search">
              <Search size={18} />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search FAQ articles..."
              />
            </div>
            <select value={selectedCategoryId} onChange={(event) => setSelectedCategoryId(event.target.value)}>
              <option value="all">All Categories</option>
              {orderedCategories.map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            <select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value as typeof selectedStatus)}>
              <option value="all">All Statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          <div className="faq-article-list">
            {filteredArticles.map(article => (
              <article key={article.id} className="faq-article-row">
                <div className="faq-article-main">
                  <div className="faq-article-title-line">
                    <BookOpen size={18} />
                    <h3>{article.title}</h3>
                    <span className={`faq-status ${article.status}`}>{article.status}</span>
                  </div>
                  <p>{article.content}</p>
                  <div className="faq-article-meta">
                    <span>{getCategoryName(article.categoryId)}</span>
                    <span>Updated {new Date(article.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="faq-article-actions">
                  <button onClick={() => handleToggleStatus(article.id)} className="faq-secondary-btn">
                    {article.status === 'published' ? 'Move to Draft' : 'Publish'}
                  </button>
                  <button onClick={() => handleEditArticle(article)} className="faq-icon-btn"><Edit size={16} /></button>
                  <button onClick={() => handleDeleteArticle(article.id)} className="faq-icon-btn danger"><Trash2 size={16} /></button>
                </div>
              </article>
            ))}

            {filteredArticles.length === 0 && (
              <div className="faq-empty">
                <BookOpen size={42} />
                <strong>No FAQ articles found</strong>
                <span>Try adjusting search, category, or status filters.</span>
              </div>
            )}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
