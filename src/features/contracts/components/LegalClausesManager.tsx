import { useState, useEffect } from 'react';
import { AlertCircle, Check, Copy, Eye, EyeOff, Lock, Zap } from 'lucide-react';
import type { Contract } from '../../../types/models/Contract';
import '../styles/legal-clauses-manager.css';

interface LegalClause {
  id: string;
  title: string;
  content: string;
  type: 'nda' | 'ip' | 'custom';
  isAutomated: boolean;
  isPremiumOnly?: boolean;
}

interface LegalClausesManagerProps {
  contract: Contract;
  isPremium: boolean;
  onClausesSelected?: (clauses: LegalClause[]) => void;
  readOnly?: boolean;
}

// Default NDA template
const NDA_CLAUSE: LegalClause = {
  id: 'nda-01',
  title: 'Non-Disclosure Agreement (NDA)',
  content: `CONFIDENTIALITY AND NON-DISCLOSURE

1. Definition of Confidential Information
Confidential Information means all information disclosed by either party relating to the Services, including but not limited to technical data, business plans, software, specifications, and any other proprietary information.

2. Obligations
The receiving party agrees to:
- Keep all Confidential Information strictly confidential
- Use the information solely for performing the Services
- Limit access to authorized personnel only
- Implement reasonable security measures to protect the information

3. Permitted Disclosures
The receiving party may disclose Confidential Information when:
- Required by law or court order (with prior notice to the disclosing party)
- Necessary for professional advisors under confidentiality obligations
- Publicly available through no breach of this agreement

4. Duration
The confidentiality obligations shall survive for a period of 2 years after project completion.

5. Return of Information
Upon project completion or termination, all Confidential Information must be returned or destroyed as requested.`,
  type: 'nda',
  isAutomated: true,
  isPremiumOnly: false,
};

// Default IP Protection clause
const IP_CLAUSE: LegalClause = {
  id: 'ip-01',
  title: 'Intellectual Property Protection',
  content: `INTELLECTUAL PROPERTY RIGHTS

1. Work Product Ownership
All work product, deliverables, and intellectual property created during the Services shall be owned exclusively by the Client upon full payment.

2. Client Materials
The Client retains all rights to pre-existing materials and intellectual property provided to the Freelancer.

3. Pre-existing IP
The Freelancer retains ownership of any pre-existing intellectual property, tools, processes, or materials not specifically created for this project.

4. License Grant
The Freelancer grants the Client a perpetual, worldwide, royalty-free license to use the work product for any lawful purpose.

5. Moral Rights Waiver
To the extent permitted by law, the Freelancer waives any moral rights to the work product.

6. Third-Party Components
The Freelancer warrants that any third-party components used are properly licensed and that their use does not infringe on any intellectual property rights.

7. Infringement Indemnity
The Freelancer indemnifies the Client against claims that the work product infringes third-party intellectual property rights.`,
  type: 'ip',
  isAutomated: true,
  isPremiumOnly: true, // Premium feature
};

