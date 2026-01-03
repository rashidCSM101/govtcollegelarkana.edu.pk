import { useEffect, useState } from 'react';
import { 
  FiUsers, FiDollarSign, FiBookOpen, FiAward, 
  FiTrendingUp, FiTrendingDown 
} from 'react-icons/fi';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import axiosInstance from '../../api/axios';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalRevenue: 0,
    totalCourses: 0,
    recentAdmissions: 0,
    pendingFees: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // const response = await axiosInstance.get('/admin/dashboard');
      // setStats(response.data);
      
      // Mock data for now
      setStats({
        totalStudents: 1250,
        totalTeachers: 85,
        totalRevenue: 2850000,
        totalCourses: 45,
        recentAdmissions: 152,
        pendingFees: 350000
      });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Students',
      value: stats.totalStudents.toLocaleString(),
      icon: FiUsers,
      change: '+12%',
      trending: 'up',
      color: '#21CCEE'
    },
    {
      title: 'Total Teachers',
      value: stats.totalTeachers.toLocaleString(),
      icon: FiUsers,
      change: '+3%',
      trending: 'up',
      color: '#4DDB62'
    },
    {
      title: 'Total Revenue',
      value: `Rs ${(stats.totalRevenue / 1000000).toFixed(2)}M`,
      icon: FiDollarSign,
      change: '+18%',
      trending: 'up',
      color: '#FFBF66'
    },
    {
      title: 'Active Courses',
      value: stats.totalCourses.toLocaleString(),
      icon: FiBookOpen,
      change: '+5%',
      trending: 'up',
      color: '#E64F4F'
    }
  ];

  // Line Chart - Admissions Trend
  const admissionsData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
    datasets: [
      {
        label: 'Admissions',
        data: [120, 150, 180, 160, 190, 210, 200, 220],
        borderColor: '#21CCEE',
        backgroundColor: 'rgba(33, 204, 238, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  // Bar Chart - Fee Collection
  const feeData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Fee Collected (in thousands)',
        data: [450, 520, 480, 550, 590, 620],
        backgroundColor: '#21CCEE'
      },
      {
        label: 'Pending (in thousands)',
        data: [80, 60, 70, 50, 40, 35],
        backgroundColor: '#FFBF66'
      }
    ]
  };

  // Doughnut Chart - Student Distribution
  const studentDistribution = {
    labels: ['Science', 'Arts', 'Commerce', 'Computer Science'],
    datasets: [
      {
        data: [420, 350, 280, 200],
        backgroundColor: ['#21CCEE', '#4DDB62', '#FFBF66', '#E64F4F']
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom'
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  const recentActivities = [
    { id: 1, action: 'New student admission', user: 'Ahmed Ali', time: '5 mins ago', type: 'success' },
    { id: 2, action: 'Fee payment received', user: 'Sara Khan', time: '15 mins ago', type: 'info' },
    { id: 3, action: 'Exam result published', user: 'Admin', time: '1 hour ago', type: 'warning' },
    { id: 4, action: 'New course added', user: 'Dr. Hassan', time: '2 hours ago', type: 'success' },
  ];

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Dashboard
        </h1>
        <p className="mt-2" style={{ color: 'var(--text-secondary)' }}>
          Welcome back! Here's what's happening with your college today.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => (
          <div
            key={index}
            className="rounded-lg p-6 shadow-md"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-light)'
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${stat.color}20` }}
              >
                <stat.icon size={24} style={{ color: stat.color }} />
              </div>
              <div className={`flex items-center space-x-1 text-sm ${stat.trending === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                {stat.trending === 'up' ? <FiTrendingUp /> : <FiTrendingDown />}
                <span>{stat.change}</span>
              </div>
            </div>
            <h3 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
              {stat.value}
            </h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {stat.title}
            </p>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Admissions Trend */}
        <div
          className="rounded-lg p-6 shadow-md"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-light)'
          }}
        >
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Admissions Trend
          </h3>
          <div style={{ height: '300px' }}>
            <Line data={admissionsData} options={chartOptions} />
          </div>
        </div>

        {/* Fee Collection */}
        <div
          className="rounded-lg p-6 shadow-md"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-light)'
          }}
        >
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Fee Collection
          </h3>
          <div style={{ height: '300px' }}>
            <Bar data={feeData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student Distribution */}
        <div
          className="rounded-lg p-6 shadow-md"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-light)'
          }}
        >
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Student Distribution
          </h3>
          <div style={{ height: '250px' }}>
            <Doughnut data={studentDistribution} options={{ ...chartOptions, scales: undefined }} />
          </div>
        </div>

        {/* Recent Activities */}
        <div
          className="lg:col-span-2 rounded-lg p-6 shadow-md"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-light)'
          }}
        >
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Recent Activities
          </h3>
          <div className="space-y-4">
            {recentActivities.map(activity => (
              <div
                key={activity.id}
                className="flex items-center justify-between p-4 rounded-lg"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              >
                <div className="flex items-center space-x-4">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      activity.type === 'success' ? 'bg-green-500' :
                      activity.type === 'warning' ? 'bg-orange-500' :
                      'bg-blue-500'
                    }`}
                  ></div>
                  <div>
                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {activity.action}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--text-light)' }}>
                      {activity.user}
                    </p>
                  </div>
                </div>
                <span className="text-sm" style={{ color: 'var(--text-light)' }}>
                  {activity.time}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
