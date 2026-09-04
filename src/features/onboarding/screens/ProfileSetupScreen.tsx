import { useMemo } from 'react';
import {
  Building,
  MapPin,
  Globe,
  Briefcase,
  Tags,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  UserCheck,
  FileText,
  Check,
} from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';
import { GuestLayout } from '../../../shared/components/AppLayout';
import { CustomSelect } from '../../../shared/components/CustomSelect';
import { VietnamLocationSelect } from '../../../shared/components/VietnamLocationSelect';
import { UserRole } from '../../../types/models/User';
import { useProfileSetup } from '../hooks/useProfileSetup';
import '../styles/profile-setup-screen.css';

const AVAILABILITY_OPTIONS = [
  { value: 0, label: 'Available - More than 30 hrs/week' },
  { value: 1, label: 'Busy - Less than 30 hrs/week' },
  { value: 2, label: 'Not Available' },
];

export default function ProfileSetupScreen() {
  const { t } = useTranslation('onboarding');
  const {
    role,
    isClient,
    step,
    setStep,
    isSubmitting,
    error,
    clientData,
    setClientData,
    freelancerData,
    setFreelancerData,
    companySizes,
    industries,
    majors,
    categories,
    isTaxonomyLoading,
    taxonomyError,
    loadMajors,
    handleMajorChange,
    toggleCategory,
    // Validation & Submit
    validateCurrentStep,
    handleSubmit,
  } = useProfileSetup();

  // CustomSelect Options Mappings
  const industryOptions = useMemo(
    () => industries.map(ind => ({ value: ind, label: ind })),
    [industries]
  );

  const companySizeOptions = useMemo(
    () => companySizes.map(s => ({ value: String(s.id), label: s.name })),
    [companySizes]
  );

  const majorOptions = useMemo(
    () => majors.map(m => ({ value: m.majorId, label: m.name })),
    [majors]
  );

  const availabilityOptions = useMemo(
    () => AVAILABILITY_OPTIONS.map(opt => ({ value: String(opt.value), label: opt.label })),
    []
  );

  if (role === UserRole.Admin) {
    return null;
  }

  return (
    <GuestLayout>
      <div className="profile-setup-container">
        <div className="profile-setup-content">

          {/* Role Eyebrow Badge */}
          <div className="text-center">
            <div className="profile-setup-eyebrow">
              <span className="profile-setup-eyebrow-dot" />
              <span>{isClient ? t('clientRoleBadge', { defaultValue: 'Hồ sơ Nhà Tuyển Dụng' }) : t('freelancerRoleBadge', { defaultValue: 'Hồ sơ Freelancer' })}</span>
            </div>
          </div>

          {/* Header Title */}
          <div className="profile-setup-header">
            <h1 className="profile-setup-title">{t('title', { defaultValue: 'Hoàn thiện hồ sơ cá nhân' })}</h1>
            <p className="profile-setup-subtitle">
              {t('subtitle', { defaultValue: 'Chào mừng bạn đến với GigBridge! Hãy hoàn tất một số thông tin cơ bản để bắt đầu kết nối dự án.' })}
            </p>
          </div>

          {/* Interactive Step Wizard Tabs */}
          <div className="profile-setup-wizard-tabs">
            <div
              className={`profile-setup-step-tab ${step >= 1 ? 'active' : ''}`}
              onClick={() => step === 2 && setStep(1)}
              style={{ cursor: step === 2 ? 'pointer' : 'default' }}
            >
              <div className="profile-setup-step-num">
                {step > 1 ? <Check size={14} /> : '01'}
              </div>
              <div className="profile-setup-step-info">
                <span className="profile-setup-step-title">
                  {isClient ? t('steps.step1Client', { defaultValue: '1. Thông tin công ty' }) : t('steps.step1Freelancer', { defaultValue: '1. Chuyên môn & Kỹ năng' })}
                </span>
                <span className="profile-setup-step-desc">
                  {isClient ? 'Thương hiệu & Ngành nghề' : 'Chuyên ngành & Kỹ năng'}
                </span>
              </div>
            </div>

            <div className={`profile-setup-step-tab ${step === 2 ? 'active' : ''}`}>
              <div className="profile-setup-step-num">02</div>
              <div className="profile-setup-step-info">
                <span className="profile-setup-step-title">
                  {isClient ? t('steps.step2Client', { defaultValue: '2. Quy mô & Địa điểm' }) : t('steps.step2Freelancer', { defaultValue: '2. Giới thiệu & Địa điểm' })}
                </span>
                <span className="profile-setup-step-desc">
                  {isClient ? 'Quy mô & Trụ sở công ty' : 'Giới thiệu & Địa điểm'}
                </span>
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-4 mb-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-bold text-center">
              {error}
            </div>
          )}

          {/* Main Setup Card Box */}
          <div className="profile-setup-card">
            {isClient ? (
              /* CLIENT FLOW */
              step === 1 ? (
                <div>
                  <div className="profile-setup-card-header">
                    <h2 className="profile-setup-card-title">
                      <Building size={22} />
                      {t('client.step1Title', { defaultValue: 'Thông tin thương hiệu & Doanh nghiệp' })}
                    </h2>
                    <p className="profile-setup-card-subtitle">
                      {t('client.step1Subtitle', { defaultValue: 'Cung cấp tên công ty và ngành nghề để tạo uy tín với các ứng viên hàng đầu.' })}
                    </p>
                  </div>

                  <div className="profile-setup-field">
                    <label className="profile-setup-label">
                      <Building size={12} /> {t('client.companyName', { defaultValue: 'Tên công ty / Tổ chức' })} *
                    </label>
                    <div className="profile-setup-input-wrapper">
                      <Building size={16} className="profile-setup-input-icon" />
                      <input
                        type="text"
                        className="profile-setup-input profile-setup-input-has-icon"
                        value={clientData.companyName}
                        onChange={e => setClientData({ ...clientData, companyName: e.target.value })}
                        placeholder={t('client.companyNamePlaceholder', { defaultValue: 'Ví dụ: Công ty TNHH Giải Pháp Công Nghệ GigBridge' })}
                      />
                    </div>
                  </div>

                  <div className="profile-setup-field">
                    <label className="profile-setup-label">
                      <Globe size={12} /> {t('client.companyWebsite', { defaultValue: 'Website công ty (Không bắt buộc)' })}
                    </label>
                    <div className="profile-setup-input-wrapper">
                      <Globe size={16} className="profile-setup-input-icon" />
                      <input
                        type="url"
                        className="profile-setup-input profile-setup-input-has-icon"
                        value={clientData.companyWebsite}
                        onChange={e => setClientData({ ...clientData, companyWebsite: e.target.value })}
                        placeholder={t('client.companyWebsitePlaceholder', { defaultValue: 'https://example.com' })}
                      />
                    </div>
                  </div>

                  <div className="profile-setup-field">
                    <label className="profile-setup-label">
                      <Briefcase size={12} /> {t('client.industry', { defaultValue: 'Ngành nghề hoạt động chính' })} *
                    </label>
                    <CustomSelect
                      value={clientData.industry}
                      options={industryOptions}
                      onChange={val => setClientData({ ...clientData, industry: val })}
                      placeholder={t('client.selectIndustry', { defaultValue: '-- Chọn ngành nghề hoạt động --' })}
                      searchPlaceholder="Tìm ngành nghề..."
                    />
                  </div>
                </div>
              ) : (
                /* CLIENT STEP 2 */
                <div>
                  <div className="profile-setup-card-header">
                    <h2 className="profile-setup-card-title">
                      <MapPin size={22} />
                      {t('client.step2Title', { defaultValue: 'Địa điểm & Mô tả chi tiết' })}
                    </h2>
                    <p className="profile-setup-card-subtitle">
                      {t('client.step2Subtitle', { defaultValue: 'Giúp ứng viên biết vị trí trụ sở hoặc văn phòng làm việc của bạn.' })}
                    </p>
                  </div>

                  <div className="profile-setup-field">
                    <label className="profile-setup-label">
                      <UserCheck size={12} /> {t('client.companySize', { defaultValue: 'Quy mô công ty' })}
                    </label>
                    <CustomSelect
                      value={String(clientData.companySize)}
                      options={companySizeOptions}
                      onChange={val => setClientData({ ...clientData, companySize: Number(val) })}
                      searchable={false}
                    />
                  </div>

                  {/* Shared Reusable Vietnam Location Component */}
                  <VietnamLocationSelect
                    value={clientData.location}
                    onChange={loc => setClientData(prev => ({ ...prev, location: loc }))}
                  />

                  <div className="profile-setup-field">
                    <label className="profile-setup-label">
                      <FileText size={12} /> {t('client.companyDescription', { defaultValue: 'Mô tả ngắn gọn về doanh nghiệp' })}
                    </label>
                    <textarea
                      className="profile-setup-textarea"
                      rows={3}
                      value={clientData.companyDescription}
                      onChange={e => setClientData({ ...clientData, companyDescription: e.target.value })}
                      placeholder={t('client.companyDescriptionPlaceholder', { defaultValue: 'Giới thiệu mục tiêu, sản phẩm dịch vụ hoặc định hướng của công ty...' })}
                    />
                  </div>
                </div>
              )
            ) : (
              /* FREELANCER FLOW */
              step === 1 ? (
                <div>
                  <div className="profile-setup-card-header">
                    <h2 className="profile-setup-card-title">
                      <Briefcase size={22} />
                      {t('freelancer.step1Title', { defaultValue: 'Chuyên môn & Lĩnh vực hoạt động' })}
                    </h2>
                    <p className="profile-setup-card-subtitle">
                      {t('freelancer.step1Subtitle', { defaultValue: 'Chọn ngành nghề và chuyên môn chính để thuật toán AI gợi ý các công việc phù hợp nhất.' })}
                    </p>
                  </div>

                  <div className="profile-setup-field">
                    <label className="profile-setup-label">
                      <UserCheck size={12} /> {t('freelancer.professionalTitle', { defaultValue: 'Tiêu đề chuyên môn / Chức danh' })} *
                    </label>
                    <input
                      type="text"
                      className="profile-setup-input"
                      value={freelancerData.title}
                      onChange={e => setFreelancerData({ ...freelancerData, title: e.target.value })}
                      placeholder={t('freelancer.professionalTitlePlaceholder', { defaultValue: 'Ví dụ: Senior Fullstack Developer / UI/UX Designer Specialist' })}
                    />
                  </div>

                  <div className="profile-setup-field">
                    <div className="flex items-center justify-between">
                      <label className="profile-setup-label">
                        <Briefcase size={12} /> {t('freelancer.major', { defaultValue: 'Lĩnh vực / Chuyên ngành chính' })} *
                      </label>
                      {taxonomyError && (
                        <button
                          type="button"
                          onClick={() => void loadMajors()}
                          className="text-xs font-bold text-rose-500 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw size={12} /> {t('common.retry', { defaultValue: 'Thử lại' })}
                        </button>
                      )}
                    </div>
                    <CustomSelect
                      value={freelancerData.majorId}
                      options={majorOptions}
                      onChange={val => void handleMajorChange(val)}
                      placeholder={t('freelancer.selectMajor', { defaultValue: '-- Chọn lĩnh vực hoạt động --' })}
                      searchPlaceholder="Tìm lĩnh vực hoạt động..."
                      disabled={isTaxonomyLoading && majors.length === 0}
                    />
                  </div>

                  <div className="profile-setup-field">
                    <label className="profile-setup-label flex items-center gap-1.5">
                      <Tags size={14} />
                      {t('freelancer.categories', { defaultValue: 'Kỹ năng & Chuyên môn cụ thể (Chọn ít nhất 1)' })} *
                    </label>

                    {!freelancerData.majorId ? (
                      <p className="text-xs font-medium italic p-4 rounded-xl border border-[var(--gb-border)]">
                        {t('freelancer.selectMajorFirst', { defaultValue: 'Vui lòng chọn Lĩnh vực / Chuyên ngành chính ở trên trước.' })}
                      </p>
                    ) : isTaxonomyLoading ? (
                      <div className="p-4 rounded-xl border border-[var(--gb-border)] text-xs font-bold flex items-center gap-2" style={{ color: 'var(--brand)' }}>
                        <RefreshCw size={14} className="animate-spin" />
                        {t('freelancer.loadingTaxonomy', { defaultValue: 'Đang tải danh mục kỹ năng...' })}
                      </div>
                    ) : (
                      <div className="profile-setup-pills-container">
                        {categories.map(cat => {
                          const active = freelancerData.categoryIds.includes(cat.categoryId);
                          return (
                            <button
                              key={cat.categoryId}
                              type="button"
                              onClick={() => toggleCategory(cat.categoryId)}
                              className={`profile-setup-pill ${active ? 'active' : ''}`}
                            >
                              {active && <CheckCircle2 size={13} />}
                              <span>{cat.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="profile-setup-field">
                    <label className="profile-setup-label">{t('freelancer.availability', { defaultValue: 'Trạng thái sẵn sàng nhận việc' })}</label>
                    <CustomSelect
                      value={String(freelancerData.availability)}
                      options={availabilityOptions}
                      onChange={val => setFreelancerData({ ...freelancerData, availability: Number(val) })}
                      searchable={false}
                    />
                  </div>
                </div>
              ) : (
                /* FREELANCER STEP 2 */
                <div>
                  <div className="profile-setup-card-header">
                    <h2 className="profile-setup-card-title">
                      <MapPin size={22} />
                      {t('freelancer.step2Title', { defaultValue: 'Giới thiệu bản thân & Địa điểm' })}
                    </h2>
                    <p className="profile-setup-card-subtitle">
                      {t('freelancer.step2Subtitle', { defaultValue: 'Viết mô tả kinh nghiệm và vị trí của bạn để nhà tuyển dụng dễ dàng tìm thấy.' })}
                    </p>
                  </div>

                  {/* Shared Reusable Vietnam Location Component */}
                  <VietnamLocationSelect
                    value={freelancerData.location}
                    onChange={loc => setFreelancerData(prev => ({ ...prev, location: loc }))}
                  />

                  <div className="profile-setup-field">
                    <label className="profile-setup-label">
                      <FileText size={12} /> {t('freelancer.bio', { defaultValue: 'Mô tả bản thân & Kinh nghiệm làm việc' })} *
                    </label>
                    <textarea
                      className="profile-setup-textarea"
                      rows={4}
                      value={freelancerData.bio}
                      onChange={e => setFreelancerData({ ...freelancerData, bio: e.target.value })}
                      placeholder={t('freelancer.bioPlaceholder', { defaultValue: 'Chia sẻ về kinh nghiệm, phong cách làm việc, các dự án tiêu biểu và giá trị bạn mang lại...' })}
                    />
                  </div>
                </div>
              )
            )}

            {/* Actions Footer */}
            <div className="profile-setup-actions">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="profile-setup-btn-back"
                >
                  <ChevronLeft size={16} />
                  {t('buttons.back', { defaultValue: 'Quay lại' })}
                </button>
              ) : (
                <div />
              )}

              {step === 1 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (validateCurrentStep()) setStep(2);
                  }}
                  disabled={isTaxonomyLoading || Boolean(taxonomyError)}
                  className="profile-setup-btn-next"
                >
                  {t('buttons.continue', { defaultValue: 'Tiếp tục' })}
                  <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={isSubmitting}
                  className="profile-setup-btn-next"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      {t('buttons.completing', { defaultValue: 'Đang lưu thông tin...' })}
                    </>
                  ) : (
                    <>
                      {t('buttons.complete', { defaultValue: 'Hoàn tất đăng ký' })}
                      <ChevronRight size={16} />
                    </>
                  )}
                </button>
              )}
            </div>

          </div>

        </div>
      </div>
    </GuestLayout>
  );
}
