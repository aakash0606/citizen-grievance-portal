import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import '../theme.css';

const SERVER_URL = 'http://localhost:5000';
const ESCALATE_DAYS = 3;
const PAGE_SIZE = 5;

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

function slaInfo(g) {
  const deadline = new Date(g.created_at).getTime() + ESCALATE_DAYS * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const remainingMs = deadline - now;
  const totalMs = ESCALATE_DAYS * 24 * 60 * 60 * 1000;
  const elapsedPct = Math.min(100, Math.max(0, ((totalMs - remainingMs) / totalMs) * 100));

  if (['Closed', 'Resolved - Pending Confirmation'].includes(g.status)) {
    return { text: 'Resolved', className: 'sla-ok', pct: 100, color: '#3F9C6E' };
  }
  if (remainingMs <= 0) {
    return { text: 'Overdue', className: 'sla-overdue', pct: 100, color: '#D14B4B' };
  }
  const hours = Math.floor(remainingMs / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  const text = days >= 1 ? `${days}d ${hours % 24}h left` : `${hours}h left`;
  const color = elapsedPct > 75 ? '#D14B4B' : elapsedPct > 45 ? '#E0A94A' : '#3F9C6E';
  return { text, className: 'sla-ok', pct: elapsedPct, color };
}

function downloadCSV(rows) {
  const headers = ['ID', 'Title', 'Category', 'Priority', 'Status', 'Filed On'];
  const csvRows = [headers.join(',')];
  rows.forEach((g) => {
    csvRows.push([
      g.id, `"${g.title.replace(/"/g, '""')}"`, g.category, g.priority, g.status,
      new Date(g.created_at).toLocaleDateString(),
    ].join(','));
  });
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'grievances_export.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function OfficerDashboard() {
  const [grievances, setGrievances] = useState([]);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [remark, setRemark] = useState('');
  const [resolutionImage, setResolutionImage] = useState(null);
  const [formError, setFormError] = useState('');
  const [timelineData, setTimelineData] = useState(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [page, setPage] = useState(1);

  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => { fetchGrievances(); }, []);

  const fetchGrievances = async () => {
    try {
      const res = await api.get('/grievances/department');
      setGrievances(res.data.grievances);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load grievances.');
    }
  };

  const openEditor = (g) => {
    setEditingId(g.id);
    setNewStatus(g.status === 'Reopened' ? 'In Progress' : g.status);
    setRemark('');
    setResolutionImage(null);
    setFormError('');
  };
  const closeEditor = () => { setEditingId(null); setRemark(''); setResolutionImage(null); setFormError(''); };

  const submitUpdate = async (id) => {
    setFormError('');
    if (!remark.trim()) { setFormError('A remark is required.'); return; }
    if (newStatus === 'Resolved - Pending Confirmation' && !resolutionImage) {
      setFormError('A photo proof is required to mark this Resolved.'); return;
    }
    try {
      const formData = new FormData();
      formData.append('status', newStatus);
      formData.append('remark', remark);
      if (resolutionImage) formData.append('resolutionImage', resolutionImage);
      await api.patch(`/grievances/${id}/status`, formData);
      closeEditor();
      fetchGrievances();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to update status.');
    }
  };

  const viewTimeline = async (id) => {
    try {
      const res = await api.get(`/grievances/${id}`);
      setTimelineData(res.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to load timeline.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const counts = {
    Pending: grievances.filter((g) => g.status === 'Pending').length,
    'In Progress': grievances.filter((g) => g.status === 'In Progress').length,
    'Awaiting Confirmation': grievances.filter((g) => g.status === 'Resolved - Pending Confirmation').length,
    Closed: grievances.filter((g) => g.status === 'Closed').length,
    Escalated: grievances.filter((g) => g.status === 'Escalated').length,
  };

  const categories = ['All', ...new Set(grievances.map((g) => g.category))];

  const filtered = grievances.filter((g) => {
    if (search && !(g.title.toLowerCase().includes(search.toLowerCase()) || String(g.id).includes(search))) return false;
    if (statusFilter !== 'All' && g.status !== statusFilter) return false;
    if (priorityFilter !== 'All' && g.priority !== priorityFilter) return false;
    if (categoryFilter !== 'All' && g.category !== categoryFilter) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div style={{ background: '#fff', minHeight: '100vh' }}>
      <div className="off-topbar">
        <button className="off-back-btn" onClick={() => navigate('/')}>← Back to Portal</button>
        <div className="off-brand">
          <div className="off-brand-icon">GRP</div>
          <div>
            <p className="off-brand-title">Grievance Redressal Portal</p>
            <p className="off-brand-sub">Department Administration Gateway</p>
          </div>
        </div>
        <div className="off-user">
          <div>
            <p className="off-user-name">{user?.name}</p>
            <p className="off-user-dept">Department Officer</p>
          </div>
          <button className="off-logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      <div className="off-hero">
        <span className="off-eyebrow">DEPARTMENT ACCESS</span>
        <h1 className="off-hero-title">Officer Dashboard</h1>
        <p className="off-hero-meta">{grievances.length} total cases in your department · Session Active</p>
      </div>

      <div className="off-stats-row">
        <div className="off-stat-card c-pending">
          <div className="off-stat-num">{counts.Pending}</div>
          <div className="off-stat-label">Pending</div>
          <div className="off-stat-note">Awaiting first action</div>
        </div>
        <div className="off-stat-card c-progress">
          <div className="off-stat-num">{counts['In Progress']}</div>
          <div className="off-stat-label">In Progress</div>
          <div className="off-stat-note">Being worked on</div>
        </div>
        <div className="off-stat-card c-confirm">
          <div className="off-stat-num">{counts['Awaiting Confirmation']}</div>
          <div className="off-stat-label">Awaiting Confirm</div>
          <div className="off-stat-note">Citizen sign-off pending</div>
        </div>
        <div className="off-stat-card c-closed">
          <div className="off-stat-num">{counts.Closed}</div>
          <div className="off-stat-label">Closed</div>
          <div className="off-stat-note">Fully resolved</div>
        </div>
        <div className="off-stat-card c-escalated">
          <div className="off-stat-num">{counts.Escalated}</div>
          <div className="off-stat-label">Escalated</div>
          <div className="off-stat-note">Exceeded response time</div>
        </div>
      </div>

      <div className="off-section">
        <h2 className="off-section-title">Grievances in Your Department</h2>
        <p className="off-section-sub">Sorted by priority — High priority complaints appear first.</p>

        <div className="off-filter-bar">
          <input
            className="off-search" placeholder="Search by ID or title..."
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          <select className="off-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved - Pending Confirmation">Resolved (Awaiting Confirm)</option>
            <option value="Closed">Closed</option>
            <option value="Escalated">Escalated</option>
            <option value="Reopened">Reopened</option>
          </select>
          <select className="off-select" value={priorityFilter} onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}>
            <option value="All">All Priorities</option>
            <option value="High">High</option>
            <option value="Normal">Normal</option>
          </select>
          <button className="off-export-btn" onClick={() => downloadCSV(filtered)}>⬇ Export CSV</button>
        </div>

        <div className="off-pills">
          {categories.map((c) => (
            <button
              key={c} className={`off-pill ${categoryFilter === c ? 'active' : ''}`}
              onClick={() => { setCategoryFilter(c); setPage(1); }}
            >
              {c} ({c === 'All' ? grievances.length : grievances.filter((g) => g.category === c).length})
            </button>
          ))}
        </div>

        {error && <p className="error-text">{error}</p>}

        {pageItems.length === 0 ? (
          <div className="card-block empty-state">No grievances match your filters.</div>
        ) : (
          <table className="off-table">
            <thead>
              <tr>
                <th>Grievance Details</th>
                <th>Priority</th>
                <th>Complainant</th>
                <th>SLA Clock</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((g) => {
                const sla = slaInfo(g);
                return (
                  <tr key={g.id}>
                    <td>
                      <span className="off-gid">GRP-{String(g.id).padStart(4, '0')}</span>
                      <span className="off-gcat">{g.category}</span>
                      <div className="off-gtitle">{g.title}</div>
                      <div className="off-gmeta">Filed {new Date(g.created_at).toLocaleDateString()}</div>
                    </td>
                    <td>
                      <span className={`pri-badge ${g.priority === 'High' ? 'pri-critical' : 'pri-normal'}`}>{g.priority}</span>
                    </td>
                    <td>Citizen #{g.citizen_id}</td>
                    <td>
                      <div className={`sla-text ${sla.className}`}>{sla.text}</div>
                      <div className="sla-track"><div className="sla-fill" style={{ width: `${sla.pct}%`, background: sla.color }} /></div>
                    </td>
                    <td>
                      <span className={`status-badge ${statusClass(g.status)}`}>{g.status}</span>
                    </td>
                    <td>
                      {editingId === g.id ? (
                        <div style={{ minWidth: '220px' }}>
                          <select className="form-select" style={{ padding: '6px 8px', fontSize: '13px', marginBottom: '6px' }}
                            value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                            <option value="Pending">Pending</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Resolved - Pending Confirmation">Resolved</option>
                            <option value="Escalated">Escalated</option>
                          </select>
                          <textarea className="form-textarea" placeholder="Remark (required)" rows={2}
                            style={{ fontSize: '13px', marginBottom: '6px' }} value={remark} onChange={(e) => setRemark(e.target.value)} />
                          {newStatus === 'Resolved - Pending Confirmation' && (
                            <input type="file" accept="image/*" style={{ marginBottom: '6px', fontSize: '12px' }}
                              onChange={(e) => setResolutionImage(e.target.files[0])} />
                          )}
                          {formError && <p className="error-text" style={{ fontSize: '12px' }}>{formError}</p>}
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button className="off-action-btn" onClick={() => submitUpdate(g.id)}>Save</button>
                            <button className="off-eye-btn" onClick={closeEditor}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <button className="off-action-btn" onClick={() => openEditor(g)}>Update</button>
                          <button className="off-eye-btn" title="View timeline" onClick={() => viewTimeline(g.id)}>👁</button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <div className="off-pagination">
          <button className="off-page-btn" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <button key={n} className={`off-page-btn ${page === n ? 'active' : ''}`} onClick={() => setPage(n)}>{n}</button>
          ))}
          <button className="off-page-btn" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      </div>

      <div className="off-footer">
        <span>Public Grievance Redressal Portal · Authorized Officer Interface</span>
        <span>Department: {grievances[0]?.department_id ? `#${grievances[0].department_id}` : '—'}</span>
      </div>

      {timelineData && (
        <div className="modal-overlay" onClick={() => setTimelineData(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>{timelineData.grievance.title}</h3>
            {timelineData.timeline.map((t, i) => (
              <div className="timeline-item" key={i}>
                <div className="timeline-status">{t.status}</div>
                {t.remark && <div className="timeline-remark">{t.remark}</div>}
                <div className="timeline-time">{new Date(t.changed_at).toLocaleString()}</div>
              </div>
            ))}
            <button className="btn-close-modal" onClick={() => setTimelineData(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default OfficerDashboard;