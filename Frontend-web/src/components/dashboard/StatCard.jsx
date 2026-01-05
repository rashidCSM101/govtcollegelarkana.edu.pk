import { Card, Typography, Space, Tooltip } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, InfoCircleOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

const StatCard = ({ 
  title, 
  value, 
  prefix,
  suffix,
  icon, 
  trend, 
  trendValue, 
  color = '#21CCEE',
  bgGradient,
  tooltip,
  loading = false 
}) => {
  const isPositiveTrend = trend === 'up';
  
  const gradientStyles = bgGradient ? {
    background: bgGradient,
    border: 'none',
  } : {};

  return (
    <Card 
      loading={loading}
      className="stat-card"
      style={{ 
        borderRadius: 16,
        overflow: 'hidden',
        ...gradientStyles
      }}
      styles={{
        body: { padding: '20px 24px' }
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <Space align="center" size={4}>
            <Text className="text-[var(--text-secondary)] text-sm font-medium">
              {title}
            </Text>
            {tooltip && (
              <Tooltip title={tooltip}>
                <InfoCircleOutlined className="text-[var(--text-tertiary)] text-xs cursor-help" />
              </Tooltip>
            )}
          </Space>
          
          <div className="mt-2 flex items-baseline gap-1">
            {prefix && <Text className="text-lg text-[var(--text-secondary)]">{prefix}</Text>}
            <Title 
              level={2} 
              className="!mb-0 !text-[var(--text-primary)]"
              style={{ fontSize: 32, fontWeight: 700 }}
            >
              {value?.toLocaleString() || '0'}
            </Title>
            {suffix && <Text className="text-sm text-[var(--text-secondary)]">{suffix}</Text>}
          </div>

          {trendValue && (
            <div className="mt-3 flex items-center gap-2">
              <span 
                className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                  isPositiveTrend 
                    ? 'text-[#4DDB62] bg-[#4DDB62]/10' 
                    : 'text-[#E64F4F] bg-[#E64F4F]/10'
                }`}
              >
                {isPositiveTrend ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                {trendValue}%
              </span>
              <Text className="text-xs text-[var(--text-tertiary)]">vs last month</Text>
            </div>
          )}
        </div>

        {icon && (
          <div 
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ 
              backgroundColor: `${color}15`,
              color: color
            }}
          >
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
};

export default StatCard;
