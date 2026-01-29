import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnalysisStore } from '../stores/analysisStore';
import { downloadExcel, previewReport, generateMonthlyReport } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { MarkdownRenderer } from '../components/common/MarkdownRenderer';
import {
  Database, FileSpreadsheet, FileText, Eye,
  Plus, Edit2, Copy, Trash2, Clock, Mail, Calendar,
  Play, Pause, Settings, Users, X, Sparkles, Download, ArrowRight
} from 'lucide-react';

// 데모용 템플릿 데이터
const demoTemplates = [
  {
    id: 1,
    name: '월간 손익 보고서',
    description: '전월 대비 손익 비교 분석',
    sections: ['월간분석', '제품별원가', 'AI분석'],
    format: 'excel',
    isDefault: true,
    lastModified: '2025-01-15'
  },
  {
    id: 2,
    name: '경영진 요약 리포트',
    description: '핵심 KPI 및 주요 이슈 요약',
    sections: ['핵심지표', '이슈사항', 'AI코멘트'],
    format: 'pdf',
    isDefault: false,
    lastModified: '2025-01-10'
  },
  {
    id: 3,
    name: '제품별 수익성 분석',
    description: '제품군별 매출 및 이익률 상세',
    sections: ['제품별원가', '원가구성', '수익성추이'],
    format: 'excel',
    isDefault: false,
    lastModified: '2025-01-08'
  },
  {
    id: 4,
    name: '원가 변동 보고서',
    description: '원재료 가격 변동 영향 분석',
    sections: ['원가변동', '시뮬레이션', '예측'],
    format: 'excel',
    isDefault: false,
    lastModified: '2025-01-05'
  }
];

// 데모용 스케줄 데이터
const demoSchedules = [
  {
    id: 1,
    templateId: 1,
    templateName: '월간 손익 보고서',
    frequency: 'monthly',
    dayOfMonth: 5,
    time: '09:00',
    recipients: ['cfo@company.com', 'finance@company.com'],
    enabled: true,
    lastRun: '2025-01-05 09:00',
    nextRun: '2025-02-05 09:00'
  },
  {
    id: 2,
    templateId: 2,
    templateName: '경영진 요약 리포트',
    frequency: 'weekly',
    dayOfWeek: 1,
    time: '08:00',
    recipients: ['ceo@company.com', 'cfo@company.com'],
    enabled: true,
    lastRun: '2025-01-27 08:00',
    nextRun: '2025-02-03 08:00'
  },
  {
    id: 3,
    templateId: 3,
    templateName: '제품별 수익성 분석',
    frequency: 'monthly',
    dayOfMonth: 10,
    time: '10:00',
    recipients: ['sales@company.com'],
    enabled: false,
    lastRun: '2025-01-10 10:00',
    nextRun: '-'
  }
];

type TabType = 'generate' | 'templates' | 'schedule';

