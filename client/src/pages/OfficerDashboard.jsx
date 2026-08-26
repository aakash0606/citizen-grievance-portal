import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';

function OfficerDashboard() {
  const [grievances, setGrievances] = useState([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    fetchGrievances();
  }, []);

  const fetchGrievances = async () => {
    try {
      const res = await api.get('/grievances/department');
      setGrievances(res.data.grievances);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load grievances.');
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.patch(`/grievances/${id}/status`, { status: newStatus });
      fetchGrievances();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update status.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div style={{ maxWidth: '900px', margin: '40px auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Officer Dashboard - {user?.name}</h2>
        <button onClick={handleLogout}>Logout</button>
      </div>

      <hr style={{ margin: '20px 0' }} />

      <h3>All Grievances</h3>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {grievances.length === 0 ? (
        <p>No grievances found.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
              <th style={{ padding: '8px' }}>Title</th>
              <th style={{ padding: '8px' }}>Description</th>
              <th style={{ padding: '8px' }}>Category</th>
              <th style={{ padding: '8px' }}>Status</th>
              <th style={{ padding: '8px' }}>Update Status</th>
            </tr>
          </thead>
          <tbody>
            {grievances.map((g) => (
              <tr key={g.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '8px' }}>{g.title}</td>
                <td style={{ padding: '8px' }}>{g.description}</td>
                <td style={{ padding: '8px' }}>{g.category}</td>
                <td style={{ padding: '8px' }}>{g.status}</td>
                <td style={{ padding: '8px' }}>
                  <select
                    value={g.status}
                    onChange={(e) => handleStatusChange(g.id, e.target.value)}
                    style={{ padding: '5px' }}
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Escalated">Escalated</option>
                  </select>
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