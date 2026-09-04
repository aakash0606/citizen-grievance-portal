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
    <div className="split-page">
      <div className={`info-panel ${isOfficer ? 'theme-officer-panel' : ''}`}>
        <div className="info-badge-row">
          <div className="info-emblem">GRP</div>
          <div>
            <span className="info-eyebrow">{isOfficer ? 'Department Access' : 'Public Access'}</span>
            <h2 className="info-title">{isOfficer ? 'Official Portal Sign In' : 'Citizen Portal Sign In'}</h2>
          </div>
        </div>

        <p className="info-desc">
          {isOfficer
            ? 'Sign in to view and manage grievances assigned to your department, with mandatory remarks and photo proof on every resolution.'
            : 'Sign in to file new grievances, track existing ones in real time, and confirm when an issue is genuinely resolved.'}
        </p>

        <div className="why-box">
          <h4>{isOfficer ? 'On this dashboard' : 'What you can do'}</h4>
          <ul>
            {isOfficer ? (
              <>
                <li>See only grievances filed against your own department.</li>
                <li>Update status with a required remark and photo proof.</li>
                <li>Track average resolution time across your queue.</li>
              </>
            ) : (
              <>
                <li>File a grievance with a photo, routed to the right department.</li>
                <li>Watch its full status timeline update in real time.</li>
                <li>Confirm resolution — or reopen it if it isn't actually fixed.</li>
              </>
            )}
          </ul>
        </div>

        <div className="privacy-note">
          <strong>Security note:</strong> Your session is authenticated with an encrypted token. Passwords are never stored in plain text.
        </div>

        <div className="info-signin">
          <span>New here?</span>
          <Link to="/register">Create an account →</Link>
        </div>
      </div>

      <div className="form-panel" style={{ maxWidth: '440px' }}>
        <div className="form-panel-header">
          <div className="form-panel-top-row">
            <h3 className="form-panel-title">{isOfficer ? 'Official Login' : 'Citizen Login'}</h3>
          </div>
          <p className="form-panel-sub">Enter your registered email and password.</p>
        </div>

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