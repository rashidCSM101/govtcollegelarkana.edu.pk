import { Card, Typography, List, Avatar, Tag, Empty, Badge } from 'antd';
import { 
  CalendarOutlined, 
  ClockCircleOutlined,
  EnvironmentOutlined 
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const eventColors = {
  exam: '#E64F4F',
  holiday: '#4DDB62',
  meeting: '#21CCEE',
  event: '#FFBF66',
  deadline: '#A78BFA',
  default: '#94a3b8'
};

const UpcomingEvents = ({ events = [], loading = false, maxItems = 4 }) => {
  const getEventColor = (type) => eventColors[type] || eventColors.default;

  const formatDate = (date) => {
    const d = dayjs(date);
    const today = dayjs();
    
    if (d.isSame(today, 'day')) return 'Today';
    if (d.isSame(today.add(1, 'day'), 'day')) return 'Tomorrow';
    return d.format('MMM DD');
  };

  return (
    <Card 
      className="upcoming-events-card h-full"
      style={{ borderRadius: 16 }}
      styles={{
        body: { padding: '20px 24px' }
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <Title level={5} className="!mb-0 !text-[var(--text-primary)]">
          Upcoming Events
        </Title>
        <a className="text-primary text-sm hover:underline">View Calendar</a>
      </div>

      {events.length === 0 ? (
        <Empty 
          description="No upcoming events" 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <List
          loading={loading}
          dataSource={events.slice(0, maxItems)}
          renderItem={(event) => (
            <List.Item className="!px-0 !border-b-[var(--border-color)]">
              <div className="flex items-start gap-3 w-full">
                <div 
                  className="w-12 h-12 rounded-xl flex flex-col items-center justify-center text-white shrink-0"
                  style={{ backgroundColor: getEventColor(event.type) }}
                >
                  <span className="text-xs font-medium">
                    {dayjs(event.date).format('MMM').toUpperCase()}
                  </span>
                  <span className="text-lg font-bold leading-none">
                    {dayjs(event.date).format('DD')}
                  </span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <Text className="text-[var(--text-primary)] font-medium block truncate">
                    {event.title}
                  </Text>
                  
                  <div className="flex items-center gap-3 mt-1">
                    {event.time && (
                      <span className="flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
                        <ClockCircleOutlined />
                        {event.time}
                      </span>
                    )}
                    {event.location && (
                      <span className="flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
                        <EnvironmentOutlined />
                        {event.location}
                      </span>
                    )}
                  </div>
                </div>

                <Tag 
                  color={getEventColor(event.type)} 
                  className="capitalize shrink-0"
                >
                  {event.type}
                </Tag>
              </div>
            </List.Item>
          )}
        />
      )}
    </Card>
  );
};

export default UpcomingEvents;
