import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(formData.email, formData.password);
    
    if (result.success) {
      // The login function in AuthContext already sets the user in state
      // We need to wait for the user state to be updated, then redirect
      setTimeout(() => {
        // Get user from the response data that was returned from login
        const userData = result.user || JSON.parse(localStorage.getItem('user') || '{}');
        if (userData.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/employee');
        }
      }, 100);
    } else {
      setError(result.message);
    }
    
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card-modern">
        <button 
          onClick={() => navigate('/')} 
          className="btn-back-home"
          title="Back to home"
        >
          ← Back to Home
        </button>
        <div className="auth-card-header">
          <h2>🔐 Staff Login</h2>
          <p className="auth-subtitle">Access your dashboard</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group-modern">
            <label htmlFor="email">📧 Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter your email"
              className="input-modern"
            />
          </div>
          
          <div className="form-group-modern">
            <label htmlFor="password">🔒 Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Enter your password"
              className="input-modern"
            />
          </div>
          
          {error && <div className="error-modern">{error}</div>}
          
          <button type="submit" disabled={loading} className="btn btn-primary btn-modern">
            {loading ? 'Logging in...' : '🔑 Login'}
          </button>
        </form>
        
        <p className="auth-link-modern">
          Don't have an account? <Link to="/signup">Sign up here</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
