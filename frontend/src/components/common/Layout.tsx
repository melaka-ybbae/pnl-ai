import { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Database,
  ShoppingCart,
  DollarSign,
  Wallet,
  Banknote,
  FileText,
  TrendingUp,
  Calculator,
  FileBarChart,
  Bell,
  Settings,
  ChevronDown,
  User,
  LogOut,
  Search
} from 'lucide-react';

interface SubMenuItem {
  path: string;
  label: string;
}

interface NavItem {
  path: string;
  icon: React.ElementType;
  label: string;
  submenu?: SubMenuItem[];
}

const navItems: NavItem[] = [
  { path: '/', icon: LayoutDashboard, label: '대시보드' },
  { path: '/data-sync', icon: Database, label: '데이터 연동' },
  {
    path: '/sales',
    icon: ShoppingCart,
    label: '매출',
    submenu: [
      { path: '/sales/export', label: '수출 매출' },
      { path: '/sales/domestic', label: '내수 매출' },
      { path: '/sales/status', label: '매출 현황' },
    ]
  },
  {
    path: '/cost',
    icon: DollarSign,
    label: '원가',
    submenu: [
      { path: '/cost/purchase', label: '원자재 매입' },
      { path: '/cost/analysis', label: '원가 분석' },
    ]
  },
  {
    path: '/receivables',
    icon: Wallet,
    label: '채권/채무',
    submenu: [
      { path: '/receivables/ar', label: '외상매출금' },
      { path: '/receivables/ap', label: '외상매입금' },
    ]
  },
  { path: '/forex', icon: Banknote, label: '환율' },
  { path: '/documents', icon: FileText, label: '서류' },
  { path: '/analysis', icon: TrendingUp, label: '손익' },
  { path: '/simulation', icon: Calculator, label: '시뮬레이션' },
  { path: '/reports', icon: FileBarChart, label: '보고서' },
  { path: '/alerts', icon: Bell, label: '알림' },
  { path: '/settings', icon: Settings, label: '설정' },
];

function DropdownMenu({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-md transition-all btn-press ${
          isActive
            ? 'text-amber-700 bg-amber-50'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
        }`}
      >
        <item.icon size={15} strokeWidth={1.75} />
        <span>{item.label}</span>
        <ChevronDown
          size={13}
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 w-44 bg-white border border-slate-200/80 rounded-lg shadow-lg py-1.5 z-50 animate-in">
          {item.submenu?.map((subItem) => (
            <NavLink
              key={subItem.path}
              to={subItem.path}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) =>
                `block px-3.5 py-2 text-[13px] transition-colors ${
                  isActive
                    ? 'text-amber-700 bg-amber-50/60 font-medium'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`
              }
            >
              {subItem.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const location = useLocation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isMenuActive = (item: NavItem) => {
    if (item.submenu) {
      return location.pathname.startsWith(item.path);
    }
    return location.pathname === item.path;
  };

  return (
    <div className="min-h-screen bg-[#f7f8fa] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-40 overflow-visible">
        <div className="max-w-[1600px] mx-auto overflow-visible">
          {/* Top bar */}
          <div className="flex items-center justify-between h-14 px-5">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-sm tracking-tight">DK</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-[15px] font-semibold text-slate-900 tracking-tight leading-none">
                  DK DONGSHIN
                </h1>
                <p className="text-[11px] text-slate-400 tracking-wide mt-0.5">
                  Financial Platform
                </p>
              </div>
            </div>

            {/* Search - desktop */}
            <div className="hidden lg:flex items-center flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="검색..."
                  className="w-full h-9 pl-9 pr-4 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
                />
              </div>
            </div>

            {/* Right section */}
            <div className="flex items-center gap-2">
              {/* Notifications */}
              <button className="relative w-9 h-9 flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors btn-press">
                <Bell size={18} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full"></span>
              </button>

              {/* User */}
              <div ref={userMenuRef} className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors btn-press"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-slate-200 to-slate-300 rounded-full flex items-center justify-center">
                    <User size={15} className="text-slate-600" />
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-[13px] font-medium text-slate-700 leading-none">관리자</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">admin@dk.co.kr</p>
                  </div>
                  <ChevronDown size={14} className="text-slate-400 hidden sm:block" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-slate-200/80 rounded-lg shadow-lg py-1.5 z-50 animate-in">
                    <NavLink
                      to="/settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      <Settings size={15} />
                      <span>설정</span>
                    </NavLink>
                    <hr className="my-1.5 border-slate-100" />
                    <button className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-slate-600 hover:bg-slate-50 transition-colors">
                      <LogOut size={15} />
                      <span>로그아웃</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex items-center gap-0.5 px-3 h-11 border-t border-slate-100 overflow-visible">
            {navItems.map((item) => (
              item.submenu ? (
                <DropdownMenu
                  key={item.path}
                  item={item}
                  isActive={isMenuActive(item)}
                />
              ) : (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-md transition-all whitespace-nowrap btn-press ${
                      isActive
                        ? 'text-amber-700 bg-amber-50'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                    }`
                  }
                >
                  <item.icon size={15} strokeWidth={1.75} />
                  <span>{item.label}</span>
                </NavLink>
              )
            ))}
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 w-full">
        <div className="max-w-[1600px] mx-auto p-5 lg:p-6">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/60 bg-white">
        <div className="max-w-[1600px] mx-auto px-5 py-4">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>2025 DK Dongshin. AI Financial Platform v1.0</span>
            <span>Powered by Melaka</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
