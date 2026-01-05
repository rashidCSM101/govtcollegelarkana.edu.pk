import { Card, Typography, List, Avatar, Progress, Tag } from 'antd';
import { TrophyOutlined, StarFilled } from '@ant-design/icons';

const { Title, Text } = Typography;

const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
const rankIcons = ['🥇', '🥈', '🥉'];

const TopStudents = ({ students = [], loading = false, title = "Top Performers" }) => {
  return (
    <Card 
      className="top-students-card h-full"
      style={{ borderRadius: 16 }}
      styles={{
        body: { padding: '20px 24px' }
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrophyOutlined className="text-xl text-[#FFD700]" />
          <Title level={5} className="!mb-0 !text-[var(--text-primary)]">
            {title}
          </Title>
        </div>
        <a className="text-primary text-sm hover:underline">View All</a>
      </div>

      <List
        loading={loading}
        dataSource={students.slice(0, 5)}
        renderItem={(student, index) => (
          <List.Item className="!px-0 !border-b-[var(--border-color)]">
            <div className="flex items-center gap-3 w-full">
              <div className="relative">
                <Avatar 
                  size={48} 
                  src={student.avatar}
                  className="bg-primary"
                >
                  {student.name?.charAt(0)}
                </Avatar>
                {index < 3 && (
                  <span 
                    className="absolute -top-1 -right-1 text-lg"
                    title={`Rank #${index + 1}`}
                  >
                    {rankIcons[index]}
                  </span>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <Text className="text-[var(--text-primary)] font-medium truncate">
                    {student.name}
                  </Text>
                  <Text className="text-primary font-bold">
                    {student.score}%
                  </Text>
                </div>
                
                <div className="flex items-center justify-between mt-1">
                  <Text className="text-xs text-[var(--text-tertiary)]">
                    {student.class} • {student.rollNo}
                  </Text>
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <StarFilled 
                        key={i}
                        className={`text-xs ${
                          i < Math.round(student.score / 20) 
                            ? 'text-[#FFD700]' 
                            : 'text-[var(--border-color)]'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                
                <Progress 
                  percent={student.score} 
                  size="small"
                  showInfo={false}
                  strokeColor="#21CCEE"
                  trailColor="var(--bg-tertiary)"
                  className="!mt-2"
                />
              </div>
            </div>
          </List.Item>
        )}
      />
    </Card>
  );
};

export default TopStudents;
