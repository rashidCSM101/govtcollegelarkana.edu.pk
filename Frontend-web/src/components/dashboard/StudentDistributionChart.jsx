import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer,
  Legend,
  Tooltip
} from 'recharts';
import ChartCard from './ChartCard';

const defaultData = [
  { name: 'Science', value: 450, color: '#21CCEE' },
  { name: 'Arts', value: 320, color: '#4DDB62' },
  { name: 'Commerce', value: 280, color: '#FFBF66' },
  { name: 'Computer', value: 200, color: '#A78BFA' },
];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-3 shadow-lg">
        <p className="text-[var(--text-primary)] font-medium">{data.name}</p>
        <p className="text-sm text-[var(--text-secondary)]">
          Students: <span className="font-medium">{data.value}</span>
        </p>
        <p className="text-xs text-[var(--text-tertiary)]">
          {((data.value / payload[0].payload.total) * 100).toFixed(1)}% of total
        </p>
      </div>
    );
  }
  return null;
};

const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return percent > 0.1 ? (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor="middle" 
      dominantBaseline="central"
      className="text-xs font-medium"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  ) : null;
};

const StudentDistributionChart = ({ 
  data = defaultData, 
  loading = false,
  title = "Student Distribution",
  subtitle = "By department"
}) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const dataWithTotal = data.map(item => ({ ...item, total }));

  return (
    <ChartCard 
      title={title}
      subtitle={subtitle}
      loading={loading}
      height={280}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={dataWithTotal}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomLabel}
            outerRadius={100}
            innerRadius={50}
            paddingAngle={2}
            dataKey="value"
          >
            {dataWithTotal.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="bottom"
            iconType="circle"
            iconSize={8}
            formatter={(value, entry) => (
              <span className="text-[var(--text-secondary)] text-sm">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
};

export default StudentDistributionChart;
