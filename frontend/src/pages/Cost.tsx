import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Package, Truck, Factory, Upload, TrendingUp, AlertCircle } from 'lucide-react';

export default function Cost() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'purchase' | 'analysis'>('purchase');

  useEffect(() => {
    if (location.pathname.includes('/cost/analysis')) {
      setActiveTab('analysis');
    } else {
      setActiveTab('purchase');
    }
  }, [location.pathname]);

  const handleTabChange = (tab: 'purchase' | 'analysis') => {
    setActiveTab(tab);
    navigate(tab === 'purchase' ? '/cost/purchase' : '/cost/analysis');
  };

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-slate-900 tracking-tight">매입/원가 관리</h1>
          <p className="text-[13px] text-slate-500 mt-1">원자재 매입 및 원가 분석</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-slate-200">
        <button
          onClick={() => handleTabChange('purchase')}
          className={`px-4 py-2.5 text-[13px] font-medium transition-all btn-press relative ${
            activeTab === 'purchase'
              ? 'text-amber-700'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          원자재 매입
          {activeTab === 'purchase' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => handleTabChange('analysis')}
          className={`px-4 py-2.5 text-[13px] font-medium transition-all btn-press relative ${
            activeTab === 'analysis'
              ? 'text-amber-700'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          원가 분석 (ERP 연동)
          {activeTab === 'analysis' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-t-full" />
          )}
        </button>
      </div>

      {activeTab === 'purchase' ? (
        <div className="space-y-6">
          {/* Purchase Invoice Upload */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden card-interactive">
            <div className="px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                <h3 className="text-[15px] font-semibold text-slate-800">수입 인보이스 업로드</h3>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-amber-400 hover:bg-amber-50/30 transition-all cursor-pointer group">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-amber-100 transition-colors">
                  <Upload className="text-slate-400 group-hover:text-amber-600 transition-colors" size={22} />
                </div>
                <p className="text-[13px] text-slate-600">수입 인보이스 PDF 업로드</p>
                <p className="text-[11px] text-slate-400 mt-1">AI가 공급업체, 품목, 단가 자동 추출</p>
              </div>
              <button className="w-full py-2.5 bg-gradient-to-r from-slate-800 to-slate-900 text-white text-[13px] font-medium rounded-lg hover:from-slate-700 hover:to-slate-800 transition-all btn-press shadow-sm">
                업로드 및 파싱
              </button>
            </div>
          </div>

          {/* Receiving Check */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-[15px] font-semibold text-slate-800">입고 대사</h3>
            </div>
            <div className="p-8 text-center">
              <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="text-amber-500" size={26} />
              </div>
              <p className="text-[14px] text-slate-600">입고 수량과 인보이스 수량을 자동 대사합니다</p>
              <p className="text-[12px] text-slate-400 mt-1">불일치 시 알림 표시</p>
            </div>
          </div>

          {/* Purchase List */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-[15px] font-semibold text-slate-800">최근 매입 내역</h3>
            </div>
            <div className="py-12 text-center text-slate-400">
              <p className="text-[13px]">매입 인보이스 파싱 데이터 목록</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Cost KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-5 card-interactive shadow-lg">
              <div className="w-10 h-10 bg-white/10 backdrop-blur rounded-lg flex items-center justify-center mb-3">
                <Package className="text-white/90" size={20} />
              </div>
              <p className="text-[13px] text-slate-400 mb-1">원재료비</p>
              <p className="text-[26px] font-semibold text-white tabular-nums tracking-tight">-</p>
              <p className="text-[11px] text-slate-500 mt-2">이번 달</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-5 card-interactive shadow-lg">
              <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center mb-3">
                <Factory className="text-white" size={20} />
              </div>
              <p className="text-[13px] text-emerald-100/80 mb-1">노무비</p>
              <p className="text-[26px] font-semibold text-white tabular-nums tracking-tight">-</p>
              <p className="text-[11px] text-emerald-200/60 mt-2">이번 달</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 card-interactive shadow-sm">
              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center mb-3">
                <Truck className="text-slate-600" size={20} />
              </div>
              <p className="text-[13px] text-slate-500 mb-1">제조경비</p>
              <p className="text-[26px] font-semibold text-slate-900 tabular-nums tracking-tight">-</p>
              <p className="text-[11px] text-slate-400 mt-2">이번 달</p>
            </div>
          </div>

          {/* Cost Trend */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <TrendingUp className="text-amber-600" size={18} />
                <h3 className="text-[15px] font-semibold text-slate-800">원가율 추이</h3>
              </div>
            </div>
            <div className="p-8 text-center text-slate-400">
              <p className="text-[13px]">월별 원가율 변동 차트</p>
              <p className="text-[12px] mt-1">ERP 연동 후 표시됩니다</p>
            </div>
          </div>

          {/* Cost Alert */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                <h3 className="text-[15px] font-semibold text-slate-800">원가 변동 AI 알림</h3>
              </div>
            </div>
            <div className="p-4">
              <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200/80 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="text-amber-600" size={18} />
                  </div>
                  <div>
                    <p className="font-semibold text-amber-900 text-[13px]">냉연강판 가격 8% 상승</p>
                    <p className="text-[12px] text-amber-700 mt-1.5 leading-relaxed">
                      전월 대비 원재료 단가가 상승했습니다. 제품 단가 재검토가 필요합니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-[15px] font-semibold text-slate-800">원가 항목별 집계</h3>
            </div>
            <div className="py-12 text-center text-slate-400">
              <p className="text-[13px]">원재료비, 노무비, 제조경비 상세 내역</p>
              <p className="text-[12px] mt-1">ERP 연동 후 표시됩니다</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
