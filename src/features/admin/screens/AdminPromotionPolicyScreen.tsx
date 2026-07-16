import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Sparkles } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { premiumClientAPI } from '../../premium/api/premiumClientAPI';
import '../styles/admin-dispute-management-screen.css';

export default function AdminPromotionPolicyScreen() {
  const [tokenCost, setTokenCost] = useState(10);
  const [durationDays, setDurationDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ error?: boolean; text: string } | null>(null);

  useEffect(() => {
    premiumClientAPI.getPromotionPolicy().then(response => {
      if (response.success && response.data) {
        setTokenCost(response.data.tokenCost);
        setDurationDays(response.data.durationDays);
      } else setMessage({ error: true, text: response.message || 'Unable to load promotion policy.' });
      setLoading(false);
    });
  }, []);

  const save = async () => {
    if (tokenCost <= 0 || durationDays < 1 || durationDays > 365) {
      setMessage({ error: true, text: 'Cost must be positive and duration must be between 1 and 365 days.' });
      return;
    }
    setSaving(true);
    const response = await premiumClientAPI.updatePromotionPolicy({ tokenCost, durationDays });
    setSaving(false);
    setMessage(response.success ? { text: 'Promotion policy updated.' } : { error: true, text: response.message || 'Unable to update promotion policy.' });
  };

  return <AppLayout><div className="admin-disputes-wrapper"><section className="disputes-hero"><div><p className="disputes-kicker">Premium Administration</p><h1>Job Promotion Policy</h1><p>Configure the token price and featured duration used by Premium Clients.</p></div><Sparkles size={34}/></section>{message && <div className={`dispute-admin-message ${message.error ? 'error' : 'success'}`}>{message.error ? <AlertCircle size={18}/> : <CheckCircle size={18}/>}<span>{message.text}</span></div>}<section className="dispute-detail-card" style={{maxWidth:640,marginTop:24}}><div className="dispute-detail-grid"><label><span>Token cost</span><input type="number" min="0.01" step="0.01" value={tokenCost} disabled={loading} onChange={event => setTokenCost(Number(event.target.value))}/></label><label><span>Duration (days)</span><input type="number" min="1" max="365" value={durationDays} disabled={loading} onChange={event => setDurationDays(Number(event.target.value))}/></label></div><button className="resolve-btn" disabled={loading || saving} onClick={save}>{saving ? 'Saving…' : 'Save promotion policy'}</button></section></div></AppLayout>;
}
