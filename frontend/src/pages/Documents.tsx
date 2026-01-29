import { useState, useRef } from 'react';
import { FileText, Ship, FileCheck, Receipt, Upload, Sparkles, AlertCircle, CheckCircle, Package, Loader2, X, ChevronRight } from 'lucide-react';
import { uploadInvoice, uploadBL, uploadPackingList, uploadLC, compareDocuments, reviewLCConditions } from '../services/api';

type DocType = 'invoice' | 'bl' | 'packing' | 'lc';
type TabType = 'upload' | 'parsed' | 'reconcile' | 'lc-check';

interface ParsedInvoiceData {
  invoice_no?: string;
  date?: string;
  customer?: string;
  customer_address?: string;
  country?: string;
  currency?: string;
  items?: Array<{
    product: string;
    quantity: number;
    unit: string;
    unit_price: number;
    amount: number;
  }>;
  total?: number;
  payment_terms?: string;
  incoterms?: string;
  origin?: string;
}

interface ParsedBLData {
  bl_no?: string;
  shipper?: string;
  consignee?: string;
  notify_party?: string;
  vessel?: string;
  voyage_no?: string;
  port_of_loading?: string;
  port_of_discharge?: string;
  ship_date?: string;
  cargo_description?: string;
  quantity?: number;
  unit?: string;
  gross_weight?: string;
  measurement?: string;
  container_no?: string;
  seal_no?: string;
  freight?: string;
}

interface ParsedPackingData {
  packing_list_no?: string;
  invoice_ref?: string;
  date?: string;
  shipper?: string;
  consignee?: string;
  items?: Array<{
    product: string;
    quantity: number;
    unit: string;
    net_weight: number;
    gross_weight: number;
    measurement: string;
    carton_no: string;
  }>;
  total_packages?: number;
  total_net_weight?: number;
  total_gross_weight?: number;
  total_measurement?: string;
}

interface ParsedLCData {
  lc_no?: string;
  issuing_bank?: string;
  applicant?: string;
  beneficiary?: string;
  amount?: number;
  currency?: string;
  expiry_date?: string;
  latest_shipment_date?: string;
  partial_shipment?: string;
  transhipment?: string;
  payment_terms?: string;
}

interface DocumentItem {
  id: string;
  type: DocType;
  typeName: string;
  fileName: string;
  uploadDate: string;
  status: 'uploading' | 'parsing' | 'parsed' | 'confirmed' | 'error';
  parsedData?: ParsedInvoiceData | ParsedBLData | ParsedPackingData | ParsedLCData;
  error?: string;
}

interface CompareResult {
  match_status: string;
  discrepancies: Array<{
    field: string;
    invoice_value: string;
    bl_value: string;
    packing_list_value?: string;
    difference: string;
    severity: 'high' | 'medium' | 'low';
    possible_cause: string;
  }>;
  critical_issues: string[];
  recommendations: string[];
  summary: string;
}

interface LCReviewResult {
  lc_no: string;
  risk_level: 'high' | 'medium' | 'low';
  findings: Array<{
    category: string;
    severity: 'high' | 'medium' | 'low';
    item: string;
    condition: string;
    comment: string;
    action_required: boolean;
  }>;
  checklist: Array<{
    item: string;
    status: 'ok' | 'pending' | 'failed';
    comment: string;
  }>;
  recommendations: string[];
}

