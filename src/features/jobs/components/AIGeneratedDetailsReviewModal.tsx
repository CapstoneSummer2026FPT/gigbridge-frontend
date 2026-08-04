import { X, Sparkles, Check, Briefcase, Wrench } from 'lucide-react';
import type { GenerateJobDescriptionDetailsResponse } from '../../../types/models/Job';
import { renderDescription } from '../utils/descriptionFormatter';

interface Props {
  isOpen: boolean;
  data: GenerateJobDescriptionDetailsResponse | null;
  onClose: () => void;
  onApprove: () => void;
}

export function AIGeneratedDetailsReviewModal({ isOpen, data, onClose, onApprove }: Props) {
  if (!isOpen || !data) return null;

  return (
    <div className="job-post-modal-overlay" role="dialog" aria-modal="true">
      <div className="job-post-modal-backdrop" onClick={onClose} />
      <div className="job-post-modal-container">
        {/* Decorative top gradient border */}
        <div className="job-post-modal-accent-bar" />

        {/* Modal Header */}
        <div className="job-post-modal-header">
          <div className="job-post-modal-header-title">
            <div className="job-post-modal-icon-sparkle">
              <Sparkles size={20} />
            </div>
            <div>
              <h3>Review AI Job Post</h3>
              <p>Check details before pre-filling your project draft</p>
            </div>
          </div>
          <button type="button" className="job-post-modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="job-post-modal-content">
          {/* Job Title */}
          <div className="job-post-review-section">
            <label className="job-post-review-label">
              <Briefcase size={16} className="inline mr-1 text-primary-500" /> Job Title
            </label>
            <div className="job-post-review-value title-value">{data.title}</div>
          </div>

          {/* Major & Category */}
          <div className="job-post-review-grid">
            <div className="job-post-review-section">
              <label className="job-post-review-label">Major</label>
              <div className="job-post-review-value">{data.majorName || 'N/A'}</div>
            </div>
            <div className="job-post-review-section">
              <label className="job-post-review-label">Category</label>
              <div className="job-post-review-value">{data.categoryName || 'N/A'}</div>
            </div>
          </div>

          {/* Budget & Timeline */}
          <div className="job-post-review-grid">
            <div className="job-post-review-section">
              <label className="job-post-review-label">Expected Budget</label>
              <div className="job-post-review-value">
                {data.budgetMax ? `${data.budgetMin} - ${data.budgetMax} GC` : (data.budgetMin ? `${data.budgetMin} GC` : 'N/A')}
              </div>
            </div>
            <div className="job-post-review-section">
              <label className="job-post-review-label">Estimated Duration</label>
              <div className="job-post-review-value">{data.estimatedDuration || 'N/A'}</div>
            </div>
          </div>

          {/* Skills */}
          <div className="job-post-review-section">
            <label className="job-post-review-label">
              <Wrench size={16} className="inline mr-1 text-primary-500" /> Required Skills
            </label>
            <div className="job-post-skills-flex">
              {data.skills.map((skill) => (
                <span key={skill.skillsId} className="job-post-skill-badge system">
                  {skill.name}
                </span>
              ))}
              {data.customSkills?.map((skill, idx) => (
                <span key={`custom-${idx}`} className="job-post-skill-badge custom">
                  {skill} (Custom)
                </span>
              ))}
              {data.skills.length === 0 && (!data.customSkills || data.customSkills.length === 0) && (
                <span className="text-gray-400 text-sm">No skills specified</span>
              )}
            </div>
          </div>

          <div className="job-post-review-section">
            <label className="job-post-review-label">Job Description</label>
            <div className="job-post-review-desc-container">
              <div className="job-post-review-desc-text whitespace-pre-line text-sm leading-6">
                {renderDescription(data.description)}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="job-post-modal-footer">
          <button type="button" className="job-post-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="job-post-btn-primary" onClick={onApprove}>
            <Check size={18} className="mr-2" />
            Approve & Prefill
          </button>
        </div>
      </div>
    </div>
  );
}
