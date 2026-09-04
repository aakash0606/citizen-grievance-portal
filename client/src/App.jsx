import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import CitizenDashboard from './pages/CitizenDashboard';
import OfficerDashboard from './pages/OfficerDashboard';
import Landing from './pages/Landing';
import TrackGrievance from './pages/TrackGrievance';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default route redirects to login */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/citizen-dashboard" element={<CitizenDashboard />} />
        <Route path="/officer-dashboard" element={<OfficerDashboard />} />
        <Route path="/track" element={<TrackGrievance />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;