export default function Documents() {
  const [activeTab, setActiveTab] = useState<TabType>('upload');
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [uploading, setUploading] = useState<DocType | null>(null);
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);
  const [lcReviewResult, setLcReviewResult] = useState<LCReviewResult | null>(null);
  const [comparing, setComparing] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  const invoiceInputRef = useRef<HTMLInputElement>(null);
  const blInputRef = useRef<HTMLInputElement>(null);
  const packingInputRef = useRef<HTMLInputElement>(null);
  const lcInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File, type: DocType) => {
    const typeName = {
      invoice: 'Commercial Invoice',
      bl: 'B/L (선하증권)',
      packing: 'Packing List',
      lc: 'L/C (신용장)'
    }[type];

    const tempId = `temp-${Date.now()}`;
    const newDoc: DocumentItem = {
      id: tempId,
      type,
      typeName,
      fileName: file.name,
      uploadDate: new Date().toISOString().split('T')[0],
      status: 'uploading'
    };

    setDocuments(prev => [...prev, newDoc]);
    setUploading(type);

    try {
      // 상태를 파싱 중으로 변경
      setDocuments(prev => prev.map(d =>
        d.id === tempId ? { ...d, status: 'parsing' } : d
      ));

      let result;
      switch (type) {
        case 'invoice':
          result = await uploadInvoice(file);
          break;
        case 'bl':
          result = await uploadBL(file);
          break;
        case 'packing':
          result = await uploadPackingList(file);
          break;
        case 'lc':
          result = await uploadLC(file);
          break;
      }

      if (result.success) {
        setDocuments(prev => prev.map(d =>
          d.id === tempId ? {
            ...d,
            id: result.file_id,
            status: result.parsed?.success ? 'parsed' : 'error',
            parsedData: result.parsed?.data,
            error: result.parsed?.error || result.parsed?.parse_error
          } : d
        ));
      } else {
        setDocuments(prev => prev.map(d =>
          d.id === tempId ? { ...d, status: 'error', error: result.error } : d
        ));
      }
    } catch (error) {
      setDocuments(prev => prev.map(d =>
        d.id === tempId ? { ...d, status: 'error', error: String(error) } : d
      ));
    } finally {
      setUploading(null);
    }
  };

  const handleCompareDocuments = async () => {
    const invoice = documents.find(d => d.type === 'invoice' && d.status === 'parsed');
    const bl = documents.find(d => d.type === 'bl' && d.status === 'parsed');
    const packing = documents.find(d => d.type === 'packing' && d.status === 'parsed');

    if (!invoice || !bl) {
      alert('Invoice와 B/L이 모두 파싱되어야 대사가 가능합니다.');
      return;
    }

    setComparing(true);
    try {
      const result = await compareDocuments(
        invoice.parsedData as Record<string, unknown>,
        bl.parsedData as Record<string, unknown>,
        packing?.parsedData as Record<string, unknown> | undefined
      );
      if (result.success) {
        setCompareResult(result.comparison);
      }
    } catch (error) {
      console.error('서류 대사 오류:', error);
    } finally {
      setComparing(false);
    }
  };

  const handleLCReview = async () => {
    const lc = documents.find(d => d.type === 'lc' && d.status === 'parsed');
    if (!lc) {
      alert('L/C가 파싱되어야 검토가 가능합니다.');
      return;
    }

    setReviewing(true);
    try {
      const result = await reviewLCConditions(lc.parsedData as Record<string, unknown>);
      if (result.success !== false) {
        setLcReviewResult(result);
      }
    } catch (error) {
      console.error('L/C 검토 오류:', error);
    } finally {
      setReviewing(false);
    }
  };

  const removeDocument = (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
  };

  const getDocIcon = (type: DocType) => {
    switch (type) {
      case 'invoice': return <Receipt className="text-amber-600" size={20} />;
      case 'bl': return <Ship className="text-emerald-600" size={20} />;
      case 'packing': return <Package className="text-violet-600" size={20} />;
      case 'lc': return <FileCheck className="text-slate-600" size={20} />;
    }
  };

  const getStatusBadge = (status: DocumentItem['status']) => {
    switch (status) {
      case 'uploading':
        return <span className="badge bg-slate-100 text-slate-600">업로드중...</span>;
      case 'parsing':
        return <span className="badge bg-amber-50 text-amber-700">AI 파싱중...</span>;
      case 'parsed':
        return <span className="badge bg-emerald-50 text-emerald-700">파싱완료</span>;
      case 'confirmed':
        return <span className="badge bg-blue-50 text-blue-700">확정</span>;
      case 'error':
        return <span className="badge bg-red-50 text-red-700">오류</span>;
    }
  };

  const tabs = [
    { id: 'upload' as const, label: '서류 업로드' },
    { id: 'parsed' as const, label: '파싱 결과', count: documents.filter(d => d.status === 'parsed').length },
    { id: 'reconcile' as const, label: '서류 대사' },
    { id: 'lc-check' as const, label: 'L/C 조건 검토' },
  ];

  const docCounts = {
    invoice: documents.filter(d => d.type === 'invoice').length,
    bl: documents.filter(d => d.type === 'bl').length,
    packing: documents.filter(d => d.type === 'packing').length,
    lc: documents.filter(d => d.type === 'lc').length,
  };

  return (
    <div className="animate-in space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[22px] font-semibold text-slate-900 tracking-tight">무역 서류 센터</h1>
        <p className="text-[13px] text-slate-500 mt-1">AI OCR을 통한 무역서류 자동 파싱 및 대사</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 card-interactive">
          <div className="flex items-center justify-between mb-3">
            <Receipt size={18} className="text-slate-600" />
            <span className="text-[11px] text-slate-400 uppercase tracking-wide">Invoice</span>
          </div>
          <p className="text-[28px] font-semibold text-slate-900 tabular-nums">{docCounts.invoice}</p>
          <p className="text-[12px] text-slate-500 mt-1">Commercial Invoice</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 card-interactive">
          <div className="flex items-center justify-between mb-3">
            <Ship size={18} className="text-emerald-600" />
            <span className="text-[11px] text-slate-400 uppercase tracking-wide">B/L</span>
          </div>
          <p className="text-[28px] font-semibold text-slate-900 tabular-nums">{docCounts.bl}</p>
          <p className="text-[12px] text-slate-500 mt-1">선하증권</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 card-interactive">
          <div className="flex items-center justify-between mb-3">
            <Package size={18} className="text-violet-600" />
            <span className="text-[11px] text-slate-400 uppercase tracking-wide">P/L</span>
          </div>
          <p className="text-[28px] font-semibold text-slate-900 tabular-nums">{docCounts.packing}</p>
          <p className="text-[12px] text-slate-500 mt-1">Packing List</p>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-5 text-white card-interactive">
          <div className="flex items-center justify-between mb-3">
            <FileCheck size={18} className="text-amber-200" />
            <span className="text-[11px] text-amber-200 uppercase tracking-wide">L/C</span>
          </div>
          <p className="text-[28px] font-semibold tabular-nums">{docCounts.lc}</p>
          <p className="text-[12px] text-amber-100 mt-1">신용장</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-[13px] font-medium transition-all relative flex items-center gap-2 ${
              activeTab === tab.id
                ? 'text-amber-700'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="px-1.5 py-0.5 text-[11px] bg-amber-100 text-amber-700 rounded-full">
                {tab.count}
              </span>
            )}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'upload' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Hidden file inputs */}
          <input
            ref={invoiceInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'invoice')}
          />
          <input
            ref={blInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'bl')}
          />
          <input
            ref={packingInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'packing')}
          />
          <input
            ref={lcInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'lc')}
          />

          {/* Commercial Invoice */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 card-interactive">
            <div className="flex items-center gap-2 mb-4">
              <Receipt className="text-amber-600" size={18} />
              <span className="text-[14px] font-medium text-slate-800">Commercial Invoice</span>
              <Sparkles className="text-amber-500" size={14} />
            </div>
            <div
              onClick={() => !uploading && invoiceInputRef.current?.click()}
              className={`border-2 border-dashed border-slate-200 rounded-lg p-8 text-center transition-all cursor-pointer group ${
                uploading === 'invoice' ? 'bg-amber-50 border-amber-300' : 'hover:border-amber-400 hover:bg-amber-50/30'
              }`}
            >
              {uploading === 'invoice' ? (
                <>
                  <Loader2 className="mx-auto text-amber-500 mb-2 animate-spin" size={28} />
                  <p className="text-[13px] text-amber-700 font-medium">AI가 분석 중입니다...</p>
                  <p className="text-[11px] text-amber-500 mt-1">인보이스 정보 추출 중</p>
                </>
              ) : (
                <>
                  <Upload className="mx-auto text-slate-300 group-hover:text-amber-500 mb-2 transition-colors" size={28} />
                  <p className="text-[13px] text-slate-600">PDF 또는 이미지 업로드</p>
                  <p className="text-[11px] text-slate-400 mt-1">AI OCR 자동 파싱</p>
                </>
              )}
            </div>
          </div>

          {/* B/L */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 card-interactive">
            <div className="flex items-center gap-2 mb-4">
              <Ship className="text-emerald-600" size={18} />
              <span className="text-[14px] font-medium text-slate-800">B/L (선하증권)</span>
              <Sparkles className="text-amber-500" size={14} />
            </div>
            <div
              onClick={() => !uploading && blInputRef.current?.click()}
              className={`border-2 border-dashed border-slate-200 rounded-lg p-8 text-center transition-all cursor-pointer group ${
                uploading === 'bl' ? 'bg-emerald-50 border-emerald-300' : 'hover:border-emerald-400 hover:bg-emerald-50/30'
              }`}
            >
              {uploading === 'bl' ? (
                <>
                  <Loader2 className="mx-auto text-emerald-500 mb-2 animate-spin" size={28} />
                  <p className="text-[13px] text-emerald-700 font-medium">AI가 분석 중입니다...</p>
                  <p className="text-[11px] text-emerald-500 mt-1">선적 정보 추출 중</p>
                </>
              ) : (
                <>
                  <Upload className="mx-auto text-slate-300 group-hover:text-emerald-500 mb-2 transition-colors" size={28} />
                  <p className="text-[13px] text-slate-600">B/L 파일 업로드</p>
                  <p className="text-[11px] text-slate-400 mt-1">선적일, 목적항 자동 추출</p>
                </>
              )}
            </div>
          </div>

          {/* Packing List */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 card-interactive">
            <div className="flex items-center gap-2 mb-4">
              <Package className="text-violet-600" size={18} />
              <span className="text-[14px] font-medium text-slate-800">Packing List</span>
              <Sparkles className="text-amber-500" size={14} />
            </div>
            <div
              onClick={() => !uploading && packingInputRef.current?.click()}
              className={`border-2 border-dashed border-slate-200 rounded-lg p-8 text-center transition-all cursor-pointer group ${
                uploading === 'packing' ? 'bg-violet-50 border-violet-300' : 'hover:border-violet-400 hover:bg-violet-50/30'
              }`}
            >
              {uploading === 'packing' ? (
                <>
                  <Loader2 className="mx-auto text-violet-500 mb-2 animate-spin" size={28} />
                  <p className="text-[13px] text-violet-700 font-medium">AI가 분석 중입니다...</p>
                  <p className="text-[11px] text-violet-500 mt-1">포장 정보 추출 중</p>
                </>
              ) : (
                <>
                  <Upload className="mx-auto text-slate-300 group-hover:text-violet-500 mb-2 transition-colors" size={28} />
                  <p className="text-[13px] text-slate-600">Packing List 업로드</p>
                  <p className="text-[11px] text-slate-400 mt-1">포장 상세 정보 추출</p>
                </>
              )}
            </div>
          </div>

          {/* L/C */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 card-interactive">
            <div className="flex items-center gap-2 mb-4">
              <FileCheck className="text-slate-600" size={18} />
              <span className="text-[14px] font-medium text-slate-800">L/C (신용장)</span>
              <Sparkles className="text-amber-500" size={14} />
            </div>
            <div
              onClick={() => !uploading && lcInputRef.current?.click()}
              className={`border-2 border-dashed border-slate-200 rounded-lg p-8 text-center transition-all cursor-pointer group ${
                uploading === 'lc' ? 'bg-amber-50 border-amber-300' : 'hover:border-amber-400 hover:bg-amber-50/30'
              }`}
            >
              {uploading === 'lc' ? (
                <>
                  <Loader2 className="mx-auto text-amber-500 mb-2 animate-spin" size={28} />
                  <p className="text-[13px] text-amber-700 font-medium">AI가 분석 중입니다...</p>
                  <p className="text-[11px] text-amber-500 mt-1">신용장 조건 추출 중</p>
                </>
              ) : (
                <>
                  <Upload className="mx-auto text-slate-300 group-hover:text-amber-500 mb-2 transition-colors" size={28} />
                  <p className="text-[13px] text-slate-600">L/C 서류 업로드</p>
                  <p className="text-[11px] text-slate-400 mt-1">신용장 조건 자동 추출</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'parsed' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-5">
            <Sparkles className="text-amber-500" size={16} />
            <span className="text-[14px] font-medium text-slate-800">AI 파싱 결과</span>
          </div>

          <div className="space-y-4">
            {documents.map((doc) => (
              <div key={doc.id} className="p-4 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {getDocIcon(doc.type)}
                    <div>
                      <p className="text-[14px] font-medium text-slate-800">{doc.fileName}</p>
                      <p className="text-[11px] text-slate-400">{doc.typeName} | {doc.uploadDate}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(doc.status)}
                    <button
                      onClick={() => removeDocument(doc.id)}
                      className="p-1 hover:bg-slate-100 rounded transition-colors"
                    >
                      <X size={14} className="text-slate-400" />
                    </button>
                  </div>
                </div>

                {doc.status === 'parsing' && (
                  <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg">
                    <Loader2 className="text-amber-500 animate-spin" size={16} />
                    <span className="text-[13px] text-amber-700">AI가 서류를 분석하고 있습니다...</span>
                  </div>
                )}

                {doc.status === 'error' && (
                  <div className="p-3 bg-red-50 rounded-lg">
                    <p className="text-[13px] text-red-700">{doc.error || '파싱 중 오류가 발생했습니다.'}</p>
                  </div>
                )}

                {doc.parsedData && doc.status === 'parsed' && (
                  <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                    <p className="text-[12px] font-medium text-slate-600 mb-2">추출된 데이터</p>
                    <div className="grid grid-cols-2 gap-2 text-[13px]">
                      {Object.entries(doc.parsedData).map(([key, value]) => {
                        if (Array.isArray(value)) {
                          return (
                            <div key={key} className="col-span-2">
                              <span className="text-slate-400">{key}: </span>
                              <span className="font-medium text-slate-700">{value.length}개 항목</span>
                            </div>
                          );
                        }
                        if (typeof value === 'object' && value !== null) {
                          return null;
                        }
                        return (
                          <div key={key}>
                            <span className="text-slate-400">{key}: </span>
                            <span className="font-medium text-slate-700">{String(value)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {documents.length === 0 && (
              <div className="py-12 text-center text-slate-400">
                <FileText className="mx-auto mb-3 text-slate-200" size={48} />
                <p>파싱된 서류가 없습니다.</p>
                <p className="text-[12px] mt-1">서류를 업로드해주세요.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'reconcile' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="text-amber-500" size={16} />
              <span className="text-[14px] font-medium text-slate-800">서류 대사 (Invoice vs B/L vs P/L)</span>
            </div>
            <button
              onClick={handleCompareDocuments}
              disabled={comparing || documents.filter(d => d.status === 'parsed').length < 2}
              className="px-4 py-2 bg-slate-900 text-white text-[13px] font-medium rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {comparing ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  AI 분석 중...
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  AI 대사 실행
                </>
              )}
            </button>
          </div>

          <div className="p-4 bg-gradient-to-r from-amber-50 to-amber-100/50 border border-amber-200 rounded-lg mb-5">
            <p className="text-[13px] text-amber-800">
              AI가 자동으로 Invoice, B/L, Packing List를 비교하여 불일치 항목을 찾아냅니다.
            </p>
          </div>

          {/* 업로드된 서류 현황 */}
          <div className="mb-5 p-4 bg-slate-50 rounded-lg">
            <p className="text-[12px] font-medium text-slate-600 mb-3">대사 대상 서류</p>
            <div className="flex gap-4">
              {['invoice', 'bl', 'packing'].map((type) => {
                const doc = documents.find(d => d.type === type && d.status === 'parsed');
                return (
                  <div key={type} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                    doc ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {doc ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                    <span className="text-[12px] font-medium">
                      {type === 'invoice' ? 'Invoice' : type === 'bl' ? 'B/L' : 'P/L'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 대사 결과 */}
          {compareResult && (
            <div className="space-y-4">
              {/* 요약 */}
              <div className={`p-4 rounded-lg border-l-4 ${
                compareResult.match_status === '일치'
                  ? 'border-emerald-500 bg-emerald-50/50'
                  : 'border-amber-500 bg-amber-50/50'
              }`}>
                <div className="flex items-start gap-3">
                  {compareResult.match_status === '일치' ? (
                    <CheckCircle className="text-emerald-600 mt-0.5" size={18} />
                  ) : (
                    <AlertCircle className="text-amber-600 mt-0.5" size={18} />
                  )}
                  <div>
                    <p className={`text-[14px] font-medium ${
                      compareResult.match_status === '일치' ? 'text-emerald-900' : 'text-amber-900'
                    }`}>
                      대사 결과: {compareResult.match_status}
                    </p>
                    <p className={`text-[13px] mt-1 ${
                      compareResult.match_status === '일치' ? 'text-emerald-700' : 'text-amber-700'
                    }`}>
                      {compareResult.summary}
                    </p>
                  </div>
                </div>
              </div>

              {/* 불일치 항목 */}
              {compareResult.discrepancies && compareResult.discrepancies.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[13px] font-medium text-slate-700">불일치 항목</p>
                  {compareResult.discrepancies.map((disc, idx) => (
                    <div key={idx} className={`p-4 rounded-lg border-l-4 ${
                      disc.severity === 'high' ? 'border-red-500 bg-red-50/50' :
                      disc.severity === 'medium' ? 'border-amber-500 bg-amber-50/50' :
                      'border-slate-400 bg-slate-50/50'
                    }`}>
                      <p className="text-[13px] font-medium text-slate-800">{disc.field}</p>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
                        <div>
                          <span className="text-slate-400">Invoice: </span>
                          <span className="text-slate-700">{disc.invoice_value}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">B/L: </span>
                          <span className="text-slate-700">{disc.bl_value}</span>
                        </div>
                      </div>
                      <div className="mt-2 p-2 bg-white/60 rounded">
                        <p className="text-[11px] text-slate-600">
                          <strong>AI 추론:</strong> {disc.possible_cause}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 권장사항 */}
              {compareResult.recommendations && compareResult.recommendations.length > 0 && (
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-[12px] font-medium text-slate-600 mb-2">권장 조치사항</p>
                  <ul className="space-y-1">
                    {compareResult.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-[13px] text-slate-700">
                        <ChevronRight size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {!compareResult && !comparing && (
            <div className="py-8 text-center text-slate-400">
              <p className="text-[13px]">Invoice와 B/L을 업로드한 후 "AI 대사 실행" 버튼을 클릭하세요.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'lc-check' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="text-amber-500" size={16} />
              <span className="text-[14px] font-medium text-slate-800">L/C 조건 vs 서류 자동 검토</span>
            </div>
            <button
              onClick={handleLCReview}
              disabled={reviewing || !documents.find(d => d.type === 'lc' && d.status === 'parsed')}
              className="px-4 py-2 bg-slate-900 text-white text-[13px] font-medium rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {reviewing ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  AI 검토 중...
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  AI 검토 실행
                </>
              )}
            </button>
          </div>

          <div className="p-4 bg-gradient-to-r from-slate-50 to-slate-100/50 border border-slate-200 rounded-lg mb-5">
            <p className="text-[13px] text-slate-700">
              AI가 신용장 조건과 제출 서류를 비교하여 불일치 항목 및 리스크를 알려줍니다.
            </p>
          </div>

          {/* L/C 업로드 상태 */}
          <div className="mb-5 p-4 bg-slate-50 rounded-lg">
            <p className="text-[12px] font-medium text-slate-600 mb-3">검토 대상</p>
            {documents.find(d => d.type === 'lc' && d.status === 'parsed') ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg w-fit">
                <CheckCircle size={14} />
                <span className="text-[12px] font-medium">L/C 파싱 완료</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-400 rounded-lg w-fit">
                <AlertCircle size={14} />
                <span className="text-[12px] font-medium">L/C를 먼저 업로드하세요</span>
              </div>
            )}
          </div>

          {/* L/C 검토 결과 */}
          {lcReviewResult && (
            <div className="space-y-4">
              {/* 리스크 레벨 */}
              <div className={`p-4 rounded-lg border-l-4 ${
                lcReviewResult.risk_level === 'high' ? 'border-red-500 bg-red-50/50' :
                lcReviewResult.risk_level === 'medium' ? 'border-amber-500 bg-amber-50/50' :
                'border-emerald-500 bg-emerald-50/50'
              }`}>
                <div className="flex items-center gap-2">
                  <p className="text-[14px] font-medium text-slate-800">
                    L/C #{lcReviewResult.lc_no}
                  </p>
                  <span className={`px-2 py-0.5 text-[11px] font-medium rounded ${
                    lcReviewResult.risk_level === 'high' ? 'bg-red-100 text-red-700' :
                    lcReviewResult.risk_level === 'medium' ? 'bg-amber-100 text-amber-700' :
                    'bg-emerald-100 text-emerald-700'
                  }`}>
                    {lcReviewResult.risk_level.toUpperCase()} RISK
                  </span>
                </div>
              </div>

              {/* Findings */}
              {lcReviewResult.findings && lcReviewResult.findings.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[13px] font-medium text-slate-700">검토 결과</p>
                  {lcReviewResult.findings.map((finding, idx) => (
                    <div key={idx} className={`p-4 rounded-lg border-l-4 ${
                      finding.severity === 'high' ? 'border-red-500 bg-red-50/50' :
                      finding.severity === 'medium' ? 'border-amber-500 bg-amber-50/50' :
                      'border-emerald-500 bg-emerald-50/50'
                    }`}>
                      <div className="flex items-start gap-3">
                        {finding.severity === 'high' ? (
                          <AlertCircle className="text-red-600 mt-0.5" size={16} />
                        ) : finding.severity === 'medium' ? (
                          <AlertCircle className="text-amber-600 mt-0.5" size={16} />
                        ) : (
                          <CheckCircle className="text-emerald-600 mt-0.5" size={16} />
                        )}
                        <div className="flex-1">
                          <p className="text-[13px] font-medium text-slate-800">{finding.item}</p>
                          <p className="text-[12px] text-slate-500 mt-1">{finding.condition}</p>
                          <p className="text-[12px] text-slate-700 mt-2">{finding.comment}</p>
                          {finding.action_required && (
                            <span className="inline-block mt-2 px-2 py-0.5 text-[10px] bg-red-100 text-red-700 rounded">
                              조치 필요
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Checklist */}
              {lcReviewResult.checklist && lcReviewResult.checklist.length > 0 && (
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-[12px] font-medium text-slate-600 mb-3">체크리스트</p>
                  <div className="space-y-2">
                    {lcReviewResult.checklist.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        {item.status === 'ok' ? (
                          <CheckCircle size={14} className="text-emerald-500" />
                        ) : item.status === 'pending' ? (
                          <AlertCircle size={14} className="text-amber-500" />
                        ) : (
                          <X size={14} className="text-red-500" />
                        )}
                        <span className="text-[13px] text-slate-700 flex-1">{item.item}</span>
                        <span className="text-[12px] text-slate-400">{item.comment}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 권장사항 */}
              {lcReviewResult.recommendations && lcReviewResult.recommendations.length > 0 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-[12px] font-medium text-amber-800 mb-2">권장 조치사항</p>
                  <ul className="space-y-1">
                    {lcReviewResult.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-[13px] text-amber-700">
                        <ChevronRight size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {!lcReviewResult && !reviewing && (
            <div className="py-8 text-center text-slate-400">
              <p className="text-[13px]">L/C를 업로드한 후 "AI 검토 실행" 버튼을 클릭하세요.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
