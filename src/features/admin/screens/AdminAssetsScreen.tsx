import { useState, useEffect, useMemo } from 'react';
import { Search, Folder, Download, File as FileIcon, Image, Film, FileText, ExternalLink, Calendar, Users, AlertCircle, Layers, LayoutGrid, List } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { adminAPI } from '../../../api/adminAPI';
import '../styles/admin-users-screen.css'; // sharing premium CSS tokens

interface Asset {
  assetId: string;
  fileName: string;
  fileUrl: string;
  mimeType?: string;
  fileSize?: number;
  assetType: 'Deliverable' | 'MilestoneAttachment';
  contractId: string;
  contractTitle: string;
  uploadedBy: string;
  uploadedByUserId: string;
  jobPostId?: string;
  createdAt: string;
}

const formatBytes = (bytes?: number) => {
  if (bytes === undefined || bytes === null || bytes === 0) return 'Unknown Size';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIcon = (mimeType?: string, fileName?: string) => {
  const name = fileName?.toLowerCase() || '';
  const mime = mimeType?.toLowerCase() || '';

  if (mime.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name)) {
    return <Image size={24} className="text-cyan" />;
  }
  if (mime.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm)$/i.test(name)) {
    return <Film size={24} className="text-purple" />;
  }
  if (mime === 'application/pdf' || name.endsWith('.pdf')) {
    return <FileText size={24} className="text-red" />;
  }
  return <FileIcon size={24} className="text-secondary" />;
};

const getFilterButtonClass = (isActive: boolean) =>
  `px-4 py-2 rounded-lg border text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-border)] ${isActive
    ? 'border-[var(--brand-border)] bg-[var(--brand-soft)] text-[var(--brand)] shadow-[0_4px_12px_rgba(73,75,231,0.12)]'
    : 'border-[var(--brand-border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand)]'
  }`;

const getViewButtonClass = (isActive: boolean) =>
  `p-2 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-border)] ${isActive
    ? 'bg-[var(--brand-soft)] text-[var(--brand)] shadow-[0_4px_12px_rgba(73,75,231,0.12)]'
    : 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand)]'
  }`;

