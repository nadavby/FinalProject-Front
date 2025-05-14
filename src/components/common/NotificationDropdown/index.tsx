import { FC, useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faSpinner, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';
import { useNotifications } from '../../../hooks/useNotifications';
import NotificationItem from '../NotificationItem';
import './styles.css';

interface NotificationDropdownProps {
  onClose: () => void;
}

const NotificationDropdown: FC<NotificationDropdownProps> = ({ onClose }) => {
  const { notifications, markAllAsRead } = useNotifications();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Show loading state briefly to improve perceived performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);

  // Ensure notifications persist when dropdown reopens
  useEffect(() => {
    console.log("[DROPDOWN] Dropdown opened with", notifications.length, "notifications");
    
    // Force a notification check when the dropdown opens
    const checkNotifications = () => {
      try {
        // If we don't have both critical match notifications, try to restore from localStorage
        const has91Match = notifications.some(n => n.type === 'match' && n.data?.score === 91);
        const has81Match = notifications.some(n => n.type === 'match' && n.data?.score === 81);
        
        if ((!has91Match || !has81Match) && has91Match !== has81Match) {
          console.log("[DROPDOWN] Missing critical match notification, trying to restore");
          
          // Try restoring from localStorage backup
          const backupNotifs = localStorage.getItem('notifications_backup');
          if (backupNotifs) {
            const parsedBackup = JSON.parse(backupNotifs);
            
            // If backup has more match notifications than current state, restore it
            const backupMatchCount = parsedBackup.filter((n: any) => n.type === 'match').length;
            const currentMatchCount = notifications.filter(n => n.type === 'match').length;
            
            if (backupMatchCount > currentMatchCount) {
              console.log("[DROPDOWN] Backup has more match notifications, restoring");
              localStorage.setItem('notifications', backupNotifs);
              window.location.reload(); // Force reload to restore from localStorage
            }
          }
        }
      } catch (err) {
        console.error("[DROPDOWN] Error checking backup notifications:", err);
        setError(true);
      }
    };
    
    // Add small delay to ensure dropdown is fully rendered
    const checkTimeout = setTimeout(checkNotifications, 500);
    
    // Prevent body scrolling when dropdown is open
    document.body.style.overflow = 'hidden';
    
    return () => {
      clearTimeout(checkTimeout);
      document.body.style.overflow = '';
    };
  }, [notifications]);

  // Handle clicks on the overlay
  const handleOverlayClick = () => {
    console.log("[DROPDOWN] Overlay clicked, closing dropdown");
    onClose();
  };

  // Close dropdown when ESC key is pressed
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        console.log("[DROPDOWN] ESC key pressed, closing dropdown");
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscKey);
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [onClose]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        console.log("[DROPDOWN] Clicking outside dropdown, closing");
        
        // Save current notifications to localStorage before closing
        try {
          localStorage.setItem('notifications_backup', JSON.stringify(notifications));
        } catch (err) {
          console.error("[DROPDOWN] Error saving notifications on close:", err);
        }
        
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose, notifications]);

  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };
  
  // Check if we have multiple matches to show a summary stat
  const matchCount = notifications.filter(n => n.type === 'match').length;

  return (
    <>
      <div className="notification-overlay" onClick={handleOverlayClick}></div>
      <div className="notification-dropdown" ref={dropdownRef}>
        <div className="notification-header">
          <h3>התראות {matchCount > 0 && <span className="match-count">({matchCount} התאמות)</span>}</h3>
          {notifications.some(notification => !notification.read) && (
            <button className="mark-all-read" onClick={handleMarkAllAsRead}>
              <FontAwesomeIcon icon={faCheck} className="me-1" />
              סמן הכל כנקרא
            </button>
          )}
        </div>
        
        <div className="notification-list">
          {loading ? (
            <div className="notification-status">
              <FontAwesomeIcon icon={faSpinner} spin />
              <p>טוען התראות...</p>
            </div>
          ) : error ? (
            <div className="notification-status error">
              <FontAwesomeIcon icon={faExclamationCircle} />
              <p>שגיאה בטעינת התראות</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="notification-status">
              <p>אין התראות חדשות</p>
            </div>
          ) : (
            <>
              {notifications.map(notification => (
                <NotificationItem 
                  key={notification.id} 
                  notification={notification} 
                  onClose={onClose}
                />
              ))}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default NotificationDropdown; 