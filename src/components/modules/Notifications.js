import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import './Notifications.css';

const Notifications = () => {
  const { classNumber } = useParams();
  const { updateBreadcrumbs } = useApp();

  useEffect(() => {
    updateBreadcrumbs([`Class ${classNumber}`, 'Notifications']);
  }, [classNumber, updateBreadcrumbs]);

  const sampleNotifications = [
    {
      id: 1,
      startDate: '2024-01-15',
      endDate: '2024-01-20',
      message: 'Parent-Teacher Meeting scheduled for next week. Please check your ward\'s progress report.',
      priority: 'high',
      type: 'meeting'
    },
    {
      id: 2,
      startDate: '2024-01-10',
      endDate: '2024-01-25',
      message: 'Annual Science Exhibition preparations are ongoing. Students are encouraged to participate.',
      priority: 'medium',
      type: 'event'
    },
    {
      id: 3,
      startDate: '2024-01-08',
      endDate: '2024-01-15',
      message: 'Library books renewal deadline is approaching. Please return or renew your borrowed books.',
      priority: 'low',
      type: 'reminder'
    },
    {
      id: 4,
      startDate: '2024-01-05',
      endDate: '2024-01-12',
      message: 'Winter uniform policy is now in effect. Please ensure students are dressed appropriately.',
      priority: 'medium',
      type: 'policy'
    },
    {
      id: 5,
      startDate: '2024-01-01',
      endDate: '2024-01-10',
      message: 'New semester fee payment deadline is January 10th. Late payments will incur additional charges.',
      priority: 'high',
      type: 'payment'
    }
  ];

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '📢';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'meeting': return '👥';
      case 'event': return '🎯';
      case 'reminder': return '⏰';
      case 'policy': return '📋';
      case 'payment': return '💳';
      default: return '📢';
    }
  };

  return (
    <div className="notifications-container">
      <div className="notifications-header">
        <h1 className="notifications-title">Class {classNumber} - Notifications</h1>
        <p className="notifications-subtitle">
          Stay updated with important announcements and information
        </p>
      </div>

      <div className="notifications-list">
        {sampleNotifications.map((notification, index) => (
          <div
            key={notification.id}
            className={`notification-card ${notification.priority}`}
            style={{ '--animation-delay': `${index * 0.1}s` }}
          >
            <div className="notification-header">
              <div className="notification-icons">
                <span className="type-icon">{getTypeIcon(notification.type)}</span>
                <span className="priority-icon">{getPriorityIcon(notification.priority)}</span>
              </div>
              <div className="notification-dates">
                <div className="date-info">
                  <span className="date-label">Start:</span>
                  <span className="date-value">{formatDate(notification.startDate)}</span>
                </div>
                <div className="date-info">
                  <span className="date-label">End:</span>
                  <span className="date-value">{formatDate(notification.endDate)}</span>
                </div>
              </div>
            </div>
            <div className="notification-content">
              <p className="notification-message">{notification.message}</p>
            </div>
            <div className="notification-footer">
              <span className={`priority-badge ${notification.priority}`}>
                {notification.priority.toUpperCase()} PRIORITY
              </span>
              <span className="type-badge">
                {notification.type.toUpperCase()}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="notifications-footer">
        <div className="placeholder-note">
          <h3>🚧 Development Note</h3>
          <p>
            This is a sample notifications display. In the full implementation, 
            notifications would be loaded dynamically from a backend service with 
            real-time updates and user-specific filtering.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Notifications;