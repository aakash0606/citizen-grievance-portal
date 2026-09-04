import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axiosConfig';
import '../theme.css';

const TN_DISTRICTS = [
  'Ariyalur', 'Chengalpattu', 'Chennai', 'Coimbatore', 'Cuddalore', 'Dharmapuri',
  'Dindigul', 'Erode', 'Kallakurichi', 'Kanchipuram', 'Kanyakumari', 'Karur',
  'Krishnagiri', 'Madurai', 'Mayiladuthurai', 'Nagapattinam', 'Namakkal',
  'Nilgiris', 'Perambalur', 'Pudukkottai', 'Ramanathapuram', 'Ranipet',
  'Salem', 'Sivaganga', 'Tenkasi', 'Thanjavur', 'Theni', 'Thoothukudi',
  'Tiruchirappalli', 'Tirunelveli', 'Tirupathur', 'Tiruppur', 'Tiruvallur',
  'Tiruvannamalai', 'Tiruvarur', 'Vellore', 'Viluppuram', 'Virudhunagar',
];

function generateCaptcha() {
  const a = Math.floor(Math.random() * 12) + 5;
  const b = Math.floor(Math.random() * 9) + 2;
  return { a, b, answer: a + b };
}

function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('citizen');
  const [departmentId, setDepartmentId] = useState('');
  const [departments, setDepartments] = useState([]);
  const [district, setDistrict] = useState('');
  const [wardLocality, setWardLocality] = useState('');

  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [otpMessage, setOtpMessage] = useState('');
  const [otpError, setOtpError] = useState('');

  const [captcha, setCaptcha] = useState(generateCaptcha());
  const [captchaInput, setCaptchaInput] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const isOfficer = role === 'officer';

  useEffect(() => {
    api.get('/departments').then((res) => setDepartments(res.data.departments)).catch(() => {});
  }, []);

  const passwordChecks = {
    len: password.length >= 8,
    upper: /[A-Z]/.test(password),
    num: /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
  };

  const section1Done = name && emailVerified;
  const section2Done = isOfficer ? !!departmentId : true;
  const section3Done = Object.values(passwordChecks).every(Boolean) && password === confirmPassword && password.length > 0;
  const stepsDone = [section1Done, section2Done, section3Done].filter(Boolean).length;
  const progressPct = Math.round((stepsDone / 3) * 100);

  const handleSendOtp = async () => {
    setOtpError('');
    setOtpMessage('');
    if (!email) { setOtpError('Enter your email first'); return; }
    try {
      await api.post('/send-otp', { email });
      setOtpSent(true);
      setOtpMessage('OTP sent! Check your inbox (valid for 5 minutes).');
    } catch (err) {
      setOtpError(err.response?.data?.error || 'Failed to send OTP');
    }
  };

  const handleVerifyOtp = async () => {
    setOtpError('');
    try {
      await api.post('/verify-otp', { email, otp });
      setEmailVerified(true);
      setOtpMessage('Email verified successfully!');
    } catch (err) {
      setOtpError(err.response?.data?.error || 'Verification failed');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!emailVerified) { setError('Please verify your email with OTP first'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (!Object.values(passwordChecks).every(Boolean)) { setError('Password does not meet all requirements'); return; }
    if (isOfficer && !departmentId) { setError('Please select your department'); return; }
    if (parseInt(captchaInput) !== captcha.answer) {
      setError('Incorrect CAPTCHA answer');
      setCaptcha(generateCaptcha());
      setCaptchaInput('');
      return;
    }
    try {
      await api.post('/register', {
        name, email, password, role,
        department_id: departmentId || null,
        district: district || null,
        ward_locality: wardLocality || null,
      });
      setSuccess('Account created! Redirecting to login...');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    }
  };

  const Check = ({ ok, label }) => (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px',
      borderRadius: '4px', fontSize: '11px', marginRight: '6px', marginBottom: '4px',
      background: ok ? '#D9EAD9' : '#eee', color: ok ? '#2F6B4F' : '#888',
    }}>
      {ok ? '✓' : '○'} {label}
    </span>
  );

  return (
    <div className="split-page">
      <div className={`info-panel ${isOfficer ? 'theme-officer-panel' : ''}`}>
        <div className="info-badge-row">
          <div className="info-emblem">GRP</div>
          <div>
            <span className="info-eyebrow">{isOfficer ? 'Department Directorate' : 'Public Redressal Directorate'}</span>
            <h2 className="info-title">{isOfficer ? 'Register as a Department Official' : 'Create Your Verified Citizen Profile'}</h2>
          </div>
        </div>

        <p className="info-desc">
          {isOfficer
            ? 'Register once to manage grievances for your department, with mandatory remarks and photo proof on every resolution.'
            : 'Register once to access dispute resolution across 14 Tamil Nadu civic bodies and departments, with real tracking and accountability.'}
        </p>

        <div className="why-box">
          <h4>Why Register?</h4>
          <ul>
            <li>File and route grievances directly to the right department, verified by email OTP.</li>
            <li>Track your complaint's full status history in real time.</li>
            <li>Confirm or reopen a resolution before it's marked closed — your word matters.</li>
          </ul>
        </div>

        <span className="steps-label">Standard Onboarding Procedure</span>
        <div className="step-item">
          <div className={`step-num ${section1Done ? 'active' : ''}`}>1</div>
          <div>
            <p className="step-title">Identity & Email Verification</p>
            <p className="step-desc">Instant OTP sent to your real email address.</p>
          </div>
        </div>
        <div className="step-item">
          <div className={`step-num ${section2Done ? 'active' : ''}`}>2</div>
          <div>
            <p className="step-title">{isOfficer ? 'Department Assignment' : 'Jurisdiction & Locality'}</p>
            <p className="step-desc">{isOfficer ? 'Scopes your dashboard to your department only.' : 'Ensures grievances route to your local officer.'}</p>
          </div>
        </div>
        <div className="step-item">
          <div className={`step-num ${section3Done ? 'active' : ''}`}>3</div>
          <div>
            <p className="step-title">Credential & Consent</p>
            <p className="step-desc">Password strength check and bot-protection.</p>
          </div>
        </div>

        <div className="privacy-note">
          <strong>Privacy note:</strong> Your email is used only for OTP verification and login. Passwords are encrypted and never stored in plain text.
        </div>

        <div className="info-signin">
          <span>Already registered?</span>
          <Link to="/login">Sign in here →</Link>
        </div>
      </div>

      <div className="form-panel">
        <div className="form-panel-header">
          <div className="form-panel-top-row">
            <h3 className="form-panel-title">{isOfficer ? 'Official Registration Form' : 'Citizen Registration Form'}</h3>
            <span className="progress-badge">Step {Math.max(stepsDone, 1)} of 3</span>
          </div>
          <p className="form-panel-sub">Fields marked with * are mandatory.</p>
          <div className="progress-track"><div className="progress-fill" style={{ width: `${progressPct}%` }} /></div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="section-header">
            <div className="section-num">1</div>
            <h4>Personal Particulars</h4>
          </div>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input type="text" className="form-input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="form-group">
            <label className="form-label">Email *</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="email" className="form-input" value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailVerified(false); setOtpSent(false); }}
                required disabled={emailVerified}
              />
              {!emailVerified && (
                <button type="button" className="btn btn-citizen" style={{ whiteSpace: 'nowrap', padding: '10px 14px' }} onClick={handleSendOtp}>
                  {otpSent ? 'Resend' : 'Verify via OTP'}
                </button>
              )}
            </div>
          </div>

          {otpSent && !emailVerified && (
            <div className="form-group">
              <label className="form-label">Enter OTP</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="text" className="form-input" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="6-digit code" />
                <button type="button" className="btn btn-citizen" style={{ whiteSpace: 'nowrap', padding: '10px 14px' }} onClick={handleVerifyOtp}>
                  Verify
                </button>
              </div>
            </div>
          )}
          {emailVerified && <p className="success-text">✓ Email verified</p>}
          {otpMessage && !emailVerified && <p className="success-text">{otpMessage}</p>}
          {otpError && <p className="error-text">{otpError}</p>}

          <div className="form-group">
            <label className="form-label">I am a...</label>
            <select className="form-select" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="citizen">Citizen</option>
              <option value="officer">Officer</option>
            </select>
          </div>

          <div className="section-header">
            <div className="section-num">2</div>
            <h4>{isOfficer ? 'Department Assignment' : 'Jurisdiction & Locality'}</h4>
          </div>

          {isOfficer ? (
            <div className="form-group">
              <label className="form-label">Your Department *</label>
              <select className="form-select" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} required>
                <option value="">-- Select your department --</option>
                {departments.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
              </select>
            </div>
          ) : (
            <>
              <div className="form-group">
                <label className="form-label">District</label>
                <select className="form-select" value={district} onChange={(e) => setDistrict(e.target.value)}>
                  <option value="">-- Select district (optional) --</option>
                  {TN_DISTRICTS.map((d) => (<option key={d} value={d}>{d}</option>))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Ward / Locality</label>
                <input type="text" className="form-input" value={wardLocality} onChange={(e) => setWardLocality(e.target.value)} placeholder="e.g. Ward 12, T Nagar" />
              </div>
            </>
          )}

          <div className="section-header">
            <div className="section-num">3</div>
            <h4>Account Security</h4>
          </div>
          <div className="form-group">
            <label className="form-label">Create Password *</label>
            <input type="password" className="form-input" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <div style={{ marginTop: '8px' }}>
              <Check ok={passwordChecks.len} label="8+ characters" />
              <Check ok={passwordChecks.upper} label="Uppercase" />
              <Check ok={passwordChecks.num} label="Number" />
              <Check ok={passwordChecks.special} label="Special char" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Confirm Password *</label>
            <input type="password" className="form-input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          </div>

          <div className="form-group">
            <label className="form-label">Security Check: What is {captcha.a} + {captcha.b}? *</label>
            <input type="number" className="form-input" value={captchaInput} onChange={(e) => setCaptchaInput(e.target.value)} required />
          </div>

          {error && <p className="error-text">{error}</p>}
          {success && <p className="success-text">{success}</p>}
          <button type="submit" className={`btn btn-block ${isOfficer ? 'btn-officer' : 'btn-citizen'}`} style={{ marginTop: '10px' }}>
            Complete Registration & Send Verification
          </button>
        </form>

        <p className="helper-text">
          <Link to="/" className={isOfficer ? 'link-officer' : 'link-citizen'}>← Back to home</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;