import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  Cell
} from 'recharts';
import ChartCard from './ChartCard';

const defaultData = [
  { name: 'Jan', collected: 85000, pending: 15000 },
  { name: 'Feb', collected: 92000, pending: 8000 },
  { name: 'Mar', collected: 78000, pending: 22000 },
  { name: 'Apr', collected: 95000, pending: 5000 },
  { name: 'May', collected: 88000, pending: 12000 },
  { name: 'Jun', collected: 91000, pending: 9000 },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-3 shadow-lg">
        <p className="text-[var(--text-primary)] font-medium mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: Rs. {entry.value.toLocaleString()}
          </p>
        ))}
        <p className="text-xs text-[var(--text-tertiary)] mt-1 pt-1 border-t border-[var(--border-color)]">
          Total: Rs. {payload.reduce((sum, p) => sum + p.value, 0).toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};

const FeeCollectionChart = ({ 
  data = defaultData, 
  loading = false,
  title = "Fee Collection",
  subtitle = "Monthly collection overview"
}) => {
  const filterOptions = [
    { value: '6months', label: 'Last 6 Months' },
    { value: 'year', label: 'This Year' },
    { value: 'all', label: 'All Time' },
  ];

  return (
    <ChartCard 
      title={title}
      subtitle={subtitle}
      loading={loading}
      filterOptions={filterOptions}
      height={280}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
          <XAxis 
            dataKey="name" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }}
            tickFormatter={(value) => `${value / 1000}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="top"
            align="right"
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ paddingBottom: 20 }}
          />
          <Bar 
            dataKey="collected" 
            name="Collected"
            fill="#4DDB62" 
            radius={[4, 4, 0, 0]}
            barSize={20}
          />
          <Bar 
            dataKey="pending" 
            name="Pending"
            fill="#FFBF66" 
            radius={[4, 4, 0, 0]}
            barSize={20}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
};

export default FeeCollectionChart;
