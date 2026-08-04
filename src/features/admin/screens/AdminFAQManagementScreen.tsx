import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { adminAPI } from '../../../api/adminAPI';
import type { FAQCategoryDto, FAQDto } from '../../../types/models/FAQ';
import '../styles/admin-faq-management-screen.css';

type FAQStatus = 'published' | 'draft';

interface ArticleFormState {
  question: string;
  answer: string;
  faqCategoryId: number | '';
  status: FAQStatus;
  sortOrder: string;
}

const emptyArticleForm: ArticleFormState = {
  question: '',
  answer: '',
  faqCategoryId: '',
  status: 'draft',
  sortOrder: '',
};

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const getStatus = (item: { isActive?: boolean | null }): FAQStatus =>
  item.isActive === true ? 'published' : 'draft';

export default function AdminFAQManagementScreen() {
  const [categories, setCategories] = useState<FAQCategoryDto[]>([]);
  const [articles, setArticles] = useState<FAQDto[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<'all' | number>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | FAQStatus>('all');
  const [articleForm, setArticleForm] = useState<ArticleFormState>(emptyArticleForm);
  const [editingArticleId, setEditingArticleId] = useState<number | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categorySlug, setCategorySlug] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const orderedCategories = useMemo(
    () =>
      [...categories].sort((a, b) => {
        const sortA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
        const sortB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
        return sortA - sortB || a.name.localeCompare(b.name);
      }),
    [categories]
  );

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const [categoriesResponse, faqsResponse] = await Promise.all([
      adminAPI.getFAQCategories(),
      adminAPI.getFAQs(),
    ]);

    if (!categoriesResponse.success || !faqsResponse.success) {
      setCategories([]);
      setArticles([]);
      setError(categoriesResponse.message || faqsResponse.message || 'Unable to load FAQ data');
      setIsLoading(false);
      return;
    }

    const loadedCategories = categoriesResponse.data || [];
    setCategories(loadedCategories);
    setArticles(faqsResponse.data || []);
    setArticleForm(current => ({
      ...current,
      faqCategoryId: current.faqCategoryId || loadedCategories[0]?.id || '',
    }));
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredArticles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return articles.filter(article => {
      const matchesSearch =
        !query ||
        article.question.toLowerCase().includes(query) ||
        article.answer.toLowerCase().includes(query) ||
        (article.faqCategoryName || '').toLowerCase().includes(query);
      const matchesCategory = selectedCategoryId === 'all' || article.faqCategoryId === selectedCategoryId;
      const matchesStatus = selectedStatus === 'all' || getStatus(article) === selectedStatus;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [articles, searchQuery, selectedCategoryId, selectedStatus]);

  const stats = useMemo(() => ({
    total: articles.length,
    published: articles.filter(article => article.isActive === true).length,
    drafts: articles.filter(article => article.isActive !== true).length,
    categories: categories.length,
  }), [articles, categories]);

  const getCategoryName = (categoryId: number) =>
    categories.find(category => category.id === categoryId)?.name || 'Uncategorized';

  const resetArticleForm = () => {
    setArticleForm({
      ...emptyArticleForm,
      faqCategoryId: orderedCategories[0]?.id || '',
    });
    setEditingArticleId(null);
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const handleSaveArticle = async () => {
    clearMessages();

    const question = articleForm.question.trim();
    const answer = articleForm.answer.trim();
    const faqCategoryId = Number(articleForm.faqCategoryId);
    const sortOrder = articleForm.sortOrder.trim() ? Number(articleForm.sortOrder) : null;

    if (!question || !answer || !faqCategoryId) {
      setError('This field is required');
      return;
    }

    if (question.length > 500) {
      setError('Question must be 500 characters or less');
      return;
    }

    if (sortOrder !== null && Number.isNaN(sortOrder)) {
      setError('Sort order must be a number');
      return;
    }

    setIsSaving(true);

    if (editingArticleId) {
      const response = await adminAPI.updateFAQ(editingArticleId, {
        question,
        answer,
        faqCategoryId,
        sortOrder,
        isActive: articleForm.status === 'published',
      });

      if (!response.success) {
        setError(response.message || 'Unable to update FAQ');
        setIsSaving(false);
        return;
      }

      setSuccess('FAQ article updated successfully');
    } else {
      const response = await adminAPI.createFAQ({
        question,
        answer,
        faqCategoryId,
        sortOrder,
      });

      if (!response.success || !response.data) {
        setError(response.message || 'Unable to create FAQ');
        setIsSaving(false);
        return;
      }

      if (articleForm.status === 'draft') {
        const draftResponse = await adminAPI.updateFAQ(response.data.id, { isActive: false });
        if (!draftResponse.success) {
          setError(draftResponse.message || 'FAQ created, but could not move it to draft');
          setIsSaving(false);
          await loadData();
          return;
        }
      }

      setSuccess(articleForm.status === 'published' ? 'FAQ published and visible on public FAQ page' : 'FAQ saved as draft');
    }

    resetArticleForm();
    await loadData();
    setIsSaving(false);
  };

  const handleEditArticle = (article: FAQDto) => {
    setEditingArticleId(article.id);
    setArticleForm({
      question: article.question,
      answer: article.answer,
      faqCategoryId: article.faqCategoryId,
      status: getStatus(article),
      sortOrder: article.sortOrder?.toString() || '',
    });
    clearMessages();
  };

  const handleDeleteArticle = async (articleId: number) => {
    clearMessages();
    const response = await adminAPI.deleteFAQ(articleId);

    if (!response.success) {
      setError(response.message || 'Unable to delete FAQ');
      return;
    }

    if (editingArticleId === articleId) resetArticleForm();
    setSuccess('FAQ article deleted successfully');
    await loadData();
  };

  const handleToggleStatus = async (articleId: number) => {
    clearMessages();
    const response = await adminAPI.toggleFAQActivity(articleId);

    if (!response.success) {
      setError(response.message || 'Unable to toggle FAQ status');
      return;
    }

    setSuccess('FAQ activity toggled successfully');
    await loadData();
  };

  const handleSaveCategory = async () => {
    const trimmedName = categoryName.trim();
    const trimmedSlug = (categorySlug.trim() || slugify(trimmedName)).trim();
    clearMessages();

    if (!trimmedName || !trimmedSlug) {
      setError('This field is required');
      return;
    }

    setIsSaving(true);

    if (editingCategoryId) {
      const response = await adminAPI.updateFAQCategory(editingCategoryId, {
        name: trimmedName,
        slug: trimmedSlug,
      });

      if (!response.success) {
        setError(response.message || 'Unable to update category');
        setIsSaving(false);
        return;
      }

      setSuccess('Category updated successfully');
    } else {
      const response = await adminAPI.createFAQCategory({
        name: trimmedName,
        slug: trimmedSlug,
        sortOrder: orderedCategories.length + 1,
      });

      if (!response.success) {
        setError(response.message || 'Unable to create category');
        setIsSaving(false);
        return;
      }

      setSuccess('Category created successfully');
    }

    setCategoryName('');
    setCategorySlug('');
    setEditingCategoryId(null);
    await loadData();
    setIsSaving(false);
  };

  const handleDeleteCategory = async (categoryId: number) => {
    clearMessages();
    const response = await adminAPI.deleteFAQCategory(categoryId);

    if (!response.success) {
      setError(response.message || 'Unable to delete category');
      return;
    }

    setSuccess('Category deleted successfully');
    await loadData();
  };

  const handleToggleCategoryActivity = async (categoryId: number) => {
    clearMessages();
    const response = await adminAPI.toggleFAQCategoryActivity(categoryId);

    if (!response.success) {
      setError(response.message || 'Unable to toggle category activity');
      return;
    }

    setSuccess('Category activity toggled successfully');
    await loadData();
  };

  const moveCategory = async (categoryId: number, direction: 'up' | 'down') => {
    const ordered = [...orderedCategories];
    const index = ordered.findIndex(category => category.id === categoryId);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (index < 0 || targetIndex < 0 || targetIndex >= ordered.length) return;

    const current = ordered[index];
    const target = ordered[targetIndex];
    const currentOrder = current.sortOrder ?? index + 1;
    const targetOrder = target.sortOrder ?? targetIndex + 1;

    clearMessages();
    const [currentResponse, targetResponse] = await Promise.all([
      adminAPI.updateFAQCategory(current.id, { sortOrder: targetOrder }),
      adminAPI.updateFAQCategory(target.id, { sortOrder: currentOrder }),
    ]);

    if (!currentResponse.success || !targetResponse.success) {
      setError(currentResponse.message || targetResponse.message || 'Unable to reorder categories');
      return;
    }

    await loadData();
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

        {isLoading ? (
          <section className="faq-list-card">
            <div className="faq-empty">
              <BookOpen size={42} />
              <strong>Loading FAQ management data...</strong>
            </div>
          </section>
        ) : (
          <>
            <section className="faq-admin-grid">
              <div className="faq-editor-card">
                <div className="faq-section-header">
                  <div>
                    <p className="faq-admin-kicker">Article Editor</p>
                    <h2>{editingArticleId ? 'Edit FAQ Article' : 'Create FAQ Article'}</h2>
                  </div>
                  <FileText size={22} />
                </div>

                <label>Question</label>
                <input
                  value={articleForm.question}
                  onChange={(event) => setArticleForm({ ...articleForm, question: event.target.value })}
                  maxLength={500}
                  placeholder="Enter FAQ question"
                />

                <label>Category</label>
                <select
                  value={articleForm.faqCategoryId}
                  onChange={(event) => setArticleForm({ ...articleForm, faqCategoryId: Number(event.target.value) })}
                >
                  <option value="" disabled>Select a category</option>
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

                <label>Sort Order</label>
                <input
                  value={articleForm.sortOrder}
                  onChange={(event) => setArticleForm({ ...articleForm, sortOrder: event.target.value })}
                  placeholder="Optional display order"
                />

                <label>Answer</label>
                <textarea
                  value={articleForm.answer}
                  onChange={(event) => setArticleForm({ ...articleForm, answer: event.target.value })}
                  rows={9}
                  placeholder="Write the FAQ answer..."
                />

                <div className="faq-editor-actions">
                  {editingArticleId && (
                    <button className="faq-secondary-btn" onClick={resetArticleForm} disabled={isSaving}>
                      Cancel
                    </button>
                  )}
                  <button className="faq-primary-btn" onClick={handleSaveArticle} disabled={isSaving || orderedCategories.length === 0}>
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
                    onChange={(event) => {
                      setCategoryName(event.target.value);
                      if (!editingCategoryId) setCategorySlug(slugify(event.target.value));
                    }}
                    placeholder="Category name"
                  />
                  <button className="faq-primary-btn" onClick={handleSaveCategory} disabled={isSaving}>
                    <Plus size={16} />
                    {editingCategoryId ? 'Save' : 'Add'}
                  </button>
                </div>
                <input
                  className="category-slug-input"
                  value={categorySlug}
                  onChange={(event) => setCategorySlug(slugify(event.target.value))}
                  placeholder="Category slug"
                />

                <div className="category-list">
                  {orderedCategories.map((category, index) => (
                    <div key={category.id} className="category-row">
                      <div>
                        <strong>{category.name}</strong>
                        <span>{category.faqCount} articles | {getStatus(category)}</span>
                      </div>
                      <div className="category-actions">
                        <button onClick={() => moveCategory(category.id, 'up')} disabled={index === 0}><ChevronUp size={15} /></button>
                        <button onClick={() => moveCategory(category.id, 'down')} disabled={index === orderedCategories.length - 1}><ChevronDown size={15} /></button>
                        <button onClick={() => handleToggleCategoryActivity(category.id)}>
                          {category.isActive === true ? <X size={15} /> : <CheckCircle size={15} />}
                        </button>
                        <button onClick={() => {
                          setEditingCategoryId(category.id);
                          setCategoryName(category.name);
                          setCategorySlug(category.slug);
                        }}><Edit size={15} /></button>
                        <button onClick={() => handleDeleteCategory(category.id)}><Trash2 size={15} /></button>
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
                <select
                  value={selectedCategoryId}
                  onChange={(event) => setSelectedCategoryId(event.target.value === 'all' ? 'all' : Number(event.target.value))}
                >
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
                {filteredArticles.map(article => {
                  const status = getStatus(article);

                  return (
                    <article key={article.id} className="faq-article-row">
                      <div className="faq-article-main">
                        <div className="faq-article-title-line">
                          <BookOpen size={18} />
                          <h3>{article.question}</h3>
                          <span className={`faq-status ${status}`}>{status}</span>
                        </div>
                        <p>{article.answer}</p>
                        <div className="faq-article-meta">
                          <span>{getCategoryName(article.faqCategoryId)}</span>
                          <span>Updated {new Date(article.updatedAt || article.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="faq-article-actions">
                        <button onClick={() => handleToggleStatus(article.id)} className="faq-secondary-btn">
                          {status === 'published' ? 'Move to Draft' : 'Publish'}
                        </button>
                        <button onClick={() => handleEditArticle(article)} className="faq-icon-btn"><Edit size={16} /></button>
                        <button onClick={() => handleDeleteArticle(article.id)} className="faq-icon-btn danger"><Trash2 size={16} /></button>
                      </div>
                    </article>
                  );
                })}

                {filteredArticles.length === 0 && (
                  <div className="faq-empty">
                    <BookOpen size={42} />
                    <strong>No FAQ articles found</strong>
                    <span>Try adjusting search, category, or status filters.</span>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </AppLayout>
  );
}
