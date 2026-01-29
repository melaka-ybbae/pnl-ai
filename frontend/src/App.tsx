import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/common/Layout';
import Dashboard from './pages/Dashboard';
import Analysis from './pages/Analysis';
import Simulation from './pages/Simulation';
import Budget from './pages/Budget';
import CauseAnalysis from './pages/CauseAnalysis';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="analysis" element={<Analysis />} />
          <Route path="simulation" element={<Simulation />} />
          <Route path="budget" element={<Budget />} />
          <Route path="cause-analysis" element={<CauseAnalysis />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
