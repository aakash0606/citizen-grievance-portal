import { useNavigate } from 'react-router-dom';
import './Landing.css';

function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing">
      <div className="panel citizen-panel">
        <div className="panel-content">
          <span className="eyebrow">Public Access</span>
          <h1 className="headline">File it.<br />Track it.<br />Get it resolved.</h1>
          <p className="sub">
            Raise a complaint about water, roads, electricity or sanitation
            and follow its journey to resolution.
          </p>
          <div className="cta-row">
            <button className="btn btn-citizen" onClick={() => navigate('/login?portal=citizen')}>
              Login as Citizen
            </button>
            <button className="btn btn-ghost-citizen" onClick={() => navigate('/register')}>
              New here? Register
            </button>
          </div>
        </div>
      </div>

      <div className="seam">
        <svg viewBox="0 0 200 200" className="seal" aria-hidden="true">
          <defs>
            <path id="sealCircle" d="M100,20 a80,80 0 1,1 -0.1,0" fill="none" />
          </defs>
          <circle cx="100" cy="100" r="92" className="seal-ring" />
          <circle cx="100" cy="100" r="78" className="seal-ring-inner" />
          <path d="M100,22 A78,78 0 0,1 100,178" className="seal-half-left" />
          <path d="M100,22 A78,78 0 0,0 100,178" className="seal-half-right" />
          <text className="seal-text">
            <textPath href="#sealCircle" startOffset="2%">
              GRIEVANCE · REDRESSAL · PORTAL · GRIEVANCE · REDRESSAL · PORTAL ·
            </textPath>
          </text>
          <text x="100" y="107" textAnchor="middle" className="seal-center">GRP</text>
        </svg>
      </div>

      <div className="panel officer-panel">
        <div className="panel-content">
          <span className="eyebrow eyebrow-dark">Department Access</span>
          <h1 className="headline headline-dark">Resolve it.<br />Assign it.<br />Close it.</h1>
          <p className="sub sub-dark">
            View incoming grievances, move them through your workflow,
            and keep response times accountable.
          </p>
          <div className="cta-row">
            <button className="btn btn-officer" onClick={() => navigate('/login?portal=officer')}>
              Login as Official
            </button>
          </div>
        </div>
      </div>

      <p className="footer-caption">A digital front door between citizens and their government</p>
    </div>
  );
}

export default Landing;