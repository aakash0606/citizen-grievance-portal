import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axiosConfig';
import '../theme.css';

function statusClass(status) {
  switch (status) {
    case 'Pending': return 'status-pending';
    case 'In Progress': return 'status-progress';
    case 'Resolved - Pending Confirmation': return 'status-confirm';
    case 'Closed': return 'status-closed';
    case 'Escalated': return 'status-escalated';
    case 'Reopened': return 'status-reopened';
    default: return '';
  }
}

function TrackGrievance() {
  const [grievanceId, setGrievanceId] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const res = await api.get(`/track/${grievanceId}`);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not find a grievance with that ID.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page theme-citizen" style={{ alignItems: 'flex-start', paddingTop: '60px' }}>
      <div className="auth-card" style={{ maxWidth: '520px' }}>
        <span className="eyebrow citizen">Public Access</span>
        <h2 className="auth-title">Track a Grievance</h2>
        <p style={{ fontSize: '14px', color: '#45564B', marginTop: '-14px', marginBottom: '20px' }}>
          Enter the grievance ID you received when filing to check its current status. No login required.
        </p>

        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <input
            type="number"
            className="form-input"
            placeholder="e.g. 4"
            value={grievanceId}
            onChange={(e) => setGrievanceId(e.target.value)}
            required
          />
          <button type="submit" className="btn btn-citizen" style={{ whiteSpace: 'nowrap' }}>
            {loading ? 'Searching...' : 'Track'}
          </button>
        </form>

        {error && <p className="error-text">{error}</p>}

        {result && (
          <div>
            <h3 style={{ marginBottom: '6px' }}>{result.grievance.title}</h3>
            <p style={{ fontSize: '13px', color: '#45564B', marginTop: 0 }}>
              {result.grievance.department_name} · {result.grievance.category}
              {result.grievance.priority === 'High' && <span className="priority-high">High Priority</span>}
            </p>
            <span className={`status-badge ${statusClass(result.grievance.status)}`}>{result.grievance.status}</span>

            <h4 style={{ marginTop: '24px' }}>Timeline</h4>
            {result.timeline.map((t, i) => (
              <div className="timeline-item" key={i}>
                <div className="timeline-status">{t.status}</div>
                {t.remark && <div className="timeline-remark">{t.remark}</div>}
                <div className="timeline-time">{new Date(t.changed_at).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}

        <p className="helper-text">
          <Link to="/" className="link-citizen">← Back to home</Link>
        </p>
      </div>
    </div>
  );
}

export default TrackGrievance;