export function LegalClausesManager({
  contract,
  isPremium,
  onClausesSelected,
  readOnly = false,
}: LegalClausesManagerProps) {
  const [selectedClauses, setSelectedClauses] = useState<string[]>(['nda-01']);
  const [showPreview, setShowPreview] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [watermarkEnabled, setWatermarkEnabled] = useState(true);

  // Notify parent when clauses change
  useEffect(() => {
    if (onClausesSelected) {
      const clauses = getSelectedClauses();
      onClausesSelected(clauses);
    }
  }, [selectedClauses]);

  const getAvailableClauses = (): LegalClause[] => {
    const clauses = [NDA_CLAUSE];
    
    // Only show IP clause if user is Premium
    if (isPremium) {
      clauses.push(IP_CLAUSE);
    }
    
    return clauses;
  };

  const getSelectedClauses = (): LegalClause[] => {
    return getAvailableClauses().filter(c => selectedClauses.includes(c.id));
  };

  const toggleClause = (clauseId: string) => {
    setSelectedClauses(prev =>
      prev.includes(clauseId)
        ? prev.filter(id => id !== clauseId)
        : [...prev, clauseId]
    );
  };

  const copyClauseToClipboard = (clause: LegalClause) => {
    navigator.clipboard.writeText(clause.content);
    setCopySuccess(clause.id);
    setTimeout(() => setCopySuccess(null), 2000);
  };

  const getWatermarkedContent = (content: string): string => {
    if (!watermarkEnabled) return content;
    
    const today = new Date().toLocaleDateString();
    const watermark = `\n\n[WATERMARK: Premium Legal Protection - Generated for ${contract.title} on ${today}]`;
    return content + watermark;
  };

  return (
    <div className="legal-clauses-manager">
      {/* Header */}
      <div className="lcm-header">
        <div className="lcm-title-section">
          <h3 className="lcm-title">Legal Clauses & Protections</h3>
          {isPremium && (
            <div className="premium-badge">
              <Zap size={16} />
              Premium
            </div>
          )}
        </div>
        <p className="lcm-subtitle">
          Automatically included for Premium clients - Protects both parties legally
        </p>
      </div>

      {/* Premium Feature Notice */}
      {!isPremium && (
        <div className="premium-notice">
          <AlertCircle size={18} />
          <div className="notice-content">
            <p className="notice-title">Premium Feature</p>
            <p className="notice-text">
              IP Protection clauses are available for Premium subscribers. Upgrade to add comprehensive intellectual property protections.
            </p>
          </div>
        </div>
      )}

      {/* Available Clauses */}
      <div className="lcm-clauses">
        {getAvailableClauses().map(clause => (
          <div
            key={clause.id}
            className={`clause-card ${selectedClauses.includes(clause.id) ? 'selected' : ''}`}
          >
            {/* Header */}
            <div className="clause-header">
              <div className="clause-info">
                <label className="clause-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedClauses.includes(clause.id)}
                    onChange={() => toggleClause(clause.id)}
                    disabled={readOnly || (clause.isPremiumOnly && !isPremium)}
                  />
                  <span className="checkbox-mark"></span>
                </label>
                <div className="clause-title-section">
                  <h4 className="clause-title">{clause.title}</h4>
                  <div className="clause-badges">
                    {clause.isAutomated && (
                      <span className="badge badge-auto">
                        <Zap size={12} />
                        Auto-inserted
                      </span>
                    )}
                    {clause.isPremiumOnly && (
                      <span className="badge badge-premium">
                        <Lock size={12} />
                        Premium
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="clause-actions">
                <button
                  onClick={() => setShowPreview(showPreview === clause.id ? null : clause.id)}
                  className="action-btn action-preview"
                  title="Preview clause"
                >
                  {showPreview === clause.id ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>

                {selectedClauses.includes(clause.id) && (
                  <button
                    onClick={() => copyClauseToClipboard(clause)}
                    className="action-btn action-copy"
                    title="Copy to clipboard"
                  >
                    {copySuccess === clause.id ? (
                      <Check size={18} />
                    ) : (
                      <Copy size={18} />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Preview */}
            {showPreview === clause.id && (
              <div className="clause-preview">
                <div className="preview-content">
                  {clause.content}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Watermarking Option */}
      {isPremium && selectedClauses.length > 0 && (
        <div className="watermark-option">
          <label className="watermark-checkbox">
            <input
              type="checkbox"
              checked={watermarkEnabled}
              onChange={(e) => setWatermarkEnabled(e.target.checked)}
            />
            <span className="checkbox-mark"></span>
            <span className="checkbox-label">
              Add Premium watermark to contract
            </span>
          </label>
          <p className="watermark-hint">
            Marks the contract as Premium legal protection
          </p>
        </div>
      )}

      {/* Selected Clauses Summary */}
      {selectedClauses.length > 0 && (
        <div className="clauses-summary">
          <h4 className="summary-title">Selected Clauses ({selectedClauses.length})</h4>
          <div className="summary-items">
            {getSelectedClauses().map(clause => (
              <div key={clause.id} className="summary-item">
                <Check size={16} className="check-icon" />
                <span>{clause.title}</span>
              </div>
            ))}
          </div>
          <p className="summary-note">
            These clauses will be automatically inserted into the contract PDF upon generation.
          </p>
        </div>
      )}

      {/* Info Box */}
      <div className="info-box">
        <AlertCircle size={18} />
        <div className="info-content">
          <p className="info-title">Legal Protection Benefits</p>
          <ul className="info-list">
            <li>NDA protects sensitive business information</li>
            <li>IP clauses ensure clear ownership of deliverables</li>
            <li>Legally binding protections for both parties</li>
            <li>Professional documentation and compliance</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default LegalClausesManager;
