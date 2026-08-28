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

function CitizenDashboard() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [departments, setDepartments] = useState([]);
  const [image, setImage] = useState(null);
  const [grievances, setGrievances] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    fetchGrievances();
    api.get('/departments').then((res) => setDepartments(res.data.departments)).catch(() => {});
  }, []);

  const fetchGrievances = async () => {
    try {
      const res = await api.get('/grievances/mine');
      setGrievances(res.data.grievances);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!departmentId) {
      setError('Please select a department');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('department_id', departmentId);
      if (image) formData.append('image', image);

      await api.post('/grievances', formData);
      setMessage('Grievance filed successfully!');
      setTitle('');
      setDescription('');
      setDepartmentId('');
      setImage(null);
      fetchGrievances();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to file grievance.');
    }
  };

  const handleConfirm = async (id) => {
    try {
      await api.patch(`/grievances/${id}/confirm`);
      fetchGrievances();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to confirm.');
    }
  };

  const handleReopen = async (id) => {
    const remark = window.prompt('What is still wrong with this? (optional)') || '';
    try {
      await api.patch(`/grievances/${id}/reopen`, { remark });
      fetchGrievances();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reopen.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="dash-page theme-citizen">
      <div className="dash-header">
        <div>
          <span className="dash-eyebrow">Public Access</span>
          <h2 className="dash-title">Welcome, {user?.name}</h2>
        </div>
        <button className="btn-logout" onClick={handleLogout}>Logout</button>
      </div>

      <h3 className="section-title">File a New Grievance</h3>
      <div className="card-block">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Title</label>
            <input type="text" className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Department</label>
            <select className="form-select" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} required>
              <option value="">-- Select department --</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Photo of the issue (optional)</label>
            <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files[0])} />
          </div>
          {error && <p className="error-text">{error}</p>}
          {message && <p className="success-text">{message}</p>}
          <button type="submit" className="btn btn-citizen">Submit Grievance</button>
        </form>
      </div>

      <h3 className="section-title">Your Grievances</h3>
      {grievances.length === 0 ? (
        <div className="card-block empty-state">You haven't filed any grievances yet.</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Photo</th>
              <th>Title</th>
              <th>Department</th>
              <th>Status</th>
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
                <td>{g.department_name}</td>
                <td>
                  <span className={`status-badge ${statusClass(g.status)}`}>{g.status}</span>
                  {g.status === 'Resolved - Pending Confirmation' && (
                    <div className="confirm-btns">
                      <button className="btn-small btn-confirm" onClick={() => handleConfirm(g.id)}>Confirm Resolved</button>
                      <button className="btn-small btn-reopen" onClick={() => handleReopen(g.id)}>Not Fixed</button>
                    </div>
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

export default CitizenDashboard;