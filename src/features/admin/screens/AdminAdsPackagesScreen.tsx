import { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  Edit,
  Image,
  Link,
  Megaphone,
  Package,
  Plus,
  Save,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import {
  ADMIN_AD_BANNERS,
  ADMIN_SUBSCRIPTION_PACKAGES,
  ADMIN_TOKEN_EXCHANGE,
  type AdPosition,
  type AdStatus,
  type AdminAdBannerRecord,
  type AdminSubscriptionPackageRecord,
} from '../mock/data-for-AdminAdsPackagesScreen';
import '../styles/admin-ads-packages-screen.css';

const emptyAdForm = {
  title: '',
  imageName: '',
  imageUrl: '',
  targetUrl: '',
  position: 'home_hero' as AdPosition,
  durationDays: 7,
  status: 'draft' as AdStatus,
};

const isSupportedAdImage = (fileName: string) => /\.(jpe?g|png)$/i.test(fileName.trim());
const isValidUrl = (value: string) => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const formatVnd = (amount: number) => `${amount.toLocaleString('vi-VN')} VND`;

export default function AdminAdsPackagesScreen() {
  const [ads, setAds] = useState<AdminAdBannerRecord[]>(ADMIN_AD_BANNERS);
  const [packages, setPackages] = useState<AdminSubscriptionPackageRecord[]>(ADMIN_SUBSCRIPTION_PACKAGES);
  const [tokenRate, setTokenRate] = useState(ADMIN_TOKEN_EXCHANGE.vndPerToken.toString());
  const [minimumPurchase, setMinimumPurchase] = useState(ADMIN_TOKEN_EXCHANGE.minimumPurchase.toString());
  const [adForm, setAdForm] = useState(emptyAdForm);
  const [editingAdId, setEditingAdId] = useState<string | null>(null);
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);
  const [packageDraft, setPackageDraft] = useState<AdminSubscriptionPackageRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const stats = useMemo(() => ({
    activeAds: ads.filter(ad => ad.status === 'active').length,
    draftAds: ads.filter(ad => ad.status === 'draft').length,
    packages: packages.length,
    tokenRate: Number(tokenRate || 0),
  }), [ads, packages, tokenRate]);

  const resetAdForm = () => {
    setAdForm(emptyAdForm);
    setEditingAdId(null);
  };

  const handleSaveAd = () => {
    setError(null);
    setSuccess(null);

    if (!adForm.imageName.trim() || !isSupportedAdImage(adForm.imageName)) {
      setError(' Only JPG, PNG, GIF, or PDF formats are allowed');
      return;
    }

    if (!isValidUrl(adForm.targetUrl)) {
      setError('Ad URL must be a valid http or https URL');
      return;
    }

    if (!adForm.title.trim()) {
      setError('Ad title is required');
      return;
    }

    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + Number(adForm.durationDays) * 24 * 60 * 60 * 1000);

    if (editingAdId) {
      setAds(current =>
        current.map(ad =>
          ad.id === editingAdId
            ? {
                ...ad,
                ...adForm,
                startsAt: startDate.toISOString().split('T')[0],
                endsAt: endDate.toISOString().split('T')[0],
              }
            : ad
        )
      );
      setSuccess('Ad banner updated. Active ads display in designated positions.');
    } else {
      setAds(current => [
        {
          id: `ad_${Date.now()}`,
          ...adForm,
          startsAt: startDate.toISOString().split('T')[0],
          endsAt: endDate.toISOString().split('T')[0],
        },
        ...current,
      ]);
      setSuccess('Ad banner created. Active ads display in designated positions.');
    }

    resetAdForm();
  };

  const handleEditAd = (ad: AdminAdBannerRecord) => {
    setEditingAdId(ad.id);
    setAdForm({
      title: ad.title,
      imageName: ad.imageName,
      imageUrl: ad.imageUrl,
      targetUrl: ad.targetUrl,
      position: ad.position,
      durationDays: ad.durationDays,
      status: ad.status,
    });
  };

  const handleEditPackage = (pkg: AdminSubscriptionPackageRecord) => {
    setEditingPackageId(pkg.id);
    setPackageDraft({ ...pkg, features: [...pkg.features] });
    setError(null);
    setSuccess(null);
  };

  const handleSavePackage = () => {
    if (!packageDraft) return;
    setError(null);
    setSuccess(null);

    if (packageDraft.priceVnd < 0) {
      setError('Price must be a positive number');
      return;
    }

    setPackages(current =>
      current.map(pkg => (pkg.id === packageDraft.id ? packageDraft : pkg))
    );
    setEditingPackageId(null);
    setPackageDraft(null);
    setSuccess('Package pricing saved. Price changes apply to new purchases only.');
  };

  const handleSaveTokenRate = () => {
    const parsedRate = Number(tokenRate);
    const parsedMinimum = Number(minimumPurchase);
    setError(null);
    setSuccess(null);

    if (Number.isNaN(parsedRate) || parsedRate <= 0 || Number.isNaN(parsedMinimum) || parsedMinimum <= 0) {
      setError('Price must be a positive number');
      return;
    }

    setSuccess('Token exchange value saved. Changes apply to future transactions.');
  };

  return (
    <AppLayout>
      <div className="admin-ads-wrapper">
        <section className="ads-hero">
          <div>
            <p className="ads-kicker">Admin Commerce</p>
            <h1>Ads & Packages Management</h1>
            <p>Manage platform ad banners, premium package pricing, package features, and token exchange values.</p>
          </div>
          <div className="ads-policy">
            <Megaphone size={18} />
            Active ads are displayed in configured platform positions.
          </div>
        </section>

        <section className="ads-stats">
          <div><span>Active Ads</span><strong>{stats.activeAds}</strong></div>
          <div><span>Draft Ads</span><strong>{stats.draftAds}</strong></div>
          <div><span>Packages</span><strong>{stats.packages}</strong></div>
          <div><span>VND / Token</span><strong>{stats.tokenRate.toLocaleString('vi-VN')}</strong></div>
        </section>

        {error && (
          <div className="ads-message error">
            <AlertCircle size={18} />
            <span>{error}</span>
            <button onClick={() => setError(null)}><X size={16} /></button>
          </div>
        )}
        {success && (
          <div className="ads-message success">
            <CheckCircle size={18} />
            <span>{success}</span>
            <button onClick={() => setSuccess(null)}><X size={16} /></button>
          </div>
        )}

        <section className="ads-grid">
          <div className="ad-editor-card">
            <div className="ads-section-header">
              <div>
                <p className="ads-kicker">Banner CMS</p>
                <h2>{editingAdId ? 'Edit Ad Banner' : 'Create Ad Banner'}</h2>
              </div>
              <Image size={22} />
            </div>

            <label>Title</label>
            <input value={adForm.title} onChange={(event) => setAdForm({ ...adForm, title: event.target.value })} placeholder="Premium campaign banner" />

            <label>Image file name</label>
            <input value={adForm.imageName} onChange={(event) => setAdForm({ ...adForm, imageName: event.target.value })} placeholder="banner.png or banner.jpg" />

            <label>Preview image URL</label>
            <input value={adForm.imageUrl} onChange={(event) => setAdForm({ ...adForm, imageUrl: event.target.value })} placeholder="https://..." />

            <label>Ad target URL</label>
            <input value={adForm.targetUrl} onChange={(event) => setAdForm({ ...adForm, targetUrl: event.target.value })} placeholder="https://gigbridge.local/subscription" />

            <div className="ads-form-row">
              <div>
                <label>Position</label>
                <select value={adForm.position} onChange={(event) => setAdForm({ ...adForm, position: event.target.value as AdPosition })}>
                  <option value="home_hero">Home Hero</option>
                  <option value="browse_jobs_top">Browse Jobs Top</option>
                  <option value="sidebar">Sidebar</option>
                  <option value="dashboard_top">Dashboard Top</option>
                </select>
              </div>
              <div>
                <label>Duration</label>
                <input type="number" min="1" value={adForm.durationDays} onChange={(event) => setAdForm({ ...adForm, durationDays: Number(event.target.value) })} />
              </div>
              <div>
                <label>Status</label>
                <select value={adForm.status} onChange={(event) => setAdForm({ ...adForm, status: event.target.value as AdStatus })}>
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
            </div>

            <div className="ads-editor-actions">
              {editingAdId && <button className="ads-secondary-btn" onClick={resetAdForm}>Cancel</button>}
              <button className="ads-primary-btn" onClick={handleSaveAd}><Save size={16} />Save Banner</button>
            </div>
          </div>

          <div className="token-card">
            <div className="ads-section-header">
              <div>
                <p className="ads-kicker">Token Exchange</p>
                <h2>GigCoin Value</h2>
              </div>
              <Zap size={22} />
            </div>

            <label>VND per token</label>
            <input type="number" min="1" value={tokenRate} onChange={(event) => setTokenRate(event.target.value)} />

            <label>Minimum purchase tokens</label>
            <input type="number" min="1" value={minimumPurchase} onChange={(event) => setMinimumPurchase(event.target.value)} />

            <div className="token-preview">
              <strong>{formatVnd(Number(tokenRate || 0))}</strong>
              <span>per GigCoin. Changes apply to future transactions.</span>
            </div>

            <button className="ads-primary-btn full" onClick={handleSaveTokenRate}><Save size={16} />Save Token Rate</button>
          </div>
        </section>

        <section className="ads-list-card">
          <div className="ads-section-header">
            <div>
              <p className="ads-kicker">Live Inventory</p>
              <h2>Ad Banners</h2>
            </div>
            <Megaphone size={22} />
          </div>

          <div className="ads-banner-list">
            {ads.map(ad => (
              <article key={ad.id} className="ads-banner-row">
                <img src={ad.imageUrl} alt={ad.title} />
                <div>
                  <div className="ads-banner-title-line">
                    <h3>{ad.title}</h3>
                    <span className={`ads-status ${ad.status}`}>{ad.status}</span>
                  </div>
                  <p><Link size={14} />{ad.targetUrl}</p>
                  <div className="ads-meta">
                    <span>{ad.position.replaceAll('_', ' ')}</span>
                    <span>{ad.durationDays} days</span>
                    <span>{ad.startsAt} - {ad.endsAt}</span>
                  </div>
                </div>
                <div className="ads-row-actions">
                  <button className="ads-icon-btn" onClick={() => handleEditAd(ad)}><Edit size={16} /></button>
                  <button className="ads-icon-btn danger" onClick={() => setAds(current => current.filter(item => item.id !== ad.id))}><Trash2 size={16} /></button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="packages-card">
          <div className="ads-section-header">
            <div>
              <p className="ads-kicker">Premium Plans</p>
              <h2>Subscription Packages</h2>
            </div>
            <Package size={22} />
          </div>

          <div className="package-list">
            {packages.map(pkg => (
              <article key={pkg.id} className="package-row">
                {editingPackageId === pkg.id && packageDraft ? (
                  <>
                    <input value={packageDraft.name} onChange={(event) => setPackageDraft({ ...packageDraft, name: event.target.value })} />
                    <input type="number" min="0" value={packageDraft.priceVnd} onChange={(event) => setPackageDraft({ ...packageDraft, priceVnd: Number(event.target.value) })} />
                    <textarea value={packageDraft.features.join('\n')} onChange={(event) => setPackageDraft({ ...packageDraft, features: event.target.value.split('\n').filter(Boolean) })} />
                    <div className="ads-row-actions">
                      <button className="ads-secondary-btn" onClick={() => { setEditingPackageId(null); setPackageDraft(null); }}>Cancel</button>
                      <button className="ads-primary-btn" onClick={handleSavePackage}>Save</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <h3>{pkg.name}</h3>
                      <p>{formatVnd(pkg.priceVnd)} / {pkg.billingCycle}</p>
                      <ul>{pkg.features.map(feature => <li key={feature}>{feature}</li>)}</ul>
                    </div>
                    <button className="ads-secondary-btn" onClick={() => handleEditPackage(pkg)}><Edit size={16} />Edit Package</button>
                  </>
                )}
              </article>
            ))}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
