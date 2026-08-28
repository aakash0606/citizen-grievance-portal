import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import api from '../api/axiosConfig';
import '../theme.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const portal = searchParams.get('portal');
  const isOfficer = portal === 'officer';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await api.post('/login', { email, password });
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      navigate(user.role === 'officer' || user.role === 'admin' ? '/officer-dashboard' : '/citizen-dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    }
  };

  return (
    <div className={`auth-page theme-${isOfficer ? 'officer' : 'citizen'}`}>
      <div className="auth-card">
        <span className={`eyebrow ${isOfficer ? 'officer' : 'citizen'}`}>
          {isOfficer ? 'Department Access' : portal === 'citizen' ? 'Public Access' : 'Login'}
        </span>
        <h2 className="auth-title">
          {isOfficer ? 'Official Portal Login' : portal === 'citizen' ? 'Citizen Portal Login' : 'Login'}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" className="form-input" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button type="submit" className={`btn btn-block ${isOfficer ? 'btn-officer' : 'btn-citizen'}`}>
            Login
          </button>
        </form>
        <p className="helper-text">
          Don't have an account?{' '}
          <Link to="/register" className={isOfficer ? 'link-officer' : 'link-citizen'}>Register here</Link>
        </p>
        <p className="helper-text">
          <Link to="/" className={isOfficer ? 'link-officer' : 'link-citizen'}>← Back to home</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;