export default function Reports() {
  const navigate = useNavigate();
  const { data } = useAnalysisStore();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [aiReport, setAiReport] = useState<string>('');
  const [reportGenerating, setReportGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('generate');
  const [selectedSections, setSelectedSections] = useState({
    monthly: true,
    product_cost: true
  });

  // 템플릿 관리 상태
  const [templates, setTemplates] = useState(demoTemplates);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);

  // 스케줄 관리 상태
  const [schedules, setSchedules] = useState(demoSchedules);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [emailSettings, setEmailSettings] = useState({
    smtpServer: 'smtp.company.com',
    smtpPort: 587,
    senderEmail: 'reports@company.com',
    senderName: '손익분석시스템'
  });

  const handlePreview = async () => {
    setLoading(true);
    try {
      const res = await previewReport(undefined, true);
      if (res.success) {
        setPreview(res.data);
      }
    } catch (error) {
      console.error('Preview error:', error);
    } finally {
      setLoading(false);
    }
  };

  // AI 월간 경영 보고서 생성
  const handleGenerateAiReport = async () => {
    setReportGenerating(true);
    setAiReport('');
    setPreview(null); // 미리보기 초기화
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1; // 0-indexed

      console.log('AI 보고서 생성 요청:', { year, month });
      const res = await generateMonthlyReport(year, month, true);
      console.log('AI 보고서 응답:', res);

      if (res.success && res.data.ai_report) {
        setAiReport(res.data.ai_report);
      } else if (res.success && !res.data.ai_report) {
        setAiReport('AI 보고서 생성에 실패했습니다. API 키를 확인해주세요.');
      } else {
        setAiReport(`보고서 생성 실패: ${res.error || '알 수 없는 오류'}`);
      }
    } catch (error: any) {
      console.error('AI Report error:', error);
      setAiReport(`AI 보고서 생성 중 오류가 발생했습니다: ${error.message || error}`);
    } finally {
      setReportGenerating(false);
    }
  };

  const handleDownloadExcel = async () => {
    setLoading(true);
    try {
      const sections = Object.entries(selectedSections)
        .filter(([_, selected]) => selected)
        .map(([key]) => key);
      await downloadExcel(undefined, sections);
    } catch (error) {
      console.error('Download error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 100000000) {
      return `${(value / 100000000).toFixed(1)}억`;
    }
    return `${(value / 10000).toFixed(0)}만`;
  };

  const toggleScheduleEnabled = (id: number) => {
    setSchedules(prev => prev.map(s =>
      s.id === id ? { ...s, enabled: !s.enabled } : s
    ));
  };

  const deleteTemplate = (id: number) => {
    if (confirm('이 템플릿을 삭제하시겠습니까?')) {
      setTemplates(prev => prev.filter(t => t.id !== id));
    }
  };

  const deleteSchedule = (id: number) => {
    if (confirm('이 스케줄을 삭제하시겠습니까?')) {
      setSchedules(prev => prev.filter(s => s.id !== id));
    }
  };

  const tabs = [
    { id: 'generate' as TabType, label: '보고서 생성', icon: FileSpreadsheet },
    { id: 'templates' as TabType, label: '템플릿 관리', icon: FileText },
    { id: 'schedule' as TabType, label: '자동화 스케줄', icon: Clock }
  ];

  // 데이터 없을 때 (템플릿/스케줄 탭은 데이터 없어도 접근 가능)
  if (!data && activeTab === 'generate') {
    return (
      <div className="animate-in space-y-6">
        <div>
          <h1 className="text-[22px] font-semibold text-slate-900 tracking-tight">보고서</h1>
          <p className="text-[13px] text-slate-500 mt-1">손익 분석 결과를 다양한 형식으로 내보내기</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 border-b border-slate-200">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-[13px] font-medium transition-all relative flex items-center gap-2 ${
                activeTab === tab.id ? 'text-amber-700' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-t-full" />
              )}
            </button>
          ))}
        </div>

        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
            <Database size={32} className="text-slate-400" />
          </div>
          <p className="text-[15px] font-medium text-slate-600 mb-2">보고서 생성에 필요한 데이터가 없습니다</p>
          <p className="text-[13px] text-slate-400 mb-6">먼저 데이터 연동에서 ERP 데이터를 업로드하고 손익계산서를 생성해주세요.</p>
          <button
            onClick={() => navigate('/data-sync')}
            className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white text-[13px] font-medium rounded-lg hover:bg-amber-600 transition-colors"
          >
            데이터 연동으로 이동
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in space-y-6">
      <div>
        <h1 className="text-[22px] font-semibold text-slate-900 tracking-tight">보고서</h1>
        <p className="text-[13px] text-slate-500 mt-1">손익 분석 결과를 다양한 형식으로 내보내기</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-slate-200">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-[13px] font-medium transition-all relative flex items-center gap-2 ${
              activeTab === tab.id ? 'text-amber-700' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* Generate Tab */}
      {activeTab === 'generate' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Report Options */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-[15px] font-semibold text-slate-800 mb-4">보고서 설정</h3>
            <div className="space-y-4">
              <div>
                <p className="text-[13px] font-medium text-slate-700 mb-3">포함 섹션</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedSections.monthly}
                      onChange={(e) => setSelectedSections(prev => ({
                        ...prev,
                        monthly: e.target.checked
                      }))}
                      className="w-4 h-4 text-amber-500 rounded border-slate-300 focus:ring-amber-500"
                    />
                    <span className="text-[13px] text-slate-700">월간 분석</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedSections.product_cost}
                      onChange={(e) => setSelectedSections(prev => ({
                        ...prev,
                        product_cost: e.target.checked
                      }))}
                      className="w-4 h-4 text-amber-500 rounded border-slate-300 focus:ring-amber-500"
                    />
                    <span className="text-[13px] text-slate-700">제품별 원가</span>
                  </label>
                </div>
              </div>

              <div className="pt-4 space-y-3">
                <button
                  onClick={handlePreview}
                  disabled={loading}
                  className="w-full py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 disabled:opacity-50 flex items-center justify-center gap-2 text-[13px] transition-colors"
                >
                  <Eye size={16} /> 미리보기
                </button>

                <button
                  onClick={handleDownloadExcel}
                  disabled={loading}
                  className="w-full py-2.5 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 disabled:opacity-50 flex items-center justify-center gap-2 text-[13px] transition-colors"
                >
                  <Download size={16} /> Excel 다운로드
                </button>

                <button
                  disabled={true}
                  className="w-full py-2.5 bg-slate-100 text-slate-400 rounded-lg font-medium cursor-not-allowed flex items-center justify-center gap-2 text-[13px]"
                >
                  <FileText size={16} /> PDF 다운로드 (준비 중)
                </button>
              </div>

              {/* AI 보고서 섹션 */}
              <div className="pt-4 border-t border-slate-200 mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 bg-amber-100 rounded-lg flex items-center justify-center">
                    <Sparkles className="text-amber-600" size={14} />
                  </div>
                  <span className="text-[13px] font-medium text-slate-700">AI 경영 보고서</span>
                </div>
                <p className="text-[11px] text-slate-500 mb-3">
                  AI가 재무 데이터를 분석하여 7개 섹션의 상세 월간 경영 보고서를 자동 작성합니다.
                </p>
                <button
                  onClick={handleGenerateAiReport}
                  disabled={reportGenerating}
                  className="w-full py-2.5 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 disabled:opacity-50 flex items-center justify-center gap-2 text-[13px] transition-colors"
                >
                  <Sparkles size={16} />
                  {reportGenerating ? 'AI가 보고서 작성 중...' : 'AI 경영 보고서 생성'}
                </button>
              </div>
            </div>
          </div>

          {/* Preview Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="text-[15px] font-semibold text-slate-800">미리보기</h3>
              </div>
              <div className="p-5">
                {loading ? (
                  <LoadingSpinner message="미리보기 생성 중..." />
                ) : preview ? (
                  <div className="space-y-6">
                    {/* Summary */}
                    {preview.monthly_summary && (
                      <div>
                        <h4 className="text-[14px] font-medium text-slate-700 mb-3">월간 요약</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-slate-50 rounded-lg">
                            <p className="text-[12px] text-slate-500 mb-1">매출액</p>
                            <p className="text-[18px] font-bold text-slate-800">{formatCurrency(preview.monthly_summary.매출액)}원</p>
                            <p className={`text-[12px] mt-1 ${
                              preview.monthly_summary.변동률?.매출액 >= 0 ? 'text-emerald-600' : 'text-red-600'
                            }`}>
                              {preview.monthly_summary.변동률?.매출액 >= 0 ? '+' : ''}
                              {preview.monthly_summary.변동률?.매출액?.toFixed(1)}%
                            </p>
                          </div>
                          <div className="p-4 bg-slate-50 rounded-lg">
                            <p className="text-[12px] text-slate-500 mb-1">영업이익</p>
                            <p className="text-[18px] font-bold text-slate-800">{formatCurrency(preview.monthly_summary.영업이익)}원</p>
                            <p className={`text-[12px] mt-1 ${
                              preview.monthly_summary.변동률?.영업이익 >= 0 ? 'text-emerald-600' : 'text-red-600'
                            }`}>
                              {preview.monthly_summary.변동률?.영업이익 >= 0 ? '+' : ''}
                              {preview.monthly_summary.변동률?.영업이익?.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Product Summary */}
                    {preview.product_summary && (
                      <div>
                        <h4 className="text-[14px] font-medium text-slate-700 mb-3">제품별 수익성</h4>
                        <div className="space-y-2">
                          {preview.product_summary.map((p: any) => (
                            <div key={p.제품군} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                              <span className="text-[13px] font-medium text-slate-700">{p.제품군}</span>
                              <div className="text-right">
                                <p className="text-[14px] font-semibold text-slate-800">{formatCurrency(p.매출액)}원</p>
                                <p className="text-[12px] text-slate-500">이익률 {p.이익률?.toFixed(1)}%</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* AI Comment */}
                    {preview.ai_comment && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 bg-amber-100 rounded-lg flex items-center justify-center">
                            <Sparkles className="text-amber-600" size={14} />
                          </div>
                          <h4 className="text-[14px] font-medium text-slate-700">AI 분석</h4>
                        </div>
                        <div className="p-4 bg-amber-50/50 rounded-lg border border-amber-100">
                          <MarkdownRenderer content={preview.ai_comment} />
                        </div>
                      </div>
                    )}
                  </div>
                ) : aiReport ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 bg-amber-100 rounded-lg flex items-center justify-center">
                        <Sparkles className="text-amber-600" size={14} />
                      </div>
                      <h4 className="text-[14px] font-medium text-slate-700">AI 월간 경영 보고서</h4>
                    </div>
                    <div className="p-4 bg-amber-50/50 rounded-lg border border-amber-100 max-h-[600px] overflow-y-auto">
                      <MarkdownRenderer content={aiReport} />
                    </div>
                  </div>
                ) : reportGenerating ? (
                  <LoadingSpinner message="AI가 경영 보고서를 작성하고 있습니다..." />
                ) : (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <Eye size={24} className="text-slate-400" />
                    </div>
                    <p className="text-[13px] text-slate-400">"미리보기" 또는 "AI 경영 보고서 생성" 버튼을 클릭하세요.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <p className="text-[13px] text-slate-500">커스텀 템플릿을 생성하고 관리합니다.</p>
            <button
              onClick={() => {
                setEditingTemplate(null);
                setShowTemplateModal(true);
              }}
              className="px-4 py-2.5 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 flex items-center gap-2 text-[13px] transition-colors"
            >
              <Plus size={16} /> 새 템플릿
            </button>
          </div>

          {/* Template Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map(template => (
              <div
                key={template.id}
                className={`p-5 bg-white rounded-xl border-2 transition-all hover:shadow-md ${
                  template.isDefault ? 'border-amber-300' : 'border-slate-200'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-[14px] font-semibold text-slate-800 flex items-center gap-2">
                      {template.name}
                      {template.isDefault && (
                        <span className="px-2 py-0.5 text-[10px] bg-amber-100 text-amber-700 rounded font-medium">기본</span>
                      )}
                    </h3>
                    <p className="text-[12px] text-slate-500 mt-1">{template.description}</p>
                  </div>
                  <span className={`px-2 py-1 text-[10px] font-medium rounded ${
                    template.format === 'excel'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {template.format.toUpperCase()}
                  </span>
                </div>

                {/* Sections */}
                <div className="flex flex-wrap gap-1 mb-4">
                  {template.sections.map(section => (
                    <span
                      key={section}
                      className="px-2 py-0.5 text-[10px] bg-slate-100 text-slate-600 rounded"
                    >
                      {section}
                    </span>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                  <span className="text-[11px] text-slate-400">
                    수정: {template.lastModified}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setEditingTemplate(template);
                        setShowTemplateModal(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                      title="편집"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => {
                        const newTemplate = {
                          ...template,
                          id: Math.max(...templates.map(t => t.id)) + 1,
                          name: `${template.name} (복사본)`,
                          isDefault: false,
                          lastModified: new Date().toISOString().split('T')[0]
                        };
                        setTemplates([...templates, newTemplate]);
                      }}
                      className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                      title="복사"
                    >
                      <Copy size={14} />
                    </button>
                    {!template.isDefault && (
                      <button
                        onClick={() => deleteTemplate(template.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="삭제"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Template Editor Modal */}
          {showTemplateModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowTemplateModal(false)}>
              <div className="bg-white rounded-2xl w-full max-w-lg mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                  <h2 className="text-[16px] font-semibold text-slate-800">
                    {editingTemplate ? '템플릿 편집' : '새 템플릿 생성'}
                  </h2>
                  <button onClick={() => setShowTemplateModal(false)} className="p-1 hover:bg-slate-100 rounded">
                    <X size={20} className="text-slate-400" />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-[13px] font-medium text-slate-700 mb-1.5">템플릿 이름</label>
                    <input
                      type="text"
                      defaultValue={editingTemplate?.name || ''}
                      className="w-full px-3 py-2.5 text-[13px] border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      placeholder="보고서 템플릿 이름"
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-slate-700 mb-1.5">설명</label>
                    <textarea
                      defaultValue={editingTemplate?.description || ''}
                      className="w-full px-3 py-2.5 text-[13px] border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      rows={2}
                      placeholder="템플릿 설명"
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-slate-700 mb-2">포함 섹션</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['월간분석', '제품별원가', 'AI분석', '핵심지표', '원가변동', '시뮬레이션'].map(section => (
                        <label key={section} className="flex items-center gap-2 cursor-pointer p-2 bg-slate-50 rounded-lg hover:bg-slate-100">
                          <input
                            type="checkbox"
                            defaultChecked={editingTemplate?.sections?.includes(section)}
                            className="w-4 h-4 text-amber-500 rounded border-slate-300"
                          />
                          <span className="text-[12px] text-slate-700">{section}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-slate-700 mb-2">출력 형식</label>
                    <div className="flex gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="format"
                          value="excel"
                          defaultChecked={editingTemplate?.format !== 'pdf'}
                          className="w-4 h-4 text-amber-500"
                        />
                        <span className="text-[13px] text-slate-700">Excel</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="format"
                          value="pdf"
                          defaultChecked={editingTemplate?.format === 'pdf'}
                          className="w-4 h-4 text-amber-500"
                        />
                        <span className="text-[13px] text-slate-700">PDF</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
                  <button
                    onClick={() => setShowTemplateModal(false)}
                    className="px-4 py-2 text-[13px] text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={() => {
                      alert('데모 모드: 템플릿이 저장되었습니다.');
                      setShowTemplateModal(false);
                    }}
                    className="px-4 py-2 text-[13px] bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                  >
                    저장
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Schedule Tab */}
      {activeTab === 'schedule' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <p className="text-[13px] text-slate-500">보고서 자동 생성 및 발송 스케줄을 관리합니다.</p>
            <button
              onClick={() => setShowScheduleModal(true)}
              className="px-4 py-2.5 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 flex items-center gap-2 text-[13px] transition-colors"
            >
              <Plus size={16} /> 스케줄 추가
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Schedule List */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h3 className="text-[15px] font-semibold text-slate-800">활성 스케줄</h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {schedules.map(schedule => (
                    <div
                      key={schedule.id}
                      className={`p-5 ${
                        schedule.enabled ? 'bg-emerald-50/50' : 'bg-slate-50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="text-[14px] font-semibold text-slate-800">{schedule.templateName}</h4>
                            <span className={`px-2 py-0.5 text-[10px] rounded font-medium ${
                              schedule.enabled
                                ? 'bg-emerald-200 text-emerald-800'
                                : 'bg-slate-200 text-slate-600'
                            }`}>
                              {schedule.enabled ? '활성' : '비활성'}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-[12px]">
                            <div>
                              <p className="text-slate-500 flex items-center gap-1">
                                <Calendar size={12} />
                                {schedule.frequency === 'daily' && '매일'}
                                {schedule.frequency === 'weekly' && `매주 ${['일','월','화','수','목','금','토'][schedule.dayOfWeek!]}요일`}
                                {schedule.frequency === 'monthly' && `매월 ${schedule.dayOfMonth}일`}
                                {' '}{schedule.time}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-500 flex items-center gap-1">
                                <Users size={12} />
                                {schedule.recipients.length}명
                              </p>
                            </div>
                          </div>

                          <div className="mt-2 text-[11px] text-slate-400">
                            <span>마지막 실행: {schedule.lastRun}</span>
                            <span className="mx-2">|</span>
                            <span>다음 실행: {schedule.nextRun}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleScheduleEnabled(schedule.id)}
                            className={`p-2 rounded-lg transition-colors ${
                              schedule.enabled
                                ? 'text-emerald-600 hover:bg-emerald-100'
                                : 'text-slate-400 hover:bg-slate-200'
                            }`}
                            title={schedule.enabled ? '비활성화' : '활성화'}
                          >
                            {schedule.enabled ? <Pause size={16} /> : <Play size={16} />}
                          </button>
                          <button
                            onClick={() => deleteSchedule(schedule.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="삭제"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Recipients */}
                      <div className="mt-3 pt-3 border-t border-slate-200/50">
                        <p className="text-[11px] text-slate-500 mb-1.5">수신자:</p>
                        <div className="flex flex-wrap gap-1">
                          {schedule.recipients.map(email => (
                            <span
                              key={email}
                              className="px-2 py-0.5 text-[10px] bg-slate-100 text-slate-600 rounded"
                            >
                              {email}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}

                  {schedules.length === 0 && (
                    <div className="text-center py-12">
                      <Clock size={40} className="mx-auto mb-2 text-slate-300" />
                      <p className="text-[13px] text-slate-400">등록된 스케줄이 없습니다.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Email Settings */}
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="text-[15px] font-semibold text-slate-800 mb-4">이메일 설정</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[12px] font-medium text-slate-600 mb-1.5">SMTP 서버</label>
                    <input
                      type="text"
                      value={emailSettings.smtpServer}
                      onChange={(e) => setEmailSettings(prev => ({ ...prev, smtpServer: e.target.value }))}
                      className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-[12px] font-medium text-slate-600 mb-1.5">포트</label>
                    <input
                      type="number"
                      value={emailSettings.smtpPort}
                      onChange={(e) => setEmailSettings(prev => ({ ...prev, smtpPort: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-[12px] font-medium text-slate-600 mb-1.5">발신자 이메일</label>
                    <input
                      type="email"
                      value={emailSettings.senderEmail}
                      onChange={(e) => setEmailSettings(prev => ({ ...prev, senderEmail: e.target.value }))}
                      className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-[12px] font-medium text-slate-600 mb-1.5">발신자 이름</label>
                    <input
                      type="text"
                      value={emailSettings.senderName}
                      onChange={(e) => setEmailSettings(prev => ({ ...prev, senderName: e.target.value }))}
                      className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg"
                    />
                  </div>

                  <button
                    onClick={() => alert('데모 모드: 이메일 설정이 저장되었습니다.')}
                    className="w-full py-2.5 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-900 flex items-center justify-center gap-2 text-[13px] transition-colors"
                  >
                    <Settings size={14} /> 설정 저장
                  </button>

                  <button
                    onClick={() => alert('데모 모드: 테스트 이메일이 발송되었습니다.')}
                    className="w-full py-2.5 border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 flex items-center justify-center gap-2 text-[13px] transition-colors"
                  >
                    <Mail size={14} /> 테스트 발송
                  </button>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="bg-amber-50 rounded-xl border border-amber-200 p-5">
                <h4 className="text-[14px] font-medium text-amber-800 mb-3">발송 통계 (이번 달)</h4>
                <div className="space-y-2 text-[13px]">
                  <div className="flex justify-between">
                    <span className="text-amber-700">발송 성공</span>
                    <span className="font-semibold text-amber-900">23건</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-amber-700">발송 실패</span>
                    <span className="font-semibold text-red-600">1건</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-amber-700">총 수신자</span>
                    <span className="font-semibold text-amber-900">45명</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Add Schedule Modal */}
          {showScheduleModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowScheduleModal(false)}>
              <div className="bg-white rounded-2xl w-full max-w-lg mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                  <h2 className="text-[16px] font-semibold text-slate-800">스케줄 추가</h2>
                  <button onClick={() => setShowScheduleModal(false)} className="p-1 hover:bg-slate-100 rounded">
                    <X size={20} className="text-slate-400" />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-[13px] font-medium text-slate-700 mb-1.5">템플릿 선택</label>
                    <select className="w-full px-3 py-2.5 text-[13px] border border-slate-200 rounded-lg">
                      {templates.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-slate-700 mb-1.5">반복 주기</label>
                    <select className="w-full px-3 py-2.5 text-[13px] border border-slate-200 rounded-lg">
                      <option value="daily">매일</option>
                      <option value="weekly">매주</option>
                      <option value="monthly">매월</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[13px] font-medium text-slate-700 mb-1.5">실행 일</label>
                      <input
                        type="number"
                        min={1}
                        max={31}
                        defaultValue={5}
                        className="w-full px-3 py-2.5 text-[13px] border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-slate-700 mb-1.5">실행 시간</label>
                      <input
                        type="time"
                        defaultValue="09:00"
                        className="w-full px-3 py-2.5 text-[13px] border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-slate-700 mb-1.5">수신자 (쉼표로 구분)</label>
                    <textarea
                      className="w-full px-3 py-2.5 text-[13px] border border-slate-200 rounded-lg"
                      rows={2}
                      placeholder="cfo@company.com, finance@company.com"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
                  <button
                    onClick={() => setShowScheduleModal(false)}
                    className="px-4 py-2 text-[13px] text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={() => {
                      alert('데모 모드: 스케줄이 추가되었습니다.');
                      setShowScheduleModal(false);
                    }}
                    className="px-4 py-2 text-[13px] bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                  >
                    저장
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
