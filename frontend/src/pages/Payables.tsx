import { CreditCard, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import Card from '../components/common/Card';

export default function Payables() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CreditCard className="text-red-600" size={28} />
        <h1 className="text-2xl font-bold text-gray-800">채무 관리 (AP)</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card title="총 채무">
          <div className="p-6 text-center">
            <CreditCard className="mx-auto text-blue-600 mb-3" size={32} />
            <div className="text-2xl font-bold text-gray-800 mb-2">-</div>
            <p className="text-sm text-gray-500">데이터 준비 중</p>
          </div>
        </Card>

        <Card title="미지급금">
          <div className="p-6 text-center">
            <Clock className="mx-auto text-orange-600 mb-3" size={32} />
            <div className="text-2xl font-bold text-gray-800 mb-2">-</div>
            <p className="text-sm text-gray-500">데이터 준비 중</p>
          </div>
        </Card>

        <Card title="지급 완료">
          <div className="p-6 text-center">
            <CheckCircle2 className="mx-auto text-green-600 mb-3" size={32} />
            <div className="text-2xl font-bold text-gray-800 mb-2">-</div>
            <p className="text-sm text-gray-500">데이터 준비 중</p>
          </div>
        </Card>

        <Card title="연체">
          <div className="p-6 text-center">
            <AlertCircle className="mx-auto text-red-600 mb-3" size={32} />
            <div className="text-2xl font-bold text-gray-800 mb-2">-</div>
            <p className="text-sm text-gray-500">데이터 준비 중</p>
          </div>
        </Card>
      </div>

      <Card title="채무 상세 내역">
        <div className="p-6 text-center text-gray-500">
          <p>채무 관리 기능이 곧 제공될 예정입니다.</p>
          <p className="text-sm mt-2">공급처별 채무 현황, 지급 예정일, 결제 내역 등을 관리할 수 있습니다.</p>
        </div>
      </Card>
    </div>
  );
}
