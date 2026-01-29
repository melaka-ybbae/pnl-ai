import { Routes, Route, NavLink } from 'react-router-dom';
import { TrendingUp, Package, Upload, FileText, ArrowRight } from 'lucide-react';
import { useState } from 'react';

function SalesExport() {
  const [activeTab, setActiveTab] = useState<'upload' | 'list'>('upload');

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h2 className="text-[22px] font-semibold text-slate-900 tracking-tight">수출 매출</h2>
        <p className="text-[13px] text-slate-500 mt-1">인보이스 및 B/L 파싱</p>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('upload')}
          className={`px-4 py-2.5 text-[13px] font-medium transition-all btn-press ${
            activeTab === 'upload'
              ? 'text-amber-700 border-b-2 border-amber-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          서류 업로드
        </button>
        <button
          onClick={() => setActiveTab('list')}
          className={`px-4 py-2.5 text-[13px] font-medium transition-all btn-press ${
            activeTab === 'list'
              ? 'text-amber-700 border-b-2 border-amber-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          수출 내역
        </button>
      </div>

      {activeTab === 'upload' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden card-interactive">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-[15px] font-semibold text-slate-800">Commercial Invoice 업로드</h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-amber-400 hover:bg-amber-50/30 transition-all cursor-pointer group">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-amber-100 transition-colors">
                  <Upload className="text-slate-400 group-hover:text-amber-600 transition-colors" size={22} />
                </div>
                <p className="text-[13px] text-slate-600">PDF 또는 이미지 파일을 드래그하거나 클릭</p>
                <p className="text-[11px] text-slate-400 mt-1">AI가 자동으로 데이터를 추출합니다</p>
              </div>
              <button className="w-full py-2.5 bg-gradient-to-r from-slate-800 to-slate-900 text-white text-[13px] font-medium rounded-lg hover:from-slate-700 hover:to-slate-800 transition-all btn-press shadow-sm">
                업로드 및 파싱
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden card-interactive">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-[15px] font-semibold text-slate-800">B/L (선하증권) 업로드</h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-amber-400 hover:bg-amber-50/30 transition-all cursor-pointer group">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-amber-100 transition-colors">
                  <Upload className="text-slate-400 group-hover:text-amber-600 transition-colors" size={22} />
                </div>
                <p className="text-[13px] text-slate-600">B/L 파일 업로드</p>
                <p className="text-[11px] text-slate-400 mt-1">선적일, 목적항, 수량 자동 추출</p>
              </div>
              <button className="w-full py-2.5 bg-gradient-to-r from-slate-800 to-slate-900 text-white text-[13px] font-medium rounded-lg hover:from-slate-700 hover:to-slate-800 transition-all btn-press shadow-sm">
                업로드 및 파싱
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-[15px] font-semibold text-slate-800">수출 매출 내역</h3>
          </div>
          <div className="py-16 text-center">
            <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="text-slate-400" size={26} />
            </div>
            <p className="text-[14px] text-slate-600">수출 매출 내역이 표시됩니다</p>
            <p className="text-[12px] text-slate-400 mt-1">인보이스, B/L 파싱 데이터 및 ERP 연동 데이터</p>
          </div>
        </div>
      )}
    </div>
  );
}

function SalesDomestic() {
  return (
    <div className="space-y-6 animate-in">
      <div>
        <h2 className="text-[22px] font-semibold text-slate-900 tracking-tight">내수 매출</h2>
        <p className="text-[13px] text-slate-500 mt-1">세금계산서 관리</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden card-interactive">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-[15px] font-semibold text-slate-800">세금계산서 업로드</h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-amber-400 hover:bg-amber-50/30 transition-all cursor-pointer group">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-amber-100 transition-colors">
              <Upload className="text-slate-400 group-hover:text-amber-600 transition-colors" size={22} />
            </div>
            <p className="text-[13px] text-slate-600">엑셀 파일 업로드 (.xlsx, .xls)</p>
            <p className="text-[11px] text-slate-400 mt-1">세금계산서 데이터 자동 파싱</p>
          </div>
          <button className="w-full py-2.5 bg-gradient-to-r from-slate-800 to-slate-900 text-white text-[13px] font-medium rounded-lg hover:from-slate-700 hover:to-slate-800 transition-all btn-press shadow-sm">
            업로드 및 저장
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-[15px] font-semibold text-slate-800">내수 매출 현황</h3>
        </div>
        <div className="py-16 text-center">
          <p className="text-[14px] text-slate-500">내수 매출 데이터가 표시됩니다</p>
          <p className="text-[12px] text-slate-400 mt-1">거래처별, 기간별 매출 현황</p>
        </div>
      </div>
    </div>
  );
}

