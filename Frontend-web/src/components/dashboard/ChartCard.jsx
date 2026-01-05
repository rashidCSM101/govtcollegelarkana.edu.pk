import { Card, Typography, Space, Select, Spin } from 'antd';
import { MoreOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const ChartCard = ({ 
  title, 
  subtitle,
  extra,
  children, 
  loading = false,
  height = 300,
  filterOptions,
  onFilterChange,
  className = ''
}) => {
  return (
    <Card 
      className={`chart-card ${className}`}
      style={{ 
        borderRadius: 16,
        height: '100%'
      }}
      styles={{
        body: { padding: '20px 24px' }
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <Title level={5} className="!mb-0 !text-[var(--text-primary)]">
            {title}
          </Title>
          {subtitle && (
            <Text className="text-xs text-[var(--text-tertiary)]">
              {subtitle}
            </Text>
          )}
        </div>
        
        <Space>
          {filterOptions && (
            <Select
              defaultValue={filterOptions[0]?.value}
              size="small"
              style={{ width: 120 }}
              onChange={onFilterChange}
              options={filterOptions}
            />
          )}
          {extra}
        </Space>
      </div>

      <div style={{ height, position: 'relative' }}>
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Spin />
          </div>
        ) : (
          children
        )}
      </div>
    </Card>
  );
};

export default ChartCard;
