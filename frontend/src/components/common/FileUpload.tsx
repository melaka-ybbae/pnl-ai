import { useState, useRef } from 'react';
import { Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { uploadExcel } from '../../services/api';
import { useAnalysisStore } from '../../stores/analysisStore';

export default function FileUpload() {
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { setData, setError, data } = useAnalysisStore();

  const handleFile = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/)) {
      setStatus('error');
      setMessage('엑셀 파일만 업로드 가능합니다.');
      return;
    }

    setStatus('loading');
    setMessage('업로드 중...');

    try {
      const response = await uploadExcel(file);

      if (response.success && response.data) {
        setData(response.data);
        setStatus('success');
        setMessage(`${response.data.periods.length}개 기간 로드됨`);

        // 3초 후 상태 초기화
        setTimeout(() => {
          setStatus('idle');
          setMessage('');
        }, 3000);
      } else {
        setStatus('error');
        setMessage(response.message || '업로드 실패');
        setError(response.message);
      }
    } catch (err) {
      setStatus('error');
      setMessage('서버 연결 오류');
      setError('서버 연결 오류');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${
        isDragging
          ? 'border-blue-500 bg-blue-50'
          : status === 'success'
          ? 'border-green-300 bg-green-50'
          : status === 'error'
          ? 'border-red-300 bg-red-50'
          : 'border-gray-300 hover:border-gray-400'
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleChange}
        className="hidden"
      />

      {status === 'loading' ? (
        <Loader2 className="mx-auto mb-2 text-blue-500 animate-spin" size={24} />
      ) : status === 'success' ? (
        <CheckCircle className="mx-auto mb-2 text-green-500" size={24} />
      ) : status === 'error' ? (
        <AlertCircle className="mx-auto mb-2 text-red-500" size={24} />
      ) : (
        <Upload className="mx-auto mb-2 text-gray-400" size={24} />
      )}

      <p className="text-sm">
        {message || (data ? '다른 파일 업로드' : '엑셀 파일을 드래그하거나 클릭')}
      </p>

      {data && status === 'idle' && (
        <p className="text-xs text-gray-500 mt-1">
          현재: {data.periods.join(', ')}
        </p>
      )}
    </div>
  );
}
