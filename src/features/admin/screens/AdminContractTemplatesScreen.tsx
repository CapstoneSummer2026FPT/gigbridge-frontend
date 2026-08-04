import { useMemo, useState, useEffect } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Copy,
  Save,
  X,
  ChevronDown,
  FileText,
  ShieldCheck,
  Layers,
  Search,
  Sparkles,
  Settings,
  Crown,
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { adminAPI } from '../../../api/adminAPI';
import '../styles/admin-contract-templates-screen.css';

interface ContractTemplate {
  id: string;
  name: string;
  description: string;
  content: string;
  category: 'standard' | 'premium' | 'custom';
  version: number;
  createdDate: string;
  updatedDate: string;
  isActive: boolean;
}

interface AdminESignTemplateDto {
  esignTemplatesId: string;
  name: string;
  description?: string | null;
  htmlContent: string;
  templateCode: string;
  version: number;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

const REQUIRED_TEMPLATE_CLAUSES = ['scope', 'budget', 'timeline', 'ip'];

const filterTemplates = (
  source: ContractTemplate[],
  category: 'all' | ContractTemplate['category'],
  search: string
) => {
  const query = search.trim().toLowerCase();

  return source.filter(template => {
    const categoryMatches = category === 'all' || template.category === category;
    const searchMatches =
      !query ||
      template.name.toLowerCase().includes(query) ||
      template.description.toLowerCase().includes(query) ||
      template.content.toLowerCase().includes(query);

    return categoryMatches && searchMatches;
  });
};

const getClauseCoverage = (content: string) => {
  const normalized = content.toLowerCase();
  return REQUIRED_TEMPLATE_CLAUSES.map(clause => ({
    clause,
    met: normalized.includes(clause),
  }));
};

const findMissingRequiredClauses = (content: string) =>
  getClauseCoverage(content).filter(item => !item.met).map(item => item.clause);

const getCoveragePercent = (content: string) => {
  const coverage = getClauseCoverage(content);
  return Math.round((coverage.filter(item => item.met).length / coverage.length) * 100);
};

const mapEsignTemplateToContractTemplate = (t: AdminESignTemplateDto): ContractTemplate => ({
  id: t.esignTemplatesId,
  name: t.name,
  description: t.description || '',
  content: t.htmlContent,
  category: t.templateCode === 'CONTRACT_PREMIUM' ? 'premium' :
            t.templateCode === 'CONTRACT_CUSTOM' ? 'custom' : 'standard',
  version: t.version,
  createdDate: t.createdAt ? t.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
  updatedDate: t.updatedAt ? t.updatedAt.split('T')[0] : (t.createdAt ? t.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]),
  isActive: t.isActive,
});