export default function AdminAssetsScreen() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'Deliverable' | 'MilestoneAttachment'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  const fetchAssets = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await adminAPI.getAssets();
      if (response.success && response.data) {
        // Map backend AdminAssetDto to Asset
        setAssets(response.data.map((a: any) => ({
          assetId: a.assetId,
          fileName: a.fileName,
          fileUrl: a.fileUrl,
          mimeType: a.mimeType,
          fileSize: a.fileSize,
          assetType: a.assetType,
          contractId: a.contractId,
          contractTitle: a.contractTitle,
          uploadedBy: a.uploadedBy,
          uploadedByUserId: a.uploadedByUserId,
          jobPostId: a.jobPostId,
          createdAt: a.createdAt,
        })));
      } else {
        setError(response.message || 'Failed to load assets');
      }
    } catch (err) {
      setError('An unexpected error occurred while loading assets.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      const matchesSearch = searchQuery === '' ||
        asset.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.contractTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.uploadedBy.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFilter = filterType === 'all' || asset.assetType === filterType;

      return matchesSearch && matchesFilter;
    });
  }, [assets, searchQuery, filterType]);

  const stats = useMemo(() => {
    const total = assets.length;
    const deliverables = assets.filter(a => a.assetType === 'Deliverable').length;
    const attachments = assets.filter(a => a.assetType === 'MilestoneAttachment').length;
    return { total, deliverables, attachments };
  }, [assets]);

  return (
    <AppLayout>
      <div className="w-full max-w-[100vw] overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Layers size={20} className="text-cyan" />
                <span className="badge-cyan text-xs">Assets & Deliverables</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-primary">Platform Asset Library</h1>
              <p className="text-sm text-secondary mt-1">Audit, preview, and download project files and final deliverables</p>
            </div>
            <button
              onClick={fetchAssets}
              className="btn-ghost-cyan px-4 py-2 text-sm flex items-center gap-2"
            >
              Refresh Library
            </button>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="glass-card p-4 sm:p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-cyan/10">
                <Folder size={24} className="text-cyan" />
              </div>
              <div>
                <p className="text-xs text-secondary font-medium">Total Files</p>
                <p className="text-2xl font-black text-primary mt-0.5">{stats.total}</p>
              </div>
            </div>

            <div className="glass-card p-4 sm:p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green/10">
                <FileText size={24} className="text-green" />
              </div>
              <div>
                <p className="text-xs text-secondary font-medium">Deliverables (Handoffs)</p>
                <p className="text-2xl font-black text-primary mt-0.5">{stats.deliverables}</p>
              </div>
            </div>

            <div className="glass-card p-4 sm:p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-purple/10">
                <FileIcon size={24} className="text-purple" />
              </div>
              <div>
                <p className="text-xs text-secondary font-medium">Milestone Attachments</p>
                <p className="text-2xl font-black text-primary mt-0.5">{stats.attachments}</p>
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="glass-card p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              {/* Search */}
              <div className="relative w-full md:w-80">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
                <input
                  type="text"
                  placeholder="Search file name, contract, uploader..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-primary placeholder:text-[var(--text-muted)] placeholder:opacity-100 focus:outline-none focus:border-[var(--brand-border)] focus:ring-2 focus:ring-[var(--brand-soft)] text-sm transition-all"
                />
              </div>

              {/* Badges Filters */}
              <div className="flex gap-2 flex-wrap w-full md:w-auto md:justify-end">
                <button
                  type="button"
                  onClick={() => setFilterType('all')}
                  className={getFilterButtonClass(filterType === 'all')}
                >
                  All Assets
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('Deliverable')}
                  className={getFilterButtonClass(filterType === 'Deliverable')}
                >
                  Final Handoffs
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('MilestoneAttachment')}
                  className={getFilterButtonClass(filterType === 'MilestoneAttachment')}
                >
                  Milestone Attachments
                </button>

                <div
                  className="flex gap-1 ml-auto md:ml-1"
                  role="group"
                  aria-label="Asset view"
                >
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    aria-label="Grid view"
                    aria-pressed={viewMode === 'grid'}
                    className={getViewButtonClass(viewMode === 'grid')}
                  >
                    <LayoutGrid size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    aria-label="List view"
                    aria-pressed={viewMode === 'list'}
                    className={getViewButtonClass(viewMode === 'list')}
                  >
                    <List size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          {error && (
            <div className="glass-card p-4 border border-red/20 bg-red/5 flex items-center gap-3 text-red mb-6">
              <AlertCircle size={20} />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan mx-auto mb-4" />
              <p className="text-secondary text-sm">Scanning asset registry...</p>
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="text-center py-16 glass-card">
              <Folder size={48} className="mx-auto mb-4 text-muted" />
              <p className="text-primary font-medium mb-1">No assets found</p>
              <p className="text-sm text-secondary">Try updating your search query or filters</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" role="list" aria-label="Asset grid">
              {filteredAssets.map(asset => (
                <div key={asset.assetId} className="glass-card p-5 hover:border-cyan/30 transition-all duration-300 flex flex-col justify-between" role="listitem">
                  <div>
                    {/* Icon and Type Badge */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2.5 rounded-lg bg-white/5">
                        {getFileIcon(asset.mimeType, asset.fileName)}
                      </div>
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${asset.assetType === 'Deliverable'
                          ? 'bg-green/10 text-green border border-green/20'
                          : 'bg-purple/10 text-purple border border-purple/20'
                        }`}>
                        {asset.assetType === 'Deliverable' ? 'Final Handoff' : 'Milestone Attachment'}
                      </span>
                    </div>

                    {/* File Info */}
                    <h3 className="text-sm font-bold text-primary truncate mb-1" title={asset.fileName}>
                      {asset.fileName}
                    </h3>
                    <p className="text-[11px] text-muted mb-3 font-mono">{formatBytes(asset.fileSize)}</p>

                    {/* Meta Fields */}
                    <div className="space-y-2 text-xs border-t border-white/5 pt-3">
                      <div className="flex items-center gap-2 text-secondary">
                        <Users size={12} className="text-cyan flex-shrink-0" />
                        <span className="truncate">By: <span className="font-semibold text-primary">{asset.uploadedBy}</span></span>
                      </div>
                      <div className="flex items-center gap-2 text-secondary">
                        <FileText size={12} className="text-purple flex-shrink-0" />
                        <span className="truncate" title={asset.contractTitle}>
                          Contract: <span className="font-semibold text-primary">{asset.contractTitle}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-secondary">
                        <Calendar size={12} className="text-amber flex-shrink-0" />
                        <span>Uploaded: {new Date(asset.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-4 pt-3 border-t border-white/5">
                    {asset.fileUrl ? (
                      <a
                        href={asset.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 btn-cyan py-2 text-xs flex items-center justify-center gap-1.5"
                      >
                        <Download size={12} />
                        Download
                      </a>
                    ) : (
                      <span className="flex-1 text-center py-2 text-xs text-muted bg-white/5 rounded-lg border border-white/5">
                        No File URL
                      </span>
                    )}
                    {asset.contractId && (
                      <a
                        href={`/contracts/${asset.contractId}`}
                        className="p-2 rounded-lg glass-button hover:bg-white/5 transition-colors flex items-center justify-center"
                        title="View Contract"
                      >
                        <ExternalLink size={14} className="text-secondary" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card overflow-hidden" role="list" aria-label="Asset list">
              <div className="hidden lg:grid grid-cols-[minmax(0,2fr)_minmax(0,1.25fr)_minmax(0,1fr)_auto] gap-4 px-5 py-3 border-b border-white/10 text-[10px] font-bold uppercase tracking-wider text-muted">
                <span>File</span>
                <span>Contract</span>
                <span>Uploaded by</span>
                <span className="text-right">Actions</span>
              </div>
              <div className="divide-y divide-white/5">
                {filteredAssets.map(asset => (
                  <div
                    key={asset.assetId}
                    className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.25fr)_minmax(0,1fr)_auto] gap-3 lg:gap-4 items-center p-4 sm:px-5 hover:bg-white/[0.03] transition-colors"
                    role="listitem"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2.5 rounded-lg bg-white/5 flex-shrink-0">
                        {getFileIcon(asset.mimeType, asset.fileName)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-primary truncate" title={asset.fileName}>
                          {asset.fileName}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] text-muted font-mono">{formatBytes(asset.fileSize)}</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${asset.assetType === 'Deliverable'
                              ? 'bg-green/10 text-green border border-green/20'
                              : 'bg-purple/10 text-purple border border-purple/20'
                            }`}>
                            {asset.assetType === 'Deliverable' ? 'Final Handoff' : 'Milestone Attachment'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 min-w-0 text-xs text-secondary">
                      <FileText size={13} className="text-purple flex-shrink-0" />
                      <span className="truncate" title={asset.contractTitle}>{asset.contractTitle}</span>
                    </div>

                    <div className="min-w-0 text-xs text-secondary">
                      <div className="flex items-center gap-2">
                        <Users size={13} className="text-cyan flex-shrink-0" />
                        <span className="truncate text-primary font-semibold">{asset.uploadedBy}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-muted">
                        <Calendar size={12} className="text-amber flex-shrink-0" />
                        <span>{new Date(asset.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 lg:justify-end">
                      {asset.fileUrl ? (
                        <a
                          href={asset.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-cyan px-3 py-2 text-xs flex items-center justify-center gap-1.5"
                        >
                          <Download size={12} />
                          Download
                        </a>
                      ) : (
                        <span className="px-3 py-2 text-xs text-muted bg-white/5 rounded-lg border border-white/5">
                          No File URL
                        </span>
                      )}
                      {asset.contractId && (
                        <a
                          href={`/contracts/${asset.contractId}`}
                          className="p-2 rounded-lg glass-button hover:bg-white/5 transition-colors flex items-center justify-center"
                          title="View Contract"
                        >
                          <ExternalLink size={14} className="text-secondary" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
