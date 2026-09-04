import { useNavigate, Link } from 'react-router-dom';
import './Landing.css';

function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      {/* Top Utility Bar */}
      <aside className="utility-bar">
        <div className="utility-inner">
          <div className="utility-left">
            <span className="status-pill">
              <span className="pulse-dot" />
              Official Grievance Redressal Network
            </span>
            <span className="divider-pipe">|</span>
            <span className="helpline">
              Toll-Free Grievance Helpline:{' '}
              <strong>1800-11-2024</strong> (24/7)
            </span>
          </div>

          <div className="utility-right">
            <div className="font-size-controls" aria-label="Text size adjustments">
              <button type="button" title="Decrease font size">A-</button>
              <span className="sep">|</span>
              <button type="button" className="active" title="Standard font size">A</button>
              <span className="sep">|</span>
              <button type="button" title="Increase font size">A+</button>
            </div>
            <button type="button" className="contrast-btn" title="High Contrast Mode">
              Contrast
            </button>
            <select aria-label="Choose Language" className="lang-select" defaultValue="en">
              <option value="en">English (IN)</option>
              <option value="hi">Hindi (हिन्दी)</option>
              <option value="bn">Bengali (বাংলা)</option>
              <option value="ta">Tamil (தமிழ்)</option>
            </select>
          </div>
        </div>
      </aside>

      {/* Main Header */}
      <header className="site-header">
        <div className="header-inner">
          <a className="brand" href="/" onClick={(e) => e.preventDefault()}>
            <div className="brand-logo">
              <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="24" cy="24" r="22" fill="#f6f5f0" stroke="#d69e43" strokeWidth="2.5" />
                <circle cx="24" cy="24" r="16" fill="none" stroke="#d69e43" strokeWidth="1" opacity="0.5" />
                <text
                  x="24"
                  y="28"
                  textAnchor="middle"
                  fontFamily="Lora, serif"
                  fontWeight="700"
                  fontSize="14"
                  fill="#0b1320"
                >
                  GRP
                </text>
              </svg>
            </div>
            <div className="brand-text">
              <div className="brand-eyebrow">
                PUBLIC GRIEVANCE COMMISSION • CITIZEN CARE CELL
              </div>
              <h1 className="brand-title">Public Grievance Redressal Portal</h1>
            </div>
          </a>

          <div className="header-meta">
            <div className="sla-block">
              <span className="sla-label">Statutory SLA Compliance</span>
              <span className="sla-value">98.4% On-time Resolution</span>
            </div>
            <div className="meta-divider" />
            <a href="#helpdesk" className="guidelines-link">
              <svg className="help-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>Citizen Guidelines</span>
            </a>
          </div>
        </div>
      </header>

      {/* Hero Split Section */}
      <main className="hero-split">
        {/* Left – Citizen */}
        <section className="panel citizen-panel">
          <div className="panel-inner">
            <span className="eyebrow">Public Access</span>
            <h2 className="headline">
              File it.<br />
              Track it.<br />
              Get it resolved.
            </h2>
            <p className="sub">
              Raise a complaint about water, roads, electricity or sanitation
              and follow its journey to resolution.
            </p>
            <div className="cta-stack">
              <button
                className="btn btn-citizen"
                onClick={() => navigate('/login?portal=citizen')}
              >
                Login as Citizen
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => navigate('/register')}
              >
                New here? Register
              </button>
            </div>
          </div>
        </section>

        {/* Right – Officer */}
        <section className="panel officer-panel">
          <div className="panel-inner">
            <span className="eyebrow eyebrow-gold">Department Access</span>
            <h2 className="headline headline-light">
              Resolve it.<br />
              Assign it.<br />
              Close it.
            </h2>
            <p className="sub sub-light">
              View incoming grievances, move them through your workflow,
              and keep response times accountable.
            </p>
            <div className="cta-stack">
              <button
                className="btn btn-officer"
                onClick={() => navigate('/login?portal=officer')}
              >
                Login as Official
              </button>
            </div>
          </div>
        </section>

        {/* Center Emblem */}
        <div className="center-emblem">
          <div className="emblem-core">
            <svg className="spin-ring" viewBox="0 0 160 160">
              <defs>
                <path
                  id="circlePath"
                  d="M 80, 80 m -62, 0 a 62,62 0 1,1 124,0 a 62,62 0 1,1 -124,0"
                />
              </defs>
              <text className="ring-text">
                <textPath href="#circlePath" startOffset="50%" textAnchor="middle">
                  • GRIEVANCE REDRESSAL PORTAL • GRP REDRESSAL •
                </textPath>
              </text>
            </svg>
            <div className="emblem-inner">
              <span className="grp-mark">GRP</span>
              <span className="est-year">EST. 2024</span>
            </div>
          </div>
        </div>

        {/* Floating Track Pill */}
        <Link to="/track" className="track-pill">
          <span>Track a complaint status</span>
          <svg className="arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M14 5l7 7m0 0l-7 7m7-7H3"
            />
          </svg>
        </Link>
      </main>
    </div>
  );
}

export default Landing;