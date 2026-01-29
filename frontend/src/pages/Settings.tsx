import { useState } from 'react';
import {
  Server, Database, Key, TestTube, CheckCircle,
  Clock, Calendar, RefreshCw, Brain, Bell, Sparkles
} from 'lucide-react';

type ScheduleType = 'daily' | 'weekly' | 'monthly';
type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export default function Settings() {
  // ERP 설정
  const [erpConfig, setErpConfig] = useState({
    erp_type: 'SAP',
    base_url: 'https://erp.company.com/api',
    api_key: '••••••••••••••••',
    username: 'erp_user',
    password: '••••••••'
  });

  // 연결 상태
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connected');
  const [lastSync, setLastSync] = useState('2025-01-29 16:30:00');

  // 스케줄링 설정
  const [schedule, setSchedule] = useState({
    enabled: true,
    type: 'daily' as ScheduleType,
    time: '06:00',
    dayOfWeek: 1, // 월요일
    dayOfMonth: 1
  });

  // 데이터 수집 설정
  const [dataCollection, setDataCollection] = useState({
    sales: true,
    cost: true,
    expense: true,
    spending: true
  });

  // AI 분석 설정
  const [aiSettings, setAiSettings] = useState({
    autoAggregate: true,
    suggestAccounts: true,
    anomalyDetection: true,
    anomalyThreshold: 10,
    compareMonthly: true,
    compareYearly: true
  });

  // 알림 설정
  const [notifications, setNotifications] = useState({
    email: true,
    slack: false,
    anomalyAlert: true,
    reportComplete: true,
    syncError: true
  });

  const handleTestConnection = () => {
    setConnectionStatus('connecting');
    // 시뮬레이션: 2초 후 연결 성공
    setTimeout(() => {
      setConnectionStatus('connected');
      setLastSync(new Date().toLocaleString('ko-KR'));
    }, 2000);
  };

  const handleManualSync = () => {
    setConnectionStatus('connecting');
    setTimeout(() => {
      setConnectionStatus('connected');
      setLastSync(new Date().toLocaleString('ko-KR'));
      alert('데이터 동기화가 완료되었습니다.');
    }, 3000);
  };

  const getStatusColor = (status: ConnectionStatus) => {
    switch (status) {
      case 'connected': return 'bg-emerald-500';
      case 'connecting': return 'bg-amber-500 animate-pulse';
      case 'error': return 'bg-red-500';
      default: return 'bg-slate-400';
    }
  };

  const getStatusText = (status: ConnectionStatus) => {
    switch (status) {
      case 'connected': return '연결됨';
      case 'connecting': return '연결 중...';
      case 'error': return '연결 오류';
      default: return '연결 안됨';
    }
  };

  return (
    <div className="animate-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-slate-900 tracking-tight">설정</h1>
          <p className="text-[13px] text-slate-500 mt-1">시스템 연동 및 AI 분석 설정</p>
        </div>
        <div className="flex items-center gap-2 text-[12px] text-slate-500 bg-slate-50 px-3 py-2 rounded-lg">
          <Clock size={14} />
          마지막 동기화: {lastSync}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ERP 연동 설정 */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-[15px] font-semibold text-slate-800">ERP 데이터 연동</h3>
          </div>
          <div className="p-5 space-y-4">
            {/* 연결 상태 표시 */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(connectionStatus)}`}></div>
                <div>
                  <p className="text-[14px] font-medium text-slate-800">{getStatusText(connectionStatus)}</p>
                  <p className="text-[12px] text-slate-500">SAP ERP 시스템</p>
                </div>
              </div>
              <button
                onClick={handleManualSync}
                disabled={connectionStatus === 'connecting'}
                className="px-4 py-2 bg-amber-500 text-white text-[13px] rounded-lg hover:bg-amber-600 disabled:bg-slate-300 flex items-center gap-2 transition-colors"
              >
                <RefreshCw size={14} className={connectionStatus === 'connecting' ? 'animate-spin' : ''} />
                수동 동기화
              </button>
            </div>

            <div>
              <label className="block text-[12px] font-medium text-slate-600 mb-1.5">
                <Server size={14} className="inline mr-1" />
                ERP 유형
              </label>
              <select
                value={erpConfig.erp_type}
                onChange={(e) => setErpConfig(prev => ({ ...prev, erp_type: e.target.value }))}
                className="w-full px-3 py-2.5 text-[13px] border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="SAP">SAP S/4HANA</option>
                <option value="Oracle">Oracle EBS</option>
                <option value="Douzone">더존 iCUBE</option>
                <option value="Yonyou">용우 U8</option>
                <option value="Custom">자체 ERP (REST API)</option>
              </select>
            </div>

            <div>
              <label className="block text-[12px] font-medium text-slate-600 mb-1.5">
                <Database size={14} className="inline mr-1" />
                API Endpoint
              </label>
              <input
                type="text"
                value={erpConfig.base_url}
                onChange={(e) => setErpConfig(prev => ({ ...prev, base_url: e.target.value }))}
                className="w-full px-3 py-2.5 text-[13px] border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-slate-600 mb-1.5">
                <Key size={14} className="inline mr-1" />
                API Key
              </label>
              <input
                type="password"
                value={erpConfig.api_key}
                onChange={(e) => setErpConfig(prev => ({ ...prev, api_key: e.target.value }))}
                className="w-full px-3 py-2.5 text-[13px] border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleTestConnection}
                disabled={connectionStatus === 'connecting'}
                className="flex-1 py-2.5 border border-slate-300 text-slate-700 text-[13px] rounded-lg hover:bg-slate-50 flex items-center justify-center gap-2 transition-colors"
              >
                <TestTube size={16} /> 연결 테스트
              </button>
              <button className="flex-1 py-2.5 bg-slate-800 text-white text-[13px] rounded-lg hover:bg-slate-900 transition-colors">
                설정 저장
              </button>
            </div>
          </div>
        </div>

        {/* 데이터 수집 설정 */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-[15px] font-semibold text-slate-800">데이터 수집 항목</h3>
          </div>
          <div className="p-5 space-y-4">
            <p className="text-[12px] text-slate-500">ERP에서 자동으로 수집할 데이터 유형을 선택하세요.</p>

            <div className="space-y-3">
              {[
                { key: 'sales', label: '매출 데이터', desc: '매출액, 매출처, 제품별 매출' },
                { key: 'cost', label: '원가 데이터', desc: '원재료비, 노무비, 제조경비' },
                { key: 'expense', label: '비용 데이터', desc: '판매관리비, 일반관리비' },
                { key: 'spending', label: '지출 데이터', desc: '구매, 결제, 투자 지출' }
              ].map(item => (
                <label key={item.key} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={dataCollection[item.key as keyof typeof dataCollection]}
                    onChange={(e) => setDataCollection(prev => ({ ...prev, [item.key]: e.target.checked }))}
                    className="w-4 h-4 text-amber-500 rounded border-slate-300 mt-0.5"
                  />
                  <div>
                    <p className="text-[13px] font-medium text-slate-800">{item.label}</p>
                    <p className="text-[11px] text-slate-500">{item.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* 스케줄링 설정 */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-[15px] font-semibold text-slate-800">자동 동기화 스케줄</h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-amber-600" />
                <span className="text-[13px] font-medium text-slate-800">자동 동기화</span>
              </div>
              <button
                onClick={() => setSchedule(prev => ({ ...prev, enabled: !prev.enabled }))}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  schedule.enabled ? 'bg-amber-500' : 'bg-slate-300'
                }`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow ${
                  schedule.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}></span>
              </button>
            </div>

            {schedule.enabled && (
              <>
                <div className="grid grid-cols-3 gap-2">
                  {(['daily', 'weekly', 'monthly'] as ScheduleType[]).map(type => (
                    <button
                      key={type}
                      onClick={() => setSchedule(prev => ({ ...prev, type }))}
                      className={`py-2.5 px-4 rounded-lg text-[12px] font-medium transition-colors ${
                        schedule.type === type
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {type === 'daily' ? '매일' : type === 'weekly' ? '매주' : '매월'}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-medium text-slate-600 mb-1.5">실행 시간</label>
                    <input
                      type="time"
                      value={schedule.time}
                      onChange={(e) => setSchedule(prev => ({ ...prev, time: e.target.value }))}
                      className="w-full px-3 py-2.5 text-[13px] border border-slate-200 rounded-lg"
                    />
                  </div>

                  {schedule.type === 'weekly' && (
                    <div>
                      <label className="block text-[12px] font-medium text-slate-600 mb-1.5">요일</label>
                      <select
                        value={schedule.dayOfWeek}
                        onChange={(e) => setSchedule(prev => ({ ...prev, dayOfWeek: Number(e.target.value) }))}
                        className="w-full px-3 py-2.5 text-[13px] border border-slate-200 rounded-lg"
                      >
                        {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
                          <option key={i} value={i}>{day}요일</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {schedule.type === 'monthly' && (
                    <div>
                      <label className="block text-[12px] font-medium text-slate-600 mb-1.5">날짜</label>
                      <select
                        value={schedule.dayOfMonth}
                        onChange={(e) => setSchedule(prev => ({ ...prev, dayOfMonth: Number(e.target.value) }))}
                        className="w-full px-3 py-2.5 text-[13px] border border-slate-200 rounded-lg"
                      >
                        {Array.from({ length: 28 }, (_, i) => (
                          <option key={i + 1} value={i + 1}>{i + 1}일</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                  <p className="text-[12px] text-amber-800">
                    <Clock size={12} className="inline mr-1" />
                    다음 동기화: {schedule.type === 'daily'
                      ? `매일 ${schedule.time}`
                      : schedule.type === 'weekly'
                      ? `매주 ${['일', '월', '화', '수', '목', '금', '토'][schedule.dayOfWeek]}요일 ${schedule.time}`
                      : `매월 ${schedule.dayOfMonth}일 ${schedule.time}`
                    }
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* AI 분석 설정 */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-amber-100 rounded-lg flex items-center justify-center">
                <Sparkles className="text-amber-600" size={14} />
              </div>
              <h3 className="text-[15px] font-semibold text-slate-800">AI 손익 분석 설정</h3>
            </div>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-2 text-amber-600 mb-2">
              <Brain size={18} />
              <span className="text-[13px] font-medium">Claude AI 기반 분석</span>
            </div>

            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div>
                  <p className="text-[13px] font-medium text-slate-800">계정과목 자동 집계</p>
                  <p className="text-[11px] text-slate-500">동일 계정과목 자동 그룹화</p>
                </div>
                <input
                  type="checkbox"
                  checked={aiSettings.autoAggregate}
                  onChange={(e) => setAiSettings(prev => ({ ...prev, autoAggregate: e.target.checked }))}
                  className="w-4 h-4 text-amber-500 rounded border-slate-300"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div>
                  <p className="text-[13px] font-medium text-slate-800">계정과목 자동 생성 제안</p>
                  <p className="text-[11px] text-slate-500">새로운 계정과목 필요 시 AI 추천</p>
                </div>
                <input
                  type="checkbox"
                  checked={aiSettings.suggestAccounts}
                  onChange={(e) => setAiSettings(prev => ({ ...prev, suggestAccounts: e.target.checked }))}
                  className="w-4 h-4 text-amber-500 rounded border-slate-300"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div>
                  <p className="text-[13px] font-medium text-slate-800">전월 대비 분석</p>
                  <p className="text-[11px] text-slate-500">월간 증감 자동 분석</p>
                </div>
                <input
                  type="checkbox"
                  checked={aiSettings.compareMonthly}
                  onChange={(e) => setAiSettings(prev => ({ ...prev, compareMonthly: e.target.checked }))}
                  className="w-4 h-4 text-amber-500 rounded border-slate-300"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div>
                  <p className="text-[13px] font-medium text-slate-800">전년 대비 분석</p>
                  <p className="text-[11px] text-slate-500">전년 동기 대비 분석</p>
                </div>
                <input
                  type="checkbox"
                  checked={aiSettings.compareYearly}
                  onChange={(e) => setAiSettings(prev => ({ ...prev, compareYearly: e.target.checked }))}
                  className="w-4 h-4 text-amber-500 rounded border-slate-300"
                />
              </label>

              <div className="p-3 bg-slate-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-[13px] font-medium text-slate-800">이상치 자동 탐지</p>
                    <p className="text-[11px] text-slate-500">비정상 변동 자동 감지 및 알림</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={aiSettings.anomalyDetection}
                    onChange={(e) => setAiSettings(prev => ({ ...prev, anomalyDetection: e.target.checked }))}
                    className="w-4 h-4 text-amber-500 rounded border-slate-300"
                  />
                </div>
                {aiSettings.anomalyDetection && (
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <label className="block text-[11px] text-slate-600 mb-2">
                      이상치 임계값: {aiSettings.anomalyThreshold}% 이상 변동
                    </label>
                    <input
                      type="range"
                      min="5"
                      max="50"
                      value={aiSettings.anomalyThreshold}
                      onChange={(e) => setAiSettings(prev => ({ ...prev, anomalyThreshold: Number(e.target.value) }))}
                      className="w-full accent-amber-500"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 알림 설정 */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-[15px] font-semibold text-slate-800">알림 설정</h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-2 text-orange-600 mb-2">
              <Bell size={18} />
              <span className="text-[13px] font-medium">알림 채널</span>
            </div>

            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <span className="text-[13px] text-slate-800">이메일 알림</span>
                <input
                  type="checkbox"
                  checked={notifications.email}
                  onChange={(e) => setNotifications(prev => ({ ...prev, email: e.target.checked }))}
                  className="w-4 h-4 text-amber-500 rounded border-slate-300"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <span className="text-[13px] text-slate-800">Slack 알림</span>
                <input
                  type="checkbox"
                  checked={notifications.slack}
                  onChange={(e) => setNotifications(prev => ({ ...prev, slack: e.target.checked }))}
                  className="w-4 h-4 text-amber-500 rounded border-slate-300"
                />
              </label>
            </div>

            <div className="border-t pt-4 mt-4">
              <p className="text-[13px] font-medium text-slate-700 mb-3">알림 유형</p>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={notifications.anomalyAlert}
                    onChange={(e) => setNotifications(prev => ({ ...prev, anomalyAlert: e.target.checked }))}
                    className="w-4 h-4 text-amber-500 rounded border-slate-300"
                  />
                  <span className="text-[12px] text-slate-700">이상치 탐지 시 알림</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={notifications.reportComplete}
                    onChange={(e) => setNotifications(prev => ({ ...prev, reportComplete: e.target.checked }))}
                    className="w-4 h-4 text-amber-500 rounded border-slate-300"
                  />
                  <span className="text-[12px] text-slate-700">보고서 생성 완료 알림</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={notifications.syncError}
                    onChange={(e) => setNotifications(prev => ({ ...prev, syncError: e.target.checked }))}
                    className="w-4 h-4 text-amber-500 rounded border-slate-300"
                  />
                  <span className="text-[12px] text-slate-700">동기화 오류 알림</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* 시스템 정보 */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-[15px] font-semibold text-slate-800">시스템 정보</h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-[11px] text-slate-500 mb-1">버전</p>
                <p className="text-[14px] font-medium text-slate-800">2.0.0</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-[11px] text-slate-500 mb-1">AI 엔진</p>
                <p className="text-[14px] font-medium text-slate-800">Claude Sonnet</p>
              </div>
            </div>

            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="text-emerald-600" size={18} />
                <span className="text-[14px] font-medium text-emerald-800">시스템 정상</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[12px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                  <span className="text-emerald-700">API 서버</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                  <span className="text-emerald-700">ERP 연결</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                  <span className="text-emerald-700">AI 서비스</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                  <span className="text-emerald-700">데이터베이스</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
