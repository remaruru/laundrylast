import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Signup() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    special_code: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { register } = useAuth();
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

    if (formData.password !== formData.password_confirmation) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (!formData.special_code) {
      setError('Special code is required');
      setLoading(false);
      return;
    }

    const result = await register(
      formData.name,
      formData.email,
      formData.password,
      formData.password_confirmation,
      formData.special_code
    );
    
    if (result.success) {
      navigate('/employee');
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
          <h2>🔐 Employee Signup</h2>
          <p className="auth-subtitle">Create your employee account</p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group-modern">
            <label htmlFor="name">👤 Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Enter your full name"
              className="input-modern"
            />
          </div>
          
          <div className="form-group-modern">
            <label htmlFor="email">📧 Email</label>
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
              minLength="8"
              placeholder="Enter your password"
              className="input-modern"
            />
          </div>
          
          <div className="form-group-modern">
            <label htmlFor="password_confirmation">🔒 Confirm Password</label>
            <input
              type="password"
              id="password_confirmation"
              name="password_confirmation"
              value={formData.password_confirmation}
              onChange={handleChange}
              required
              minLength="8"
              placeholder="Confirm your password"
              className="input-modern"
            />
          </div>

          <div className="form-group-modern">
            <label htmlFor="special_code">🔐 Special Access Code</label>
            <input
              type="text"
              id="special_code"
              name="special_code"
              value={formData.special_code}
              onChange={handleChange}
              required
              placeholder="Enter special access code"
              className="input-modern"
            />
            <small style={{ color: '#666', fontSize: '12px', marginTop: '5px', display: 'block' }}>
              Only authorized employees can create accounts
            </small>
          </div>
          
          {error && <div className="error-modern">{error}</div>}
          
          <button type="submit" disabled={loading} className="btn btn-primary btn-modern">
            {loading ? 'Creating account...' : '🔑 Sign Up'}
          </button>
        </form>
        
        <p className="auth-link-modern">
          Already have an account? <Link to="/login">Login here</Link>
        </p>
      </div>
    </div>
  );
}

export default Signup;
