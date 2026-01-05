import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend 
} from 'recharts';
import ChartCard from './ChartCard';

const defaultData = [
  { name: 'Mon', present: 92, absent: 8 },
  { name: 'Tue', present: 88, absent: 12 },
  { name: 'Wed', present: 95, absent: 5 },
  { name: 'Thu', present: 90, absent: 10 },
  { name: 'Fri', present: 85, absent: 15 },
  { name: 'Sat', present: 78, absent: 22 },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-3 shadow-lg">
        <p className="text-[var(--text-primary)] font-medium mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value}%
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const AttendanceChart = ({ 
  data = defaultData, 
  loading = false,
  title = "Attendance Overview",
  subtitle = "Weekly attendance statistics"
}) => {
  const filterOptions = [
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'year', label: 'This Year' },
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
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="presentGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4DDB62" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#4DDB62" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="absentGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#E64F4F" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#E64F4F" stopOpacity={0}/>
            </linearGradient>
          </defs>
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
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="top"
            align="right"
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ paddingBottom: 20 }}
          />
          <Area
            type="monotone"
            dataKey="present"
            name="Present"
            stroke="#4DDB62"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#presentGradient)"
          />
          <Area
            type="monotone"
            dataKey="absent"
            name="Absent"
            stroke="#E64F4F"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#absentGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
};

export default AttendanceChart;
