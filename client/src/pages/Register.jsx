import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axiosConfig';
import '../theme.css';

function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('citizen');
  const [departmentId, setDepartmentId] = useState('');
  const [departments, setDepartments] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const isOfficer = role === 'officer';

  useEffect(() => {
    api.get('/departments').then((res) => setDepartments(res.data.departments)).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (isOfficer && !departmentId) {
      setError('Please select your department');
      return;
    }

    try {
      await api.post('/register', { name, email, password, role, department_id: departmentId || null });
      setSuccess('Account created! Redirecting to login...');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className={`auth-page theme-${isOfficer ? 'officer' : 'citizen'}`}>
      <div className="auth-card">
        <span className={`eyebrow ${isOfficer ? 'officer' : 'citizen'}`}>Create Account</span>
        <h2 className="auth-title">Register</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input type="text" className="form-input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" className="form-input" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">I am a...</label>
            <select className="form-select" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="citizen">Citizen</option>
              <option value="officer">Officer</option>
            </select>
          </div>

          {isOfficer && (
            <div className="form-group">
              <label className="form-label">Your Department</label>
              <select className="form-select" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} required>
                <option value="">-- Select your department --</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          )}

          {error && <p className="error-text">{error}</p>}
          {success && <p className="success-text">{success}</p>}
          <button type="submit" className={`btn btn-block ${isOfficer ? 'btn-officer' : 'btn-citizen'}`}>
            Register
          </button>
        </form>
        <p className="helper-text">
          Already have an account?{' '}
          <Link to="/login" className={isOfficer ? 'link-officer' : 'link-citizen'}>Login here</Link>
        </p>
        <p className="helper-text">
          <Link to="/" className={isOfficer ? 'link-officer' : 'link-citizen'}>← Back to home</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;