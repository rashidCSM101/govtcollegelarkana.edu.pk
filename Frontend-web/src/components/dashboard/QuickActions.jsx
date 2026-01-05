import { Card, Typography, Button, Space, Tooltip } from 'antd';
import { 
  UserAddOutlined, 
  FileAddOutlined, 
  CalendarOutlined,
  NotificationOutlined,
  SettingOutlined,
  TeamOutlined,
  BookOutlined,
  DollarOutlined
} from '@ant-design/icons';

const { Title } = Typography;

const defaultActions = [
  { key: 'add-student', icon: <UserAddOutlined />, label: 'Add Student', color: '#21CCEE' },
  { key: 'add-teacher', icon: <TeamOutlined />, label: 'Add Teacher', color: '#4DDB62' },
  { key: 'new-notice', icon: <NotificationOutlined />, label: 'New Notice', color: '#FFBF66' },
  { key: 'schedule', icon: <CalendarOutlined />, label: 'Schedule', color: '#A78BFA' },
  { key: 'fee-collection', icon: <DollarOutlined />, label: 'Fee Collection', color: '#F472B6' },
  { key: 'add-course', icon: <BookOutlined />, label: 'Add Course', color: '#34D399' },
];

const QuickActions = ({ 
  actions = defaultActions, 
  onAction,
  columns = 3 
}) => {
  return (
    <Card 
      className="quick-actions-card"
      style={{ borderRadius: 16 }}
      styles={{
        body: { padding: '20px 24px' }
      }}
    >
      <Title level={5} className="!mb-4 !text-[var(--text-primary)]">
        Quick Actions
      </Title>

      <div 
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
      >
        {actions.map((action) => (
          <Tooltip key={action.key} title={action.label}>
            <Button
              className="h-auto py-4 flex flex-col items-center justify-center gap-2 border-[var(--border-color)] hover:border-primary hover:text-primary"
              style={{ 
                borderRadius: 12,
                background: 'var(--bg-secondary)'
              }}
              onClick={() => onAction?.(action.key)}
            >
              <span 
                className="text-2xl"
                style={{ color: action.color }}
              >
                {action.icon}
              </span>
              <span className="text-xs text-[var(--text-secondary)] font-medium">
                {action.label}
              </span>
            </Button>
          </Tooltip>
        ))}
      </div>
    </Card>
  );
};

export default QuickActions;
