import { Card, Timeline, Typography, Avatar, Tag, Empty } from 'antd';
import { 
  UserAddOutlined, 
  FileTextOutlined, 
  CheckCircleOutlined,
  DollarOutlined,
  BellOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;

const activityIcons = {
  student: <UserAddOutlined />,
  assignment: <FileTextOutlined />,
  attendance: <CheckCircleOutlined />,
  fee: <DollarOutlined />,
  notification: <BellOutlined />,
  default: <ClockCircleOutlined />
};

const activityColors = {
  student: '#21CCEE',
  assignment: '#FFBF66',
  attendance: '#4DDB62',
  fee: '#A78BFA',
  notification: '#F472B6',
  default: '#94a3b8'
};

const RecentActivity = ({ activities = [], loading = false, maxItems = 5 }) => {
  const getIcon = (type) => activityIcons[type] || activityIcons.default;
  const getColor = (type) => activityColors[type] || activityColors.default;

  return (
    <Card 
      className="recent-activity-card h-full"
      style={{ borderRadius: 16 }}
      styles={{
        body: { padding: '20px 24px' }
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <Title level={5} className="!mb-0 !text-[var(--text-primary)]">
          Recent Activity
        </Title>
        <a className="text-primary text-sm hover:underline">View All</a>
      </div>

      {activities.length === 0 ? (
        <Empty 
          description="No recent activities" 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <Timeline
          items={activities.slice(0, maxItems).map((activity, index) => ({
            dot: (
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm"
                style={{ backgroundColor: getColor(activity.type) }}
              >
                {getIcon(activity.type)}
              </div>
            ),
            children: (
              <div className="ml-2 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <Text className="text-[var(--text-primary)] font-medium block">
                      {activity.title}
                    </Text>
                    <Text className="text-[var(--text-secondary)] text-sm">
                      {activity.description}
                    </Text>
                  </div>
                  <Text className="text-[var(--text-tertiary)] text-xs whitespace-nowrap">
                    {dayjs(activity.timestamp).fromNow()}
                  </Text>
                </div>
                {activity.tags && (
                  <div className="mt-2">
                    {activity.tags.map((tag, i) => (
                      <Tag key={i} color={tag.color || 'blue'}>
                        {tag.label}
                      </Tag>
                    ))}
                  </div>
                )}
              </div>
            ),
          }))}
        />
      )}
    </Card>
  );
};

export default RecentActivity;
