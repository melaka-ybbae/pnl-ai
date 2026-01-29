import { useState } from 'react';
import { useAnalysisStore } from '../stores/analysisStore';
import { downloadExcel, previewReport } from '../services/api';
import Card from '../components/common/Card';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { MarkdownRenderer } from '../components/common/MarkdownRenderer';
import {
  FileUp, FileSpreadsheet, FileText, Download, Eye,
  Plus, Edit2, Copy, Trash2, Clock, Mail, Calendar,
  CheckCircle, XCircle, Play, Pause, Settings, Users
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
  const { data } = useAnalysisStore();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any>(null);
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
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">보고서</h1>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex flex-col items-center justify-center h-96 text-gray-500">
          <FileUp size={48} className="mb-4 text-gray-300" />
          <p>먼저 엑셀 파일을 업로드해주세요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">보고서</h1>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Generate Tab */}
      {activeTab === 'generate' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Report Options */}
          <Card title="보고서 설정">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">포함 섹션</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedSections.monthly}
                      onChange={(e) => setSelectedSections(prev => ({
                        ...prev,
                        monthly: e.target.checked
                      }))}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span>월간 분석</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedSections.product_cost}
                      onChange={(e) => setSelectedSections(prev => ({
                        ...prev,
                        product_cost: e.target.checked
                      }))}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span>제품별 원가</span>
                  </label>
                </div>
              </div>

              <div className="pt-4 space-y-3">
                <button
                  onClick={handlePreview}
                  disabled={loading}
                  className="w-full py-2 border border-blue-600 text-blue-600 rounded-lg font-medium hover:bg-blue-50 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Eye size={18} /> 미리보기
                </button>

                <button
                  onClick={handleDownloadExcel}
                  disabled={loading}
                  className="w-full py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <FileSpreadsheet size={18} /> Excel 다운로드
                </button>

                <button
                  disabled={true}
                  className="w-full py-2 bg-gray-300 text-gray-500 rounded-lg font-medium cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <FileText size={18} /> PDF 다운로드 (준비 중)
                </button>
              </div>
            </div>
          </Card>

          {/* Preview Panel */}
          <div className="lg:col-span-2">
            <Card title="미리보기">
              {loading ? (
                <LoadingSpinner message="미리보기 생성 중..." />
              ) : preview ? (
                <div className="space-y-6">
                  {/* Summary */}
                  {preview.monthly_summary && (
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-3">월간 요약</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-500">매출액</p>
                          <p className="text-lg font-bold">{formatCurrency(preview.monthly_summary.매출액)}원</p>
                          <p className={`text-sm ${
                            preview.monthly_summary.변동률?.매출액 >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {preview.monthly_summary.변동률?.매출액 >= 0 ? '+' : ''}
                            {preview.monthly_summary.변동률?.매출액?.toFixed(1)}%
                          </p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-500">영업이익</p>
                          <p className="text-lg font-bold">{formatCurrency(preview.monthly_summary.영업이익)}원</p>
                          <p className={`text-sm ${
                            preview.monthly_summary.변동률?.영업이익 >= 0 ? 'text-green-600' : 'text-red-600'
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
                      <h3 className="font-semibold text-gray-800 mb-3">제품별 수익성</h3>
                      <div className="space-y-2">
                        {preview.product_summary.map((p: any) => (
                          <div key={p.제품군} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <span className="font-medium">{p.제품군}</span>
                            <div className="text-right">
                              <p className="font-semibold">{formatCurrency(p.매출액)}원</p>
                              <p className="text-sm text-gray-500">이익률 {p.이익률?.toFixed(1)}%</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI Comment */}
                  {preview.ai_comment && (
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-3">AI 분석</h3>
                      <div className="p-4 bg-yellow-50 rounded-lg">
                        <MarkdownRenderer content={preview.ai_comment} />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <Eye size={48} className="mx-auto mb-4" />
                  <p>"미리보기" 버튼을 클릭하여 보고서 내용을 확인하세요.</p>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <p className="text-gray-600">커스텀 템플릿을 생성하고 관리합니다.</p>
            <button
              onClick={() => {
                setEditingTemplate(null);
                setShowTemplateModal(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus size={18} /> 새 템플릿
            </button>
          </div>

          {/* Template Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map(template => (
              <div
                key={template.id}
                className={`p-4 bg-white rounded-lg border-2 ${
                  template.isDefault ? 'border-blue-300' : 'border-gray-200'
                } hover:shadow-md transition-shadow`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                      {template.name}
                      {template.isDefault && (
                        <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">기본</span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded ${
                    template.format === 'excel'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {template.format.toUpperCase()}
                  </span>
                </div>

                {/* Sections */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {template.sections.map(section => (
                    <span
                      key={section}
                      className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
                    >
                      {section}
                    </span>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-400">
                    수정: {template.lastModified}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setEditingTemplate(template);
                        setShowTemplateModal(true);
                      }}
                      className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                      title="편집"
                    >
                      <Edit2 size={16} />
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
                      className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded"
                      title="복사"
                    >
                      <Copy size={16} />
                    </button>
                    {!template.isDefault && (
                      <button
                        onClick={() => deleteTemplate(template.id)}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                        title="삭제"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Template Editor Modal (Demo) */}
          {showTemplateModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg w-full max-w-lg mx-4 p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">
                  {editingTemplate ? '템플릿 편집' : '새 템플릿 생성'}
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">템플릿 이름</label>
                    <input
                      type="text"
                      defaultValue={editingTemplate?.name || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="보고서 템플릿 이름"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                    <textarea
                      defaultValue={editingTemplate?.description || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      rows={2}
                      placeholder="템플릿 설명"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">포함 섹션</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['월간분석', '제품별원가', 'AI분석', '핵심지표', '원가변동', '시뮬레이션'].map(section => (
                        <label key={section} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            defaultChecked={editingTemplate?.sections?.includes(section)}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <span className="text-sm">{section}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">출력 형식</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="format"
                          value="excel"
                          defaultChecked={editingTemplate?.format !== 'pdf'}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span>Excel</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="format"
                          value="pdf"
                          defaultChecked={editingTemplate?.format === 'pdf'}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span>PDF</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                  <button
                    onClick={() => setShowTemplateModal(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    취소
                  </button>
                  <button
                    onClick={() => {
                      alert('데모 모드: 템플릿이 저장되었습니다.');
                      setShowTemplateModal(false);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
            <p className="text-gray-600">보고서 자동 생성 및 발송 스케줄을 관리합니다.</p>
            <button
              onClick={() => setShowScheduleModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus size={18} /> 스케줄 추가
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Schedule List */}
            <div className="lg:col-span-2 space-y-4">
              <Card title="활성 스케줄">
                <div className="space-y-3">
                  {schedules.map(schedule => (
                    <div
                      key={schedule.id}
                      className={`p-4 border rounded-lg ${
                        schedule.enabled ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-gray-800">{schedule.templateName}</h3>
                            <span className={`px-2 py-0.5 text-xs rounded ${
                              schedule.enabled
                                ? 'bg-green-200 text-green-800'
                                : 'bg-gray-200 text-gray-600'
                            }`}>
                              {schedule.enabled ? '활성' : '비활성'}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-gray-500 flex items-center gap-1">
                                <Calendar size={14} />
                                {schedule.frequency === 'daily' && '매일'}
                                {schedule.frequency === 'weekly' && `매주 ${['일','월','화','수','목','금','토'][schedule.dayOfWeek!]}요일`}
                                {schedule.frequency === 'monthly' && `매월 ${schedule.dayOfMonth}일`}
                                {' '}{schedule.time}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500 flex items-center gap-1">
                                <Users size={14} />
                                {schedule.recipients.length}명
                              </p>
                            </div>
                          </div>

                          <div className="mt-2 text-xs text-gray-400">
                            <span>마지막 실행: {schedule.lastRun}</span>
                            <span className="mx-2">|</span>
                            <span>다음 실행: {schedule.nextRun}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleScheduleEnabled(schedule.id)}
                            className={`p-2 rounded-lg ${
                              schedule.enabled
                                ? 'text-green-600 hover:bg-green-100'
                                : 'text-gray-400 hover:bg-gray-200'
                            }`}
                            title={schedule.enabled ? '비활성화' : '활성화'}
                          >
                            {schedule.enabled ? <Pause size={18} /> : <Play size={18} />}
                          </button>
                          <button
                            onClick={() => deleteSchedule(schedule.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                            title="삭제"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>

                      {/* Recipients */}
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-500 mb-1">수신자:</p>
                        <div className="flex flex-wrap gap-1">
                          {schedule.recipients.map(email => (
                            <span
                              key={email}
                              className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded"
                            >
                              {email}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}

                  {schedules.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      <Clock size={48} className="mx-auto mb-2" />
                      <p>등록된 스케줄이 없습니다.</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Email Settings */}
            <div>
              <Card title="이메일 설정">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">SMTP 서버</label>
                    <input
                      type="text"
                      value={emailSettings.smtpServer}
                      onChange={(e) => setEmailSettings(prev => ({ ...prev, smtpServer: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">포트</label>
                    <input
                      type="number"
                      value={emailSettings.smtpPort}
                      onChange={(e) => setEmailSettings(prev => ({ ...prev, smtpPort: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">발신자 이메일</label>
                    <input
                      type="email"
                      value={emailSettings.senderEmail}
                      onChange={(e) => setEmailSettings(prev => ({ ...prev, senderEmail: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">발신자 이름</label>
                    <input
                      type="text"
                      value={emailSettings.senderName}
                      onChange={(e) => setEmailSettings(prev => ({ ...prev, senderName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>

                  <button
                    onClick={() => alert('데모 모드: 이메일 설정이 저장되었습니다.')}
                    className="w-full py-2 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-900 flex items-center justify-center gap-2"
                  >
                    <Settings size={18} /> 설정 저장
                  </button>

                  <button
                    onClick={() => alert('데모 모드: 테스트 이메일이 발송되었습니다.')}
                    className="w-full py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 flex items-center justify-center gap-2"
                  >
                    <Mail size={18} /> 테스트 발송
                  </button>
                </div>
              </Card>

              {/* Quick Stats */}
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">발송 통계 (이번 달)</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-600">발송 성공</span>
                    <span className="font-semibold text-blue-800">23건</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-600">발송 실패</span>
                    <span className="font-semibold text-red-600">1건</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-600">총 수신자</span>
                    <span className="font-semibold text-blue-800">45명</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Add Schedule Modal (Demo) */}
          {showScheduleModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg w-full max-w-lg mx-4 p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">스케줄 추가</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">템플릿 선택</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                      {templates.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">반복 주기</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                      <option value="daily">매일</option>
                      <option value="weekly">매주</option>
                      <option value="monthly">매월</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">실행 일</label>
                      <input
                        type="number"
                        min={1}
                        max={31}
                        defaultValue={5}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">실행 시간</label>
                      <input
                        type="time"
                        defaultValue="09:00"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">수신자 (쉼표로 구분)</label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      rows={2}
                      placeholder="cfo@company.com, finance@company.com"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                  <button
                    onClick={() => setShowScheduleModal(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    취소
                  </button>
                  <button
                    onClick={() => {
                      alert('데모 모드: 스케줄이 추가되었습니다.');
                      setShowScheduleModal(false);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
