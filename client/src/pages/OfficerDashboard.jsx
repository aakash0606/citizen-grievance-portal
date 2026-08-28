import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import '../theme.css';

const SERVER_URL = 'http://localhost:5000';

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

function OfficerDashboard() {
  const [grievances, setGrievances] = useState([]);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [remark, setRemark] = useState('');
  const [resolutionImage, setResolutionImage] = useState(null);
  const [formError, setFormError] = useState('');
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

  const closeEditor = () => {
    setEditingId(null);
    setRemark('');
    setResolutionImage(null);
    setFormError('');
  };

  const submitUpdate = async (id) => {
    setFormError('');
    if (!remark.trim()) {
      setFormError('A remark is required.');
      return;
    }
    if (newStatus === 'Resolved - Pending Confirmation' && !resolutionImage) {
      setFormError('A photo proof is required to mark this Resolved.');
      return;
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
    Reopened: grievances.filter((g) => g.status === 'Reopened').length,
  };

  return (
    <div className="dash-page theme-officer">
      <div className="dash-header">
        <div>
          <span className="dash-eyebrow" style={{ color: '#B8863B' }}>Department Access</span>
          <h2 className="dash-title">Officer Dashboard — {user?.name}</h2>
        </div>
        <button className="btn-logout" onClick={handleLogout}>Logout</button>
      </div>

      <div className="stats-row" style={{ marginTop: '24px' }}>
        <div className="stat-chip"><span className="num">{counts.Pending}</span><span className="label">Pending</span></div>
        <div className="stat-chip"><span className="num">{counts['In Progress']}</span><span className="label">In Progress</span></div>
        <div className="stat-chip"><span className="num">{counts['Awaiting Confirmation']}</span><span className="label">Awaiting Confirm</span></div>
        <div className="stat-chip"><span className="num">{counts.Closed}</span><span className="label">Closed</span></div>
        <div className="stat-chip"><span className="num">{counts.Reopened}</span><span className="label">Reopened</span></div>
      </div>

      <h3 className="section-title">Grievances in Your Department</h3>
      {error && <p className="error-text">{error}</p>}

      {grievances.length === 0 ? (
        <div className="card-block empty-state">No grievances found for your department.</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Photo</th>
              <th>Title</th>
              <th>Description</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {grievances.map((g) => (
              <tr key={g.id}>
                <td>
                  {g.image_url ? (
                    <img
                      src={`${SERVER_URL}${g.image_url}`}
                      alt="Complaint"
                      className="thumb"
                      onClick={() => window.open(`${SERVER_URL}${g.image_url}`, '_blank')}
                    />
                  ) : '—'}
                </td>
                <td>{g.title}</td>
                <td>{g.description}</td>
                <td><span className={`status-badge ${statusClass(g.status)}`}>{g.status}</span></td>
                <td>
                  {editingId === g.id ? (
                    <div style={{ minWidth: '220px' }}>
                      <select
                        className="form-select"
                        style={{ padding: '6px 8px', fontSize: '13px', marginBottom: '6px' }}
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                      >
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved - Pending Confirmation">Resolved</option>
                        <option value="Escalated">Escalated</option>
                      </select>
                      <textarea
                        className="form-textarea"
                        placeholder="Remark (required)"
                        rows={2}
                        style={{ fontSize: '13px', marginBottom: '6px' }}
                        value={remark}
                        onChange={(e) => setRemark(e.target.value)}
                      />
                      {newStatus === 'Resolved - Pending Confirmation' && (
                        <input
                          type="file"
                          accept="image/*"
                          style={{ marginBottom: '6px', fontSize: '12px' }}
                          onChange={(e) => setResolutionImage(e.target.files[0])}
                        />
                      )}
                      {formError && <p className="error-text" style={{ fontSize: '12px' }}>{formError}</p>}
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn-small btn-confirm" onClick={() => submitUpdate(g.id)}>Save</button>
                        <button className="btn-small" style={{ background: '#ccc' }} onClick={closeEditor}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button className="btn-small btn-confirm" onClick={() => openEditor(g)}>Update</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default OfficerDashboard;