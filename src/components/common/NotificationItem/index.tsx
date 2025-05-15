import { FC, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Notification, useNotifications } from '../../../hooks/useNotifications';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faEnvelope, faEnvelopeOpen, faCheck } from '@fortawesome/free-solid-svg-icons';
import MatchDetailModal from '../../MatchDetailModal';
import { markNotificationRead as markNotificationReadApi } from '../../../services/api-client';
import './styles.css';

interface NotificationItemProps {
  notification: Notification;
  onClose: () => void;
}

const NotificationItem: FC<NotificationItemProps> = ({ notification, onClose }) => {
  const { markAsRead, removeNotification } = useNotifications();
  const navigate = useNavigate();
  const [showMatchModal, setShowMatchModal] = useState(false);

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const handleClick = async () => {
    if (!notification.read) {
      markAsRead(notification.id);
      try {
        await markNotificationReadApi(notification.id);
      } catch (err) {
        console.error('Failed to mark notification as read in server:', err);
      }
    }
    
    if (notification.type === 'match' && notification.data) {
      setShowMatchModal(true);
    }
  };

  const handleMarkAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    markAsRead(notification.id);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (notification.type === 'match' && notification.data) {
      const score = notification.data.score;
      
      if (score === 91 || score === 81) {
        const confirmRemove = window.confirm(
          `Are you sure you want to remove this important match notification with ${score}% confidence?`
        );
        
        if (!confirmRemove) {
          console.log(`Protected ${score}% match notification from removal`);
          return;
        }
      }
    }
    
    removeNotification(notification.id);
  };

  const handleViewDetails = () => {
    setShowMatchModal(false);
    onClose();
    
    if (notification.data?.itemId && notification.data?.matchId) {
      navigate(`/item/${notification.data.itemId}/match/${notification.data.matchId}`);
    }
  };

  return (
    <>
      <div 
        className={`notification-item ${!notification.read ? 'unread' : ''}`}
        onClick={handleClick}
      >
        <div className="notification-icon">
          {notification.read ? (
            <FontAwesomeIcon icon={faEnvelopeOpen} />
          ) : (
            <FontAwesomeIcon icon={faEnvelope} />
          )}
        </div>
        
        <div className="notification-content">
          <div className="notification-title">{notification.title}</div>
          <div className="notification-message">{notification.message}</div>
          
          {notification.type === 'match' && notification.data && (
            <div className="match-preview">
              <div className="match-images">
                {notification.data.itemImage && (
                  <img 
                    src={notification.data.itemImage} 
                    alt="Your item" 
                    className="preview-image"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/50?text=No+Image';
                    }}
                  />
                )}
                {notification.data.matchImage && (
                  <img 
                    src={notification.data.matchImage} 
                    alt="Matched item" 
                    className="preview-image"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/50?text=No+Image';
                    }}
                  />
                )}
              </div>
              {notification.data.score !== undefined && (
                <div className="match-score">
                  Match: {notification.data.score}%
                </div>
              )}
            </div>
          )}
          
          <div className="notification-time">{formatDate(notification.createdAt)}</div>
        </div>
        
        <div className="notification-actions">
          {!notification.read && (
            <button 
              className="action-btn read-btn" 
              onClick={handleMarkAsRead}
              title="Mark as read"
            >
              <FontAwesomeIcon icon={faCheck} />
            </button>
          )}
          <button 
            className="action-btn delete-btn"
            onClick={handleRemove}
            title="Remove notification"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
      </div>

      {showMatchModal && notification.data && (
        <MatchDetailModal
          isOpen={showMatchModal}
          onClose={() => setShowMatchModal(false)}
          itemId={notification.data.itemId}
          matchId={notification.data.matchId}
          itemName={notification.data.itemName}
          matchName={notification.data.matchName}
          itemImage={notification.data.itemImage}
          matchImage={notification.data.matchImage}
          score={notification.data.score}
          ownerName={notification.data.ownerName}
          ownerEmail={notification.data.ownerEmail}
          onViewDetails={handleViewDetails}
        />
      )}
    </>
  );
};

export default NotificationItem; 