export default function AdminContractTemplatesScreen() {
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedCategory, setSelectedCategory] = useState<'all' | 'standard' | 'premium' | 'custom'>('all');
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    content: '',
    category: 'standard' as ContractTemplate['category'],
  });

  const fetchTemplates = async () => {
    setError(null);
    try {
      const response = await adminAPI.getTemplates();
      if (response.success && response.data) {
        setTemplates(response.data.map(mapEsignTemplateToContractTemplate));
      } else {
        setError(response.message || 'Failed to load templates');
      }
    } catch (err) {
      setError('An error occurred while fetching templates');
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const filteredTemplates = useMemo(
    () => filterTemplates(templates, selectedCategory, searchQuery),
    [templates, selectedCategory, searchQuery]
  );

  const templateStats = useMemo(
    () => ({
      total: templates.length,
      active: templates.filter(template => template.isActive).length,
      premium: templates.filter(template => template.category === 'premium').length,
    }),
    [templates]
  );

  const formCoverage = getClauseCoverage(formData.content);
  const formCoveragePercent = getCoveragePercent(formData.content);

  const resetForm = () => {
    setShowCreateForm(false);
    setEditingTemplateId(null);
    setFormData({ name: '', description: '', content: '', category: 'standard' });
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('Template name is required');
      return;
    }

    if (formData.name.length > 100) {
      setError('Template name must be 100 characters or less');
      return;
    }

    if (!formData.description.trim()) {
      setError('Template description is required');
      return;
    }

    if (!formData.content.trim()) {
      setError('Template content is required');
      return;
    }

    const missingClauses = findMissingRequiredClauses(formData.content);
    if (missingClauses.length > 0) {
      setError(`Template must include required clauses: ${missingClauses.join(', ')}`);
      return;
    }

    try {
      const response = await adminAPI.createTemplate({
        name: formData.name,
        templateCode: formData.category === 'premium' ? 'CONTRACT_PREMIUM' :
                      formData.category === 'custom' ? 'CONTRACT_CUSTOM' : 'CONTRACT_FIXED_PRICE',
        htmlContent: formData.content,
        version: 1,
        description: formData.description,
        isActive: true,
      });

      if (response.success) {
        setSuccessMessage('Template created successfully');
        resetForm();
        await fetchTemplates();
      } else {
        setError(response.message || 'Failed to create template');
      }
    } catch (err) {
      setError('An error occurred while creating template.');
    }
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleUpdateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!editingTemplateId) return;

    if (!formData.name.trim()) {
      setError('Template name is required');
      return;
    }

    if (!formData.content.trim()) {
      setError('Template content is required');
      return;
    }

    const missingClauses = findMissingRequiredClauses(formData.content);
    if (missingClauses.length > 0) {
      setError(`Template must include required clauses: ${missingClauses.join(', ')}`);
      return;
    }

    try {
      const response = await adminAPI.updateTemplate(editingTemplateId, {
        name: formData.name,
        templateCode: formData.category === 'premium' ? 'CONTRACT_PREMIUM' :
                      formData.category === 'custom' ? 'CONTRACT_CUSTOM' : 'CONTRACT_FIXED_PRICE',
        htmlContent: formData.content,
        version: 1,
        description: formData.description,
        isActive: true,
      });

      if (response.success) {
        setSuccessMessage('Template updated successfully');
        resetForm();
        await fetchTemplates();
      } else {
        setError(response.message || 'Failed to update template');
      }
    } catch (err) {
      setError('An error occurred while updating template.');
    }
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;

    try {
      const response = await adminAPI.deleteTemplate(id);
      if (response.success) {
        setSuccessMessage('Template deleted successfully');
        await fetchTemplates();
      } else {
        setError(response.message || 'Failed to delete template');
      }
    } catch (err) {
      setError('An error occurred while deleting template.');
    }
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleCopyTemplate = (template: ContractTemplate) => {
    setFormData({
      name: `${template.name} (Copy)`,
      description: template.description,
      content: template.content,
      category: template.category,
    });
    setEditingTemplateId(null);
    setShowCreateForm(true);
    setSuccessMessage('Template copied to editor');
    setTimeout(() => setSuccessMessage(null), 2000);
  };

  const handleEditTemplate = (template: ContractTemplate) => {
    setFormData({
      name: template.name,
      description: template.description,
      content: template.content,
      category: template.category,
    });
    setEditingTemplateId(template.id);
    setShowCreateForm(true);
  };

  const getCategoryBadgeClass = (category: string) => `category-badge category-${category}`;

  return (
    <AppLayout>
      <div className="admin-templates-wrapper">
        <section className="templates-hero">
          <div className="templates-hero-main">
            <div className="templates-hero-icon">
              <FileText size={30} />
            </div>
            <div>
              <p className="templates-kicker">Admin Configuration</p>
              <h1 className="templates-title">Contract Templates Management</h1>
              <p className="templates-subtitle">
                Govern baseline agreements for future contracts with clause coverage, version control, and default template routing.
              </p>
            </div>
          </div>
          <button onClick={() => setShowCreateForm(true)} className="create-btn hero-create">
            <Plus size={18} />
            New Template
          </button>
        </section>

        <section className="templates-stats-grid" aria-label="Contract template metrics">
          <div className="template-stat-card">
            <div className="stat-icon stat-total"><Layers size={20} /></div>
            <span>Total Templates</span>
            <strong>{templateStats.total}</strong>
          </div>
          <div className="template-stat-card">
            <div className="stat-icon stat-active"><CheckCircle2 size={20} /></div>
            <span>Active Templates</span>
            <strong>{templateStats.active}</strong>
          </div>
          <div className="template-stat-card">
            <div className="stat-icon stat-premium"><Crown size={20} /></div>
            <span>Premium</span>
            <strong>{templateStats.premium}</strong>
          </div>
        </section>

        <section className="templates-rule-banner">
          <div className="rule-banner-icon">
            <ShieldCheck size={22} />
          </div>
          <div className="rule-banner-copy">
            <strong>Future-contract policy</strong>
            <span>Updated templates only apply to new contracts and must include all required clauses.</span>
          </div>
          <div className="rule-chip-row">
            {REQUIRED_TEMPLATE_CLAUSES.map(clause => (
              <span key={clause} className="rule-chip">{clause.toUpperCase()}</span>
            ))}
          </div>
        </section>

        {successMessage && (
          <div className="success-message">
            <CheckCircle2 size={20} />
            <p>{successMessage}</p>
            <button onClick={() => setSuccessMessage(null)} className="close-btn" aria-label="Close success message">
              <X size={16} />
            </button>
          </div>
        )}

        {error && (
          <div className="error-message">
            <AlertCircle size={20} />
            <p>{error}</p>
            <button onClick={() => setError(null)} className="close-btn" aria-label="Close error message">
              <X size={16} />
            </button>
          </div>
        )}

        {showCreateForm && (
          <section className="template-editor-shell">
            <div className="form-header">
              <div>
                <p className="section-kicker">Template Editor</p>
                <h2 className="form-title">{editingTemplateId ? 'Edit Template' : 'Create New Template'}</h2>
              </div>
              <button onClick={resetForm} className="form-close" aria-label="Close template editor">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={editingTemplateId ? handleUpdateTemplate : handleCreateTemplate} className="template-form-grid">
              <div className="editor-fields">
                <div className="form-group">
                  <label className="form-label">Template Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enterprise Software Delivery Agreement"
                    className="form-input"
                    maxLength={100}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Short internal description for admins"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as ContractTemplate['category'] })}
                    className="form-select"
                  >
                    <option value="standard">Standard</option>
                    <option value="premium">Premium</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                <div className="coverage-panel">
                  <div>
                    <span className="coverage-label">Required clause coverage</span>
                    <strong>{formCoveragePercent}%</strong>
                  </div>
                  <div className="required-clause-preview">
                    {formCoverage.map(item => (
                      <span key={item.clause} className={`clause-chip ${item.met ? 'met' : 'missing'}`}>
                        {item.met ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                        {item.clause.toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="editor-pane">
                <div className="editor-pane-header">
                  <span>Template Content</span>
                  <span>{formData.content.length} characters</span>
                </div>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder={'Scope\nDefine deliverables and acceptance criteria.\n\nBudget\nDefine escrow, payment, and change-request rules.\n\nTimeline\nDefine milestones and review windows.\n\nIP\nDefine ownership and transfer conditions.'}
                  className="form-textarea"
                  rows={14}
                />
              </div>

              <div className="form-actions">
                <button type="button" onClick={resetForm} className="action-btn action-cancel">
                  Cancel
                </button>
                <button type="submit" className="action-btn action-save">
                  <Save size={18} />
                  {editingTemplateId ? 'Update' : 'Create'} Template
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="templates-controls upgraded">
          <div className="search-box">
            <Search size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, description, or clause content..."
              className="search-input"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="clear-btn" aria-label="Clear search">
                <X size={16} />
              </button>
            )}
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as typeof selectedCategory)}
            className="category-select"
          >
            <option value="all">All Categories</option>
            <option value="standard">Standard</option>
            <option value="premium">Premium</option>
            <option value="custom">Custom</option>
          </select>

          <div className="result-count-pill">
            <Settings size={16} />
            {filteredTemplates.length} visible
          </div>
        </section>

        <section className="templates-list">
          {filteredTemplates.length === 0 ? (
            <div className="empty-state">
              <AlertCircle size={48} />
              <p className="empty-title">No templates found</p>
              <p className="empty-subtitle">
                Try another category or create a new baseline template.
              </p>
            </div>
          ) : (
            filteredTemplates.map(template => {
              const coverage = getClauseCoverage(template.content);
              const coveragePercent = getCoveragePercent(template.content);

              return (
                <article
                  key={template.id}
                  className={`template-card ${expandedTemplateId === template.id ? 'expanded' : ''}`}
                >
                  <div className="template-card-top">
                    <div className="template-title-block">
                      <div className="template-card-title-row">
                        <h3 className="template-name">{template.name}</h3>
                        <div className="badges">
                          <span className={getCategoryBadgeClass(template.category)}>
                            {template.category.toUpperCase()}
                          </span>
                          {!template.isActive && <span className="badge-inactive">INACTIVE</span>}
                        </div>
                      </div>
                      <p className="description">{template.description}</p>
                    </div>

                    <div className="template-card-tools">
                      <div className="template-score-badge">
                        <Sparkles size={16} />
                        <span>{coveragePercent}%</span>
                        <small>coverage</small>
                      </div>
                      <button
                        onClick={() =>
                          setExpandedTemplateId(expandedTemplateId === template.id ? null : template.id)
                        }
                        className="expand-btn"
                        aria-label={expandedTemplateId === template.id ? 'Collapse template' : 'Expand template'}
                      >
                        <ChevronDown size={20} />
                      </button>
                    </div>
                  </div>

                  <div className="card-body-collapsed">
                    <div className="meta-info">
                      <span>Version {template.version}</span>
                      <span>Updated {template.updatedDate}</span>
                      <span>Created {template.createdDate}</span>
                    </div>
                    <div className="clause-row">
                      {coverage.map(item => (
                        <span key={item.clause} className={`clause-chip ${item.met ? 'met' : 'missing'}`}>
                          {item.met ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                          {item.clause.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </div>

                  {expandedTemplateId === template.id && (
                    <div className="card-body-expanded">
                      <div className="template-expanded-grid">
                        <div className="template-detail-panel">
                          <h4>Template Profile</h4>
                          <div className="detail-row">
                            <span className="detail-label">Version</span>
                            <span className="detail-value">v{template.version}</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Category</span>
                            <span className="detail-value">{template.category}</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Created</span>
                            <span className="detail-value">{template.createdDate}</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Updated</span>
                            <span className="detail-value">{template.updatedDate}</span>
                          </div>
                        </div>

                        <div className="template-content-panel">
                          <div className="content-panel-header">
                            <h4>Clause Preview</h4>
                            <span>{template.content.length} chars</span>
                          </div>
                          <div className="content-box">{template.content}</div>
                        </div>
                      </div>

                      <div className="card-actions">
                        <button onClick={() => handleCopyTemplate(template)} className="action-btn action-copy">
                          <Copy size={16} />
                          Duplicate
                        </button>
                        <button onClick={() => handleEditTemplate(template)} className="action-btn action-edit">
                          <Edit size={16} />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(template.id)}
                          className="action-btn action-delete"
                        >
                          <Trash2 size={16} />
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </section>

        {filteredTemplates.length > 0 && (
          <div className="summary-info">
            Showing <strong>{filteredTemplates.length}</strong> of <strong>{templates.length}</strong> templates
          </div>
        )}
      </div>
    </AppLayout>
  );
}