function SalesStatus() {
  return (
    <div className="space-y-6 animate-in">
      <div>
        <h2 className="text-[22px] font-semibold text-slate-900 tracking-tight">매출 현황</h2>
        <p className="text-[13px] text-slate-500 mt-1">ERP 연동 데이터</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-5 card-interactive shadow-lg">
          <p className="text-[13px] text-slate-400 mb-1">총 매출</p>
          <p className="text-[26px] font-semibold text-white tabular-nums tracking-tight">-</p>
          <p className="text-[11px] text-slate-500 mt-2">이번 달</p>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-5 card-interactive shadow-lg">
          <p className="text-[13px] text-amber-100/80 mb-1">수출 매출</p>
          <p className="text-[26px] font-semibold text-white tabular-nums tracking-tight">-</p>
          <p className="text-[11px] text-amber-200/60 mt-2">전체의 70%</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 card-interactive shadow-sm">
          <p className="text-[13px] text-slate-500 mb-1">내수 매출</p>
          <p className="text-[26px] font-semibold text-slate-900 tabular-nums tracking-tight">-</p>
          <p className="text-[11px] text-slate-400 mt-2">전체의 30%</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-[15px] font-semibold text-slate-800">기간별 매출</h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-gradient-to-r from-slate-800 to-slate-900 text-white text-[12px] font-medium rounded-lg btn-press shadow-sm">일별</button>
            <button className="px-4 py-2 bg-slate-100 text-slate-700 text-[12px] font-medium rounded-lg hover:bg-slate-200 transition-colors btn-press">주별</button>
            <button className="px-4 py-2 bg-slate-100 text-slate-700 text-[12px] font-medium rounded-lg hover:bg-slate-200 transition-colors btn-press">월별</button>
          </div>
          <div className="py-12 text-center text-slate-400">
            <p className="text-[13px]">ERP 연동 후 매출 데이터가 표시됩니다</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-[15px] font-semibold text-slate-800">거래처별 매출 순위</h3>
          </div>
          <div className="py-12 text-center text-slate-400">
            <p className="text-[13px]">바이어별 매출 순위</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-[15px] font-semibold text-slate-800">제품별 비중</h3>
          </div>
          <div className="py-12 text-center text-slate-400">
            <p className="text-[13px]">건재용 / 가전용 차트</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SalesOverview() {
  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-[22px] font-semibold text-slate-900 tracking-tight">매출 관리</h1>
        <p className="text-[13px] text-slate-500 mt-1">수출/내수 매출 현황 관리</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 card-interactive shadow-sm">
          <p className="text-[13px] text-slate-500 mb-1">수출 매출</p>
          <p className="text-[26px] font-semibold text-slate-900 tabular-nums tracking-tight">-</p>
          <p className="text-[11px] text-slate-400 mt-2">데이터 준비 중</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-5 card-interactive shadow-sm">
          <p className="text-[13px] text-slate-500 mb-1">내수 매출</p>
          <p className="text-[26px] font-semibold text-slate-900 tabular-nums tracking-tight">-</p>
          <p className="text-[11px] text-slate-400 mt-2">데이터 준비 중</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-5 card-interactive shadow-sm">
          <p className="text-[13px] text-slate-500 mb-1">총 매출</p>
          <p className="text-[26px] font-semibold text-slate-900 tabular-nums tracking-tight">-</p>
          <p className="text-[11px] text-slate-400 mt-2">데이터 준비 중</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-[15px] font-semibold text-slate-800">바로가기</h3>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <NavLink
              to="/sales/export"
              className="p-5 border border-slate-200/80 rounded-xl hover:border-amber-300 hover:bg-amber-50/30 transition-all group card-interactive"
            >
              <div className="w-11 h-11 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center mb-3 group-hover:from-amber-100 group-hover:to-amber-200 transition-all">
                <Package className="text-slate-600 group-hover:text-amber-700" size={20} />
              </div>
              <h3 className="font-semibold text-slate-800 text-[14px] mb-1">수출 매출</h3>
              <p className="text-[12px] text-slate-500">수출 계약 및 선적 관리</p>
              <div className="flex items-center gap-1 text-[11px] text-amber-600 mt-3 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                바로가기 <ArrowRight size={12} />
              </div>
            </NavLink>

            <NavLink
              to="/sales/domestic"
              className="p-5 border border-slate-200/80 rounded-xl hover:border-amber-300 hover:bg-amber-50/30 transition-all group card-interactive"
            >
              <div className="w-11 h-11 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center mb-3 group-hover:from-amber-100 group-hover:to-amber-200 transition-all">
                <FileText className="text-slate-600 group-hover:text-amber-700" size={20} />
              </div>
              <h3 className="font-semibold text-slate-800 text-[14px] mb-1">내수 매출</h3>
              <p className="text-[12px] text-slate-500">국내 거래처 매출 관리</p>
              <div className="flex items-center gap-1 text-[11px] text-amber-600 mt-3 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                바로가기 <ArrowRight size={12} />
              </div>
            </NavLink>

            <NavLink
              to="/sales/status"
              className="p-5 border border-slate-200/80 rounded-xl hover:border-amber-300 hover:bg-amber-50/30 transition-all group card-interactive"
            >
              <div className="w-11 h-11 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center mb-3 group-hover:from-amber-100 group-hover:to-amber-200 transition-all">
                <TrendingUp className="text-slate-600 group-hover:text-amber-700" size={20} />
              </div>
              <h3 className="font-semibold text-slate-800 text-[14px] mb-1">매출 현황</h3>
              <p className="text-[12px] text-slate-500">전체 매출 현황 대시보드</p>
              <div className="flex items-center gap-1 text-[11px] text-amber-600 mt-3 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                바로가기 <ArrowRight size={12} />
              </div>
            </NavLink>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Sales() {
  return (
    <Routes>
      <Route index element={<SalesOverview />} />
      <Route path="export" element={<SalesExport />} />
      <Route path="domestic" element={<SalesDomestic />} />
      <Route path="status" element={<SalesStatus />} />
    </Routes>
  );
}
