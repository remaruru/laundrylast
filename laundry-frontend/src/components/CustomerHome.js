import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function CustomerHome() {
  const [customerName, setCustomerName] = useState('');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [weather, setWeather] = useState(null);
  const [bestDay, setBestDay] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchWeather();
  }, []);

  const fetchWeather = async () => {
    try {
      // Using OpenWeatherMap API - you'll need to get your own API key
      // For now, I'll use a demo approach
      const response = await axios.get('https://api.openweathermap.org/data/2.5/forecast', {
        params: {
          q: 'Manila,PH',
          appid: 'demo_key', // Replace with your actual API key
          units: 'metric',
          cnt: 5
        }
      });
      setWeather(response.data);
      findBestLaundryDay(response.data.list);
    } catch (error) {
      console.log('Weather API error:', error);
      // Set demo weather data if API fails
      setDemoWeather();
    }
  };

  const setDemoWeather = () => {
    const today = new Date();
    const demoData = {
      city: { name: 'Manila' },
      list: []
    };
    
    for (let i = 0; i < 5; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      demoData.list.push({
        dt: date.getTime() / 1000,
        weather: [{ main: i === 1 ? 'Rain' : 'Clear' }],
        main: { temp: 28 + i }
      });
    }
    
    setWeather(demoData);
    findBestLaundryDay(demoData.list);
  };

  const findBestLaundryDay = (forecast) => {
    // Find the best day (clear weather, no rain)
    const bestDayIndex = forecast.findIndex(item => 
      !item.weather[0].main.toLowerCase().includes('rain') &&
      !item.weather[0].main.toLowerCase().includes('storm')
    );
    
    if (bestDayIndex !== -1) {
      const bestDate = new Date(forecast[bestDayIndex].dt * 1000);
      setBestDay({
        date: bestDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
        temp: forecast[bestDayIndex].main.temp
      });
    } else {
      setBestDay({ date: 'Tomorrow', temp: forecast[0].main.temp });
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setError('Please enter your name');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      console.log('Searching for customer:', customerName);
      const response = await axios.get('http://localhost:8000/api/orders/search', {
        params: { customer_name: customerName },
        headers: {
          'Accept': 'application/json',
        }
      });
      
      console.log('Search response:', response.data);
      setOrders(response.data);
      if (response.data.length === 0) {
        setError('No orders found for this name. Please check your name and try again.');
      }
    } catch (error) {
      console.error('Error searching orders:', error);
      console.error('Error details:', error.response?.data);
      setError(error.response?.data?.message || 'Error searching orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#ffc107',
      processing: '#17a2b8',
      ready: '#28a745',
      completed: '#28a745',
      cancelled: '#dc3545',
    };
    return colors[status] || '#6c757d';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="customer-home">
      {/* Header with Logo */}
      <header className="customer-header">
        <div className="header-content">
          <img src="/washnet-logo.jpg" alt="WASHNET Laundry" className="site-logo" />
          <h1>WASHNET Laundry</h1>
          <p className="subtitle">Fresh • Fast • Clean</p>
          <button onClick={() => navigate('/login')} className="btn-login">
            Staff Login
          </button>
        </div>
      </header>

      <div className="customer-container">
        <div className="customer-main">
          {/* Weather Section */}
          <div className="weather-card">
            <div className="weather-header">
              <h2>🌤️ Weather Forecast</h2>
              <span className="weather-location">📍 Manila, Philippines</span>
            </div>
            
            {weather && weather.list && weather.list.length > 0 && (
              <>
                <div className="weather-today">
                  <div className="weather-icon">
                    {weather.list[0].weather[0].main === 'Rain' ? '🌧️' : 
                     weather.list[0].weather[0].main === 'Clouds' ? '☁️' : '☀️'}
                  </div>
                  <div className="weather-info">
                    <div className="weather-temp">{Math.round(weather.list[0].main.temp)}°C</div>
                    <div className="weather-desc">{weather.list[0].weather[0].main}</div>
                  </div>
                </div>

                {bestDay && (
                  <div className="best-day">
                    <div className="best-day-label">wala pang API hehe exampol lng :P⭐ Best Day for Laundry:</div>
                    <div className="best-day-info">{bestDay.date} • {Math.round(bestDay.temp)}°C</div>
                  </div>
                )}

                <div className="weather-forecast">
                  {weather.list.slice(0, 5).map((item, index) => (
                    <div key={index} className="forecast-item">
                      <div className="forecast-date">
                        {new Date(item.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                      <div className="forecast-icon">
                        {item.weather[0].main === 'Rain' ? '🌧️' : 
                         item.weather[0].main === 'Clouds' ? '☁️' : '☀️'}
                      </div>
                      <div className="forecast-temp">{Math.round(item.main.temp)}°</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Search Section */}
          <div className="search-card">
            <h2>🔍 Search Your Order</h2>
            <form onSubmit={handleSearch} className="search-form">
              <input
                type="text"
                placeholder="Enter your full name..."
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="customer-search-input"
              />
              <button type="submit" disabled={loading} className="btn-search">
                {loading ? 'Searching...' : '🔍 Search'}
              </button>
            </form>
            {error && <div className="search-error">{error}</div>}
          </div>

          {/* Results Section */}
          {orders.length > 0 && (
            <div className="orders-results">
              <h3>📋 Your Orders ({orders.length})</h3>
              <div className="orders-grid">
                {orders.map((order) => (
                  <div key={order.id} className="order-card">
                    <div className="order-header">
                      <span className="order-id">Order #{order.id}</span>
                      <span 
                        className="order-status" 
                        style={{ backgroundColor: getStatusColor(order.status) }}
                      >
                        {order.status}
                      </span>
                    </div>
                    
                    <div className="order-details">
                      <div className="order-row">
                        <span className="order-label">Total:</span>
                        <span className="order-value">₱{order.total_amount}</span>
                      </div>
                      
                      <div className="order-row">
                        <span className="order-label">Service:</span>
                        <span className="order-value">
                          {order.service_type === 'wash_dry' ? 'Wash & Dry' : 
                           order.service_type === 'wash_only' ? 'Wash Only' : 
                           order.service_type === 'dry_only' ? 'Dry Only' : 
                           order.service_type === 'mixed' ? 'Mixed' : 'Wash & Dry'}
                        </span>
                      </div>
                      
                      <div className="order-row">
                        <span className="order-label">Created:</span>
                        <span className="order-value">{formatDate(order.created_at)}</span>
                      </div>
                      
                      <div className="order-row">
                        <span className="order-label">Service Type:</span>
                        <span className="order-value">
                          {order.delivery_method === 'pickup' ? '🏠 Pickup Only' : '📦 Delivery Only'}
                        </span>
                      </div>
                      
                      {order.pickup_date && (
                        <div className="order-row">
                          <span className="order-label">Pickup Date:</span>
                          <span className="order-value">{formatDate(order.pickup_date)}</span>
                        </div>
                      )}
                      
                      {order.delivery_date && (
                        <div className="order-row">
                          <span className="order-label">Delivery Date:</span>
                          <span className="order-value">{formatDate(order.delivery_date)}</span>
                        </div>
                      )}
                    </div>

                    <div className="order-items">
                      <div className="items-title">Items:</div>
                      {order.items?.map((item, index) => (
                        <div key={index} className="item-badge">
                          {item.name} (x{item.quantity})
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="customer-footer">
        <div className="footer-content">
          <img src="/washnet-logo.jpg" alt="WASHNET Laundry" className="footer-logo" />
          <div className="footer-text">
            <h3>WASHNET Laundry</h3>
            <p className="footer-tagline">Fresh • Fast • Clean</p>
            <p className="footer-copyright">© 2025 WASHNET Laundry Management System</p>
            <p className="footer-desc">Track Your Laundry • Know the Weather • Plan Smart</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default CustomerHome;

