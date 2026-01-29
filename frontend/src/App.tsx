import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/common/Layout';
import Dashboard from './pages/Dashboard';
import DataSync from './pages/DataSync';
import Sales from './pages/Sales';
import Cost from './pages/Cost';
import Receivables from './pages/Receivables';
import Forex from './pages/Forex';
import Documents from './pages/Documents';
import Analysis from './pages/Analysis';
import Simulation from './pages/Simulation';
import Reports from './pages/Reports';
import Alerts from './pages/Alerts';
import Settings from './pages/Settings';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          {/* 1. 대시보드 */}
          <Route index element={<Dashboard />} />

          {/* 2. 데이터 연동 센터 (AI 스마트 파싱 통합) */}
          <Route path="data-sync" element={<DataSync />} />

          {/* 3. 매출 관리 (수출매출, 내수매출, 매출현황) */}
          <Route path="sales/*" element={<Sales />} />

          {/* 4. 매입/원가 관리 (원자재매입, 원가분석) */}
          <Route path="cost/*" element={<Cost />} />

          {/* 5. 채권/채무 관리 (AR, AP) */}
          <Route path="receivables/*" element={<Receivables />} />

          {/* 6. 외환/환율 관리 */}
          <Route path="forex" element={<Forex />} />

          {/* 7. 무역 서류 센터 */}
          <Route path="documents" element={<Documents />} />

          {/* 8. 손익 분석 */}
          <Route path="analysis" element={<Analysis />} />

          {/* 9. 시뮬레이션 */}
          <Route path="simulation" element={<Simulation />} />

          {/* 10. 보고서 */}
          <Route path="reports" element={<Reports />} />

          {/* 11. 알림 센터 */}
          <Route path="alerts" element={<Alerts />} />

          {/* 12. 설정 */}
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
