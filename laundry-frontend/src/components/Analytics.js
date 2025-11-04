import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Simple chart implementation without external dependencies
const SimpleChart = ({ data, type = 'pie', title, colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'] }) => {
  const maxValue = Math.max(...data.map(item => item.value));
  
  if (type === 'pie') {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    let currentAngle = 0;
    
    return (
      <div className="chart-container">
        <h3>{title}</h3>
        <div className="pie-chart">
          <svg width="200" height="200" viewBox="0 0 200 200">
            {data.map((item, index) => {
              const percentage = (item.value / total) * 100;
              const angle = (item.value / total) * 360;
              const startAngle = currentAngle;
              const endAngle = currentAngle + angle;
              currentAngle += angle;
              
              const x1 = 100 + 80 * Math.cos((startAngle - 90) * Math.PI / 180);
              const y1 = 100 + 80 * Math.sin((startAngle - 90) * Math.PI / 180);
              const x2 = 100 + 80 * Math.cos((endAngle - 90) * Math.PI / 180);
              const y2 = 100 + 80 * Math.sin((endAngle - 90) * Math.PI / 180);
              const largeArcFlag = angle > 180 ? 1 : 0;
              
              const pathData = [
                `M 100 100`,
                `L ${x1} ${y1}`,
                `A 80 80 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                'Z'
              ].join(' ');
              
              return (
                <path
                  key={index}
                  d={pathData}
                  fill={colors[index % colors.length]}
                  stroke="white"
                  strokeWidth="2"
                />
              );
            })}
          </svg>
        </div>
        <div className="chart-legend">
          {data.map((item, index) => (
            <div key={index} className="legend-item">
              <div 
                className="legend-color" 
                style={{ backgroundColor: colors[index % colors.length] }}
              ></div>
              <span>{item.label}: {item.value} ({((item.value / total) * 100).toFixed(1)}%)</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  if (type === 'bar') {
    return (
      <div className="chart-container">
        <h3>{title}</h3>
        <div className="bar-chart">
          {data.map((item, index) => (
            <div key={index} className="bar-item">
              <div className="bar-label">{item.label}</div>
              <div className="bar-wrapper">
                <div 
                  className="bar-fill"
                  style={{ 
                    width: `${(item.value / maxValue) * 100}%`,
                    backgroundColor: colors[index % colors.length]
                  }}
                ></div>
                <span className="bar-value">{item.value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  return null;
};

function Analytics() {
  const [analytics, setAnalytics] = useState({
    serviceTypes: [],
    dayOfWeek: [],
    revenue: [],
    customerFrequency: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/analytics');
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading analytics...</div>;
  }

  const serviceTypeData = analytics.serviceTypes.map(item => ({
    label: item.service_type,
    value: item.count
  }));

  const dayOfWeekData = analytics.dayOfWeek.map(item => ({
    label: item.day,
    value: item.count
  }));

  const revenueData = analytics.revenue.map(item => ({
    label: item.period,
    value: item.amount
  }));

  const customerData = analytics.customerFrequency.map(item => ({
    label: item.customer_name,
    value: item.order_count
  }));

  return (
    <div className="analytics-dashboard">
      <h2>Analytics Dashboard</h2>
      
      <div className="analytics-grid">
        <div className="analytics-card">
          <SimpleChart
            data={serviceTypeData}
            type="pie"
            title="Service Type Distribution"
            colors={['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0']}
          />
        </div>
        
        <div className="analytics-card">
          <SimpleChart
            data={dayOfWeekData}
            type="bar"
            title="Orders by Day of Week"
            colors={['#36A2EB', '#FF6384', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#FF6384']}
          />
        </div>
        
        <div className="analytics-card">
          <SimpleChart
            data={revenueData}
            type="bar"
            title="Revenue Trends"
            colors={['#4BC0C0', '#36A2EB', '#FF6384']}
          />
        </div>
        
        <div className="analytics-card">
          <SimpleChart
            data={customerData}
            type="bar"
            title="Top Customers by Order Count"
            colors={['#9966FF', '#FF9F40', '#FF6384', '#36A2EB']}
          />
        </div>
      </div>
    </div>
  );
}

export default Analytics;
