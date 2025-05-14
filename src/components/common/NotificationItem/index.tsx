import { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faCheckCircle, faTimes, faEye } from '@fortawesome/free-solid-svg-icons';
import { Notification, useNotifications } from '../../../hooks/useNotifications';
import './styles.css';

interface NotificationItemProps {
  notification: Notification;
  onClose: () => void;
}

const NotificationItem: FC<NotificationItemProps> = ({ notification, onClose }) => {
  const { markAsRead, removeNotification } = useNotifications();
  const navigate = useNavigate();
  
  const handleClick = () => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    if (notification.type === 'match' && notification.data?.itemId) {
      onClose();
      navigate(`/item/${notification.data.itemId}`);
    }
  };
  
  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeNotification(notification.id);
  };
  
  const handleMarkAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    markAsRead(notification.id);
  };
  
  // Format the date to show relative time (like "5 minutes ago")
  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'עכשיו';
    if (diffMins < 60) return `לפני ${diffMins} דקות`;
    if (diffHours < 24) return `לפני ${diffHours} שעות`;
    if (diffDays === 1) return 'אתמול';
    return `לפני ${diffDays} ימים`;
  };
  
  // Determine if this is a high priority notification
  const isHighPriority = notification.type === 'match' && notification.data?.score && notification.data.score >= 90;
  
  return (
    <div 
      className={`notification-item ${notification.read ? 'read' : 'unread'} ${isHighPriority ? 'priority' : ''}`}
      onClick={handleClick}
    >
      <div className="notification-icon">
        <FontAwesomeIcon icon={faBell} />
      </div>
      
      <div className="notification-content">
        <div className="notification-header-row">
          <h4 className="notification-title">{notification.title}</h4>
          <span className="notification-time">{formatRelativeTime(notification.createdAt)}</span>
        </div>
        
        <p className="notification-message">{notification.message}</p>
        
        {notification.type === 'match' && notification.data?.score && (
          <div className="match-info">
            <div className="match-score">
              <div className="score-indicator" style={{ width: `${notification.data.score}%` }}></div>
              <span>{notification.data.score}% התאמה</span>
            </div>
            {notification.data.itemId && (
              <button className="view-match-btn">
                <FontAwesomeIcon icon={faEye} className="me-1" />
                צפה בפרטים
              </button>
            )}
          </div>
        )}
      </div>
      
      <div className="notification-actions">
        {!notification.read && (
          <button className="action-btn read-btn" onClick={handleMarkAsRead} title="סמן כנקרא">
            <FontAwesomeIcon icon={faCheckCircle} />
          </button>
        )}
        <button className="action-btn remove-btn" onClick={handleRemove} title="הסר">
          <FontAwesomeIcon icon={faTimes} />
        </button>
      </div>
    </div>
  );
};

export default NotificationItem; 