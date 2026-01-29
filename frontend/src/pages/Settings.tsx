import { useState } from 'react';
import Card from '../components/common/Card';
import {
  Server, Database, Key, TestTube, AlertCircle, CheckCircle,
  Clock, Calendar, RefreshCw, Zap, Brain, Bell, FileText,
  Link, Settings as SettingsIcon, Play, Pause
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
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500 animate-pulse';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-400';
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">설정</h1>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Clock size={16} />
          마지막 동기화: {lastSync}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ERP 연동 설정 */}
        <Card title="ERP 데이터 연동">
          <div className="space-y-4">
            {/* 연결 상태 표시 */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(connectionStatus)}`}></div>
                <div>
                  <p className="font-medium">{getStatusText(connectionStatus)}</p>
                  <p className="text-sm text-gray-500">SAP ERP 시스템</p>
                </div>
              </div>
              <button
                onClick={handleManualSync}
                disabled={connectionStatus === 'connecting'}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
              >
                <RefreshCw size={16} className={connectionStatus === 'connecting' ? 'animate-spin' : ''} />
                수동 동기화
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Server size={16} className="inline mr-1" />
                ERP 유형
              </label>
              <select
                value={erpConfig.erp_type}
                onChange={(e) => setErpConfig(prev => ({ ...prev, erp_type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="SAP">SAP S/4HANA</option>
                <option value="Oracle">Oracle EBS</option>
                <option value="Douzone">더존 iCUBE</option>
                <option value="Yonyou">용우 U8</option>
                <option value="Custom">자체 ERP (REST API)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Database size={16} className="inline mr-1" />
                API Endpoint
              </label>
              <input
                type="text"
                value={erpConfig.base_url}
                onChange={(e) => setErpConfig(prev => ({ ...prev, base_url: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Key size={16} className="inline mr-1" />
                API Key
              </label>
              <input
                type="password"
                value={erpConfig.api_key}
                onChange={(e) => setErpConfig(prev => ({ ...prev, api_key: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleTestConnection}
                disabled={connectionStatus === 'connecting'}
                className="flex-1 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 flex items-center justify-center gap-2"
              >
                <TestTube size={18} /> 연결 테스트
              </button>
              <button className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                설정 저장
              </button>
            </div>
          </div>
        </Card>

        {/* 데이터 수집 설정 */}
        <Card title="데이터 수집 항목">
          <div className="space-y-4">
            <p className="text-sm text-gray-600">ERP에서 자동으로 수집할 데이터 유형을 선택하세요.</p>

            <div className="space-y-3">
              {[
                { key: 'sales', label: '매출 데이터', desc: '매출액, 매출처, 제품별 매출' },
                { key: 'cost', label: '원가 데이터', desc: '원재료비, 노무비, 제조경비' },
                { key: 'expense', label: '비용 데이터', desc: '판매관리비, 일반관리비' },
                { key: 'spending', label: '지출 데이터', desc: '구매, 결제, 투자 지출' }
              ].map(item => (
                <label key={item.key} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                  <input
                    type="checkbox"
                    checked={dataCollection[item.key as keyof typeof dataCollection]}
                    onChange={(e) => setDataCollection(prev => ({ ...prev, [item.key]: e.target.checked }))}
                    className="w-5 h-5 text-blue-600 rounded mt-0.5"
                  />
                  <div>
                    <p className="font-medium text-gray-800">{item.label}</p>
                    <p className="text-sm text-gray-500">{item.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </Card>

        {/* 스케줄링 설정 */}
        <Card title="자동 동기화 스케줄">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar size={20} className="text-blue-600" />
                <span className="font-medium">자동 동기화</span>
              </div>
              <button
                onClick={() => setSchedule(prev => ({ ...prev, enabled: !prev.enabled }))}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  schedule.enabled ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  schedule.enabled ? 'left-7' : 'left-1'
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
                      className={`py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                        schedule.type === type
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {type === 'daily' ? '매일' : type === 'weekly' ? '매주' : '매월'}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">실행 시간</label>
                    <input
                      type="time"
                      value={schedule.time}
                      onChange={(e) => setSchedule(prev => ({ ...prev, time: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>

                  {schedule.type === 'weekly' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">요일</label>
                      <select
                        value={schedule.dayOfWeek}
                        onChange={(e) => setSchedule(prev => ({ ...prev, dayOfWeek: Number(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
                          <option key={i} value={i}>{day}요일</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {schedule.type === 'monthly' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">날짜</label>
                      <select
                        value={schedule.dayOfMonth}
                        onChange={(e) => setSchedule(prev => ({ ...prev, dayOfMonth: Number(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        {Array.from({ length: 28 }, (_, i) => (
                          <option key={i + 1} value={i + 1}>{i + 1}일</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <Clock size={14} className="inline mr-1" />
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
        </Card>

        {/* AI 분석 설정 */}
        <Card title="AI 손익 분석 설정">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-blue-600 mb-2">
              <Brain size={20} />
              <span className="font-medium">Claude AI 기반 분석</span>
            </div>

            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">계정과목 자동 집계</p>
                  <p className="text-sm text-gray-500">동일 계정과목 자동 그룹화</p>
                </div>
                <input
                  type="checkbox"
                  checked={aiSettings.autoAggregate}
                  onChange={(e) => setAiSettings(prev => ({ ...prev, autoAggregate: e.target.checked }))}
                  className="w-5 h-5 text-blue-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">계정과목 자동 생성 제안</p>
                  <p className="text-sm text-gray-500">새로운 계정과목 필요 시 AI 추천</p>
                </div>
                <input
                  type="checkbox"
                  checked={aiSettings.suggestAccounts}
                  onChange={(e) => setAiSettings(prev => ({ ...prev, suggestAccounts: e.target.checked }))}
                  className="w-5 h-5 text-blue-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">전월 대비 분석</p>
                  <p className="text-sm text-gray-500">월간 증감 자동 분석</p>
                </div>
                <input
                  type="checkbox"
                  checked={aiSettings.compareMonthly}
                  onChange={(e) => setAiSettings(prev => ({ ...prev, compareMonthly: e.target.checked }))}
                  className="w-5 h-5 text-blue-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">전년 대비 분석</p>
                  <p className="text-sm text-gray-500">전년 동기 대비 분석</p>
                </div>
                <input
                  type="checkbox"
                  checked={aiSettings.compareYearly}
                  onChange={(e) => setAiSettings(prev => ({ ...prev, compareYearly: e.target.checked }))}
                  className="w-5 h-5 text-blue-600 rounded"
                />
              </label>

              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium">이상치 자동 탐지</p>
                    <p className="text-sm text-gray-500">비정상 변동 자동 감지 및 알림</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={aiSettings.anomalyDetection}
                    onChange={(e) => setAiSettings(prev => ({ ...prev, anomalyDetection: e.target.checked }))}
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                </div>
                {aiSettings.anomalyDetection && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <label className="block text-sm text-gray-600 mb-1">
                      이상치 임계값: {aiSettings.anomalyThreshold}% 이상 변동
                    </label>
                    <input
                      type="range"
                      min="5"
                      max="50"
                      value={aiSettings.anomalyThreshold}
                      onChange={(e) => setAiSettings(prev => ({ ...prev, anomalyThreshold: Number(e.target.value) }))}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* 알림 설정 */}
        <Card title="알림 설정">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-orange-600 mb-2">
              <Bell size={20} />
              <span className="font-medium">알림 채널</span>
            </div>

            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span>이메일 알림</span>
                <input
                  type="checkbox"
                  checked={notifications.email}
                  onChange={(e) => setNotifications(prev => ({ ...prev, email: e.target.checked }))}
                  className="w-5 h-5 text-blue-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span>Slack 알림</span>
                <input
                  type="checkbox"
                  checked={notifications.slack}
                  onChange={(e) => setNotifications(prev => ({ ...prev, slack: e.target.checked }))}
                  className="w-5 h-5 text-blue-600 rounded"
                />
              </label>
            </div>

            <div className="border-t pt-4 mt-4">
              <p className="font-medium text-gray-700 mb-3">알림 유형</p>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={notifications.anomalyAlert}
                    onChange={(e) => setNotifications(prev => ({ ...prev, anomalyAlert: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm">이상치 탐지 시 알림</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={notifications.reportComplete}
                    onChange={(e) => setNotifications(prev => ({ ...prev, reportComplete: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm">보고서 생성 완료 알림</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={notifications.syncError}
                    onChange={(e) => setNotifications(prev => ({ ...prev, syncError: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm">동기화 오류 알림</span>
                </label>
              </div>
            </div>
          </div>
        </Card>

        {/* 시스템 정보 */}
        <Card title="시스템 정보">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">버전</p>
                <p className="font-medium">2.0.0</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">AI 엔진</p>
                <p className="font-medium">Claude Sonnet</p>
              </div>
            </div>

            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="text-green-600" size={20} />
                <span className="font-medium text-green-800">시스템 정상</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span>API 서버</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span>ERP 연결</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span>AI 서비스</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span>데이터베이스</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
