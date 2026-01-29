import { Outlet, NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  TrendingUp,
  Calculator,
  PiggyBank,
  FileText,
  Settings,
  Upload,
  Brain
} from 'lucide-react';
import FileUpload from './FileUpload';

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: '대시보드' },
  { path: '/analysis', icon: TrendingUp, label: '분석' },
  { path: '/simulation', icon: Calculator, label: '시뮬레이션' },
  { path: '/budget', icon: PiggyBank, label: '예산' },
  { path: '/cause-analysis', icon: Brain, label: '원인 추론' },
  { path: '/reports', icon: FileText, label: '보고서' },
  { path: '/settings', icon: Settings, label: '설정' },
];

export default function Layout() {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold text-gray-800">COMPONENT.TEAM</h1>
          <p className="text-sm text-gray-500">DK DONGSHIN</p>
        </div>

        {/* File Upload */}
        <div className="p-4 border-b">
          <FileUpload />
        </div>

        {/* Navigation */}
        <nav className="p-4">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`
                  }
                >
                  <item.icon size={20} />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
