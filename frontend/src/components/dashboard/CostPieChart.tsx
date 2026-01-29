import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

interface CostPieChartProps {
  data: Record<string, number>;
}

export default function CostPieChart({ data }: CostPieChartProps) {
  const labels = Object.keys(data);
  const values = Object.values(data);

  const chartData = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',   // 파랑
          'rgba(16, 185, 129, 0.8)',   // 초록
          'rgba(245, 158, 11, 0.8)',   // 노랑
          'rgba(239, 68, 68, 0.8)',    // 빨강
          'rgba(139, 92, 246, 0.8)',   // 보라
        ],
        borderWidth: 2,
        borderColor: '#fff'
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          usePointStyle: true,
          padding: 15
        }
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            return `${context.label}: ${context.parsed.toFixed(1)}%`;
          }
        }
      }
    }
  };

  return (
    <div className="h-64">
      <Pie data={chartData} options={options} />
    </div>
  );
}
