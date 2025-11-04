import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import Analytics from './Analytics';

// Utility function to determine service type based on items
const determineServiceType = (items) => {
  if (!items || items.length === 0) return 'wash_dry';
  
  const serviceTypes = items.map(item => item.service_type).filter(Boolean);
  const uniqueServiceTypes = [...new Set(serviceTypes)];
  
  // If only one type of service
  if (uniqueServiceTypes.length === 1) {
    return uniqueServiceTypes[0];
  }
  
  // If multiple different service types, it's mixed
  if (uniqueServiceTypes.length > 1) {
    return 'mixed';
  }
  
  // Default fallback
  return 'wash_dry';
};

function AdminDashboard() {
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [isFiltered, setIsFiltered] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);

  useEffect(() => {
    console.log('Initial load - fetching all orders');
    fetchOrders(); // This should fetch ALL orders
    fetchStatistics();
  }, []);

  useEffect(() => {
    if (activeTab === 'employees') {
      fetchEmployees();
    }
  }, [activeTab]);



  const fetchOrders = async (dateFilter = null) => {
    try {
      let url = 'http://localhost:8000/api/orders';
      if (dateFilter) {
        url += `?date=${dateFilter}`;
        console.log('Filtering by created date:', dateFilter);
      }
      const response = await axios.get(url);
      setOrders(response.data);
      console.log('Fetched orders:', response.data.length, 'orders');
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const handleRefresh = () => {
    setDateFilter('');
    setSelectedDate('');
    setIsFiltered(false);
    setCustomerSearch('');
    fetchOrders();
    fetchStatistics();
  };

  const filteredOrders = customerSearch
    ? orders.filter(order => 
        order.customer_name.toLowerCase().includes(customerSearch.toLowerCase())
      )
    : orders;

  const fetchStatistics = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/orders/statistics');
      setStatistics(response.data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    setEmployeesLoading(true);
    try {
      const response = await axios.get('http://localhost:8000/api/orders/employee-overview');
      setEmployees(response.data);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setEmployeesLoading(false);
    }
  };

  const applyDateFilter = () => {
    if (selectedDate) {
      setDateFilter(selectedDate);
      setIsFiltered(true);
      fetchOrders(selectedDate);
    }
  };

  const clearDateFilter = () => {
    setDateFilter('');
    setSelectedDate('');
    setIsFiltered(false);
    fetchOrders(); // This will fetch ALL orders without any date filter
  };

  const handleDeleteOrder = async (orderId) => {
    if (window.confirm('Are you sure you want to delete this order?')) {
      try {
        await axios.delete(`http://localhost:8000/api/orders/${orderId}`);
        fetchOrders();
        fetchStatistics();
      } catch (error) {
        console.error('Error deleting order:', error);
      }
    }
  };

  const handleEditOrder = (order) => {
    setSelectedOrder(order);
    setShowEditModal(true);
  };

  const handleUpdateOrder = async (updatedData) => {
    try {
      await axios.put(`http://localhost:8000/api/orders/${selectedOrder.id}`, updatedData);
      setShowEditModal(false);
      setSelectedOrder(null);
      fetchOrders();
      fetchStatistics();
    } catch (error) {
      console.error('Error updating order:', error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#ffc107',
      processing: '#17a2b8',
      ready: '#28a745',
      completed: '#28a745', // Changed to green
      cancelled: '#dc3545',
    };
    return colors[status] || '#6c757d';
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Admin Dashboard</h1>
        <div className="user-info">
          <span>Welcome, {user?.name}</span>
          <button onClick={logout} className="btn btn-secondary">Logout</button>
        </div>
      </header>

      <div className="dashboard-content">
        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button 
            className={`tab-button ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            Dashboard
          </button>
          <button 
            className={`tab-button ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            Analytics
          </button>
          <button 
            className={`tab-button ${activeTab === 'employees' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('employees');
              fetchEmployees();
            }}
          >
            Employee Overview
          </button>
        </div>

        {activeTab === 'dashboard' && (
          <>
            {/* Statistics Cards */}
            <div className="stats-grid">
          <div className="stat-card">
            <h3>Total Orders</h3>
            <p className="stat-number">{statistics.total_orders || 0}</p>
          </div>
          <div className="stat-card">
            <h3>Pending</h3>
            <p className="stat-number">{statistics.pending_orders || 0}</p>
          </div>
          <div className="stat-card">
            <h3>Processing</h3>
            <p className="stat-number">{statistics.processing_orders || 0}</p>
          </div>
          <div className="stat-card">
            <h3>Ready</h3>
            <p className="stat-number">{statistics.ready_orders || 0}</p>
          </div>
          <div className="stat-card">
            <h3>Completed</h3>
            <p className="stat-number">{statistics.completed_orders || 0}</p>
          </div>
          <div className="stat-card">
            <h3>Total Revenue</h3>
            <p className="stat-number">₱{Number(statistics.total_revenue || 0).toFixed(2)}</p>
          </div>
        </div>

        {/* Orders Table */}
        <div className="orders-section">
          <div className="orders-header">
            <div className="orders-title-controls">
              <h2>
                {isFiltered ? `Orders for ${dateFilter}` : 'All Orders'}
                {isFiltered && <span className="filter-indicator"> (Filtered)</span>}
              </h2>
              <button 
                onClick={handleRefresh}
                className="btn btn-sm btn-primary refresh-btn"
                title="Refresh orders"
              >
                🔄 Refresh
              </button>
            </div>
            <div className="filters-row">
              <div className="filter-card customer-search-card">
                <div className="filter-header">
                  <span className="filter-icon">🔍</span>
                  <label htmlFor="customerSearch">Search Customer</label>
                  {customerSearch && (
                    <button 
                      onClick={() => setCustomerSearch('')}
                      className="btn-clear-filter"
                      title="Clear search"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  id="customerSearch"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="search-input-modern"
                  placeholder="Type customer name to search..."
                />
              </div>
              <div className="filter-card date-filter-card">
                <div className="filter-header">
                  <span className="filter-icon">📅</span>
                  <label htmlFor="dateFilter">Filter by Date</label>
                  {isFiltered && (
                    <button 
                      onClick={clearDateFilter}
                      className="btn-clear-filter"
                      title="Clear date filter"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div className="date-controls">
                  <input
                    type="date"
                    id="dateFilter"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="date-input-modern"
                  />
                  <button 
                    onClick={applyDateFilter}
                    className="btn-apply-filter"
                    disabled={!selectedDate}
                  >
                    Apply Date
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="table-container">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Customer</th>
                  <th>Employee</th>
                  <th>Service Type</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Pickup Date</th>
                  <th>Delivery Date</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="no-orders">
                      {customerSearch ? `No customers found matching "${customerSearch}"` : 
                       isFiltered ? `No orders found for ${dateFilter}` : 'No orders found'}
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                  <tr key={order.id}>
                    <td>{order.id}</td>
                    <td>{order.customer_name}</td>
                    <td>{order.user?.name}</td>
                    <td>
                      <span className="service-type-badge">
                        {order.service_type === 'wash_dry' ? 'Wash & Dry' : 
                         order.service_type === 'wash_only' ? 'Wash Only' : 
                         order.service_type === 'dry_only' ? 'Dry Only' : 
                         order.service_type === 'mixed' ? 'Mixed Services' : 'Wash & Dry'}
                      </span>
                    </td>
                    <td>₱{order.total_amount}</td>
                    <td>
                      <span 
                        className="status-badge" 
                        style={{ backgroundColor: getStatusColor(order.status) }}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td>{order.pickup_date ? new Date(order.pickup_date).toLocaleDateString() : 'Not set'}</td>
                    <td>{order.delivery_date ? new Date(order.delivery_date).toLocaleDateString() : 'Not set'}</td>
                    <td>{new Date(order.created_at).toLocaleDateString()}</td>
                    <td>
                      <button 
                        onClick={() => handleEditOrder(order)}
                        className="btn btn-sm btn-primary"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteOrder(order.id)}
                        className="btn btn-sm btn-danger"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
          </>
        )}

        {activeTab === 'analytics' && (
          <Analytics />
        )}

        {activeTab === 'employees' && (
          <div className="employees-section">
            <div className="section-header">
              <h2>👥 Employee Overview</h2>
              <button 
                onClick={fetchEmployees}
                className="btn btn-sm btn-primary refresh-btn"
                disabled={employeesLoading}
              >
                {employeesLoading ? 'Loading...' : '🔄 Refresh'}
              </button>
            </div>

            {employeesLoading ? (
              <div className="loading">Loading employees...</div>
            ) : employees.length === 0 ? (
              <div className="no-orders">No employees found</div>
            ) : (
              <div className="employees-grid">
                {employees.map((employee) => (
                  <div key={employee.id} className="employee-card">
                    <div className="employee-header">
                      <div className="employee-avatar">
                        {employee.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="employee-info">
                        <h3>{employee.name}</h3>
                        <p className="employee-email">📧 {employee.email}</p>
                      </div>
                    </div>
                    
                    <div className="employee-stats">
                      <div className="stat-item">
                        <span className="stat-label">Orders Created</span>
                        <span className="stat-value">{employee.orders_count}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Account Created</span>
                        <span className="stat-value">{employee.created_at_formatted}</span>
                      </div>
                    </div>
                    
                    <div className="employee-footer">
                      <span className="employee-id">ID: {employee.id}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && selectedOrder && (
        <EditOrderModal
          order={selectedOrder}
          onClose={() => setShowEditModal(false)}
          onSave={handleUpdateOrder}
        />
      )}
    </div>
  );
}

// Edit Order Modal Component
function EditOrderModal({ order, onClose, onSave }) {
  const [formData, setFormData] = useState({
    customer_name: order.customer_name,
    customer_phone: order.customer_phone,
    customer_email: order.customer_email || '',
    total_amount: order.total_amount,
    status: order.status,
    service_type: order.service_type || 'mixed',
    items: order.items || [{ name: '', quantity: 1, service_type: 'wash_dry' }],
    notes: order.notes || '',
    pickup_date: order.pickup_date || '',
    delivery_date: order.delivery_date || '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newFormData = {
      ...formData,
      [name]: value,
    };
    
    // Validate dates
    if (name === 'pickup_date' && formData.delivery_date && value > formData.delivery_date) {
      // If pickup date is after delivery date, clear delivery date
      newFormData.delivery_date = '';
    }
    
    setFormData(newFormData);
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    
    // Calculate total based on individual item service types and quantities
    const servicePrices = {
      'wash_dry': 100,
      'wash_only': 60,
      'dry_only': 50
    };
    
    let total = 0;
    newItems.forEach(item => {
      const serviceType = item.service_type || 'wash_dry';
      const quantity = parseInt(item.quantity || 0);
      const price = servicePrices[serviceType] || 100;
      total += price * quantity;
    });
    
    // Determine service type based on items
    const determinedServiceType = determineServiceType(newItems);
    
    setFormData({
      ...formData,
      items: newItems,
      total_amount: total,
      service_type: determinedServiceType,
    });
  };

  const addItem = () => {
    const newItems = [...formData.items, { name: '', quantity: 1, service_type: 'wash_dry' }];
    const determinedServiceType = determineServiceType(newItems);
    
    setFormData({
      ...formData,
      items: newItems,
      service_type: determinedServiceType,
    });
  };

  const removeItem = (index) => {
    if (formData.items.length > 1) {
      const newItems = formData.items.filter((_, i) => i !== index);
      
      // Calculate total based on individual item service types and quantities
      const servicePrices = {
        'wash_dry': 100,
        'wash_only': 60,
        'dry_only': 50
      };
      
      let total = 0;
      newItems.forEach(item => {
        const serviceType = item.service_type || 'wash_dry';
        const quantity = parseInt(item.quantity || 0);
        const price = servicePrices[serviceType] || 100;
        total += price * quantity;
      });
      
      // Determine service type based on remaining items
      const determinedServiceType = determineServiceType(newItems);
      
      setFormData({
        ...formData,
        items: newItems,
        total_amount: total,
        service_type: determinedServiceType,
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate dates
    if (formData.pickup_date && formData.delivery_date && formData.delivery_date <= formData.pickup_date) {
      alert('Delivery date must be after pickup date');
      return;
    }
    
    onSave(formData);
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>Edit Order</h3>
          <button onClick={onClose} className="btn-close">&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Customer Name:</label>
            <input
              type="text"
              name="customer_name"
              value={formData.customer_name}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Customer Phone:</label>
            <input
              type="text"
              name="customer_phone"
              value={formData.customer_phone}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Customer Email:</label>
            <input
              type="email"
              name="customer_email"
              value={formData.customer_email}
              onChange={handleChange}
            />
          </div>
          
          <div className="form-group">
            <label>Total Amount:</label>
            <input
              type="number"
              step="0.01"
              name="total_amount"
              value={formData.total_amount}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Items:</label>
            {formData.items.map((item, index) => (
              <div key={index} className="item-row">
                <input
                  type="text"
                  placeholder="Item name"
                  value={item.name}
                  onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                  required
                />
                <input
                  type="number"
                  placeholder="Quantity"
                  value={item.quantity}
                  onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                  min="1"
                  required
                />
                <select
                  value={item.service_type}
                  onChange={(e) => handleItemChange(index, 'service_type', e.target.value)}
                  required
                >
                  <option value="wash_dry">Wash & Dry (₱100)</option>
                  <option value="wash_only">Wash Only (₱60)</option>
                  <option value="dry_only">Dry Only (₱50)</option>
                </select>
                {formData.items.length > 1 && (
                  <button type="button" onClick={() => removeItem(index)} className="btn btn-sm btn-danger">
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={addItem} className="btn btn-sm btn-secondary">
              Add Item
            </button>
          </div>
          
          <div className="form-group">
            <label>Status:</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              required
            >
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="ready">Ready</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>Notes:</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="3"
            />
          </div>
          
          <div className="form-group">
            <label>Pickup Date:</label>
            <input
              type="date"
              name="pickup_date"
              value={formData.pickup_date}
              onChange={handleChange}
            />
          </div>
          
          <div className="form-group">
            <label>Delivery Date:</label>
            <input
              type="date"
              name="delivery_date"
              value={formData.delivery_date}
              onChange={handleChange}
              min={formData.pickup_date || new Date().toISOString().split('T')[0]}
            />
            {formData.pickup_date && formData.delivery_date && formData.delivery_date <= formData.pickup_date && (
              <small style={{color: 'red'}}>Delivery date must be after pickup date</small>
            )}
          </div>
          
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AdminDashboard;
