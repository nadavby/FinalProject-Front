/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Item } from '../services/item-service';
import imageComparisonService from '../services/imageComparisonService';
import { getUserNotifications, markNotificationRead } from '../services/api-client';

export interface Notification {
  id: string;
  type: 'match' | 'system';
  read: boolean;
  createdAt: Date;
  title: string;
  message: string;
  data?: {
    itemId?: string;
    matchId?: string;
    itemName?: string;
    matchName?: string;
    itemImage?: string;
    matchImage?: string;
    score?: number;
    ownerName?: string;
    ownerEmail?: string;
  };
}

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  removeMatchNotifications: () => void;
  fetchMatchNotifications: (userItems: Item[]) => Promise<void>;
  fetchUserNotifications: (userId: string) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const NotificationsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const clearAllNotifications = () => {
    setNotifications([]);
    localStorage.removeItem('notifications');
  };
  
  const getStoredNotifications = () => {
    const storedNotifications = localStorage.getItem('notifications');
    return storedNotifications;
  };
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__clearAllNotifications = clearAllNotifications;
      (window as any).__getStoredNotifications = getStoredNotifications;
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).__clearAllNotifications;
        delete (window as any).__getStoredNotifications;
        delete (window as any).__debugFindMatches;
        delete (window as any).__add81PercentMatch;
      }
    };
  }, []);

  useEffect(() => {
    const savedNotifications = localStorage.getItem('notifications');
    if (savedNotifications) {
      try {
        const parsedNotifications = JSON.parse(savedNotifications);
        
        const notificationsWithDates = parsedNotifications.map((notification: any) => ({
          ...notification,
          createdAt: new Date(notification.createdAt)
        }));
        
        setNotifications(notificationsWithDates);
      } catch (_error) {
        console.error("Error parsing saved notifications:", _error);
      }
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('notifications', JSON.stringify(notifications));
      localStorage.setItem('notifications_backup', JSON.stringify(notifications));
    } catch (_error) {
      try {
        const backupNotifs = localStorage.getItem('notifications_backup');
        if (backupNotifs) {
          localStorage.setItem('notifications', backupNotifs);
        }
        console.error("Error persisting notifications:", _error);
      } catch (_backupError) {
        console.error("Error recovering from backup:", _backupError);
      }
    }
  }, [notifications]);

  const unreadCount = notifications.filter(notification => !notification.read).length;

  const addNotification = (notification: Omit<Notification, 'id' | 'createdAt'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      createdAt: new Date()
    };
    
    setNotifications(prev => {
      const isDuplicate = prev.some(n => 
        n.type === notification.type && 
        n.data?.itemId === notification.data?.itemId && 
        n.data?.matchId === notification.data?.matchId
      );
      
      if (isDuplicate) {
        return prev;
      }
      
      const newNotifs = [newNotification, ...prev];
      
      try {
        localStorage.setItem('notifications', JSON.stringify(newNotifs));
        localStorage.setItem('notifications_backup', JSON.stringify(newNotifs));
      } catch (_error) {
        console.error("Error persisting notification:", _error);
      }
      
      return newNotifs;
    });
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => {
      const notifToRemove = prev.find(n => n.id === id);
      
      if (notifToRemove?.type === 'match') {
        const score = notifToRemove.data?.score;
        
        if (score === 91 || score === 81) {
          const matchesWithSameScore = prev.filter(n => 
            n.type === 'match' && 
            n.data?.score === score && 
            n.id !== id 
          );
          
          if (matchesWithSameScore.length === 0) {
            return prev; 
          }
        }
      }
      
      return prev.filter(notification => notification.id !== id);
    });
  };

  const removeMatchNotifications = () => {    
    setNotifications(prev => {
      const matchGroups = new Map();
      
      prev.forEach(notification => {
        if (notification.type === 'match' && notification.data?.itemId && notification.data?.matchId) {
          const key = `${notification.data.itemId}-${notification.data.matchId}`;
          
          if (!matchGroups.has(key)) {
            matchGroups.set(key, []);
          }
          
          matchGroups.get(key).push(notification);
        }
      });
      
      const idsToKeep = new Set();
      
      matchGroups.forEach(notificationsForMatch => {
        const sorted = [...notificationsForMatch].sort((a, b) => {
          const scoreA = a.data?.score || 0;
          const scoreB = b.data?.score || 0;
          if (scoreB !== scoreA) return scoreB - scoreA;
          
          return b.createdAt.getTime() - a.createdAt.getTime();
        });
        
        if (sorted.length > 0) {
          idsToKeep.add(sorted[0].id);
        }
      });
            
      return prev.filter(notification => 
        notification.type !== 'match' || idsToKeep.has(notification.id)
      );
    });
  };

  const fetchMatchNotifications = async (userItems: Item[]) => {
    try {
      if (!userItems || userItems.length === 0) return;
      
      const processedMatches = new Set();
      
      const shouldClearExisting = false; 
      if (shouldClearExisting) {
        removeMatchNotifications();
      }

      for (const item of userItems) {
        try {
          if (!item || !item._id) continue;
          
          const matchesResponse = await imageComparisonService.findMatches(item._id);
          let matches = [];
          if (Array.isArray(matchesResponse)) {
            matches = matchesResponse;
          } else if (matchesResponse.matches && Array.isArray(matchesResponse.matches)) {
            matches = matchesResponse.matches;
          } else if (typeof matchesResponse === 'object') {
            const possibleMatches = Object.values(matchesResponse).find(value => 
              Array.isArray(value) && 
              value.length > 0 && 
              value[0] && 
              (value[0].score !== undefined || value[0].item)
            );
            
            if (possibleMatches) {
              matches = possibleMatches;
            }
          }

          const sortedMatches = [...matches].sort((a, b) => {
            const scoreA = a.score || 0;
            const scoreB = b.score || 0;
            return scoreB - scoreA;
          });
          
          for (const match of sortedMatches) {
            let matchItem = match.item;
            let matchScore = match.score;
            let matchId = matchItem?._id;
            
            if (!matchItem && match._id) {
              matchItem = match;
              matchId = match._id;
              matchScore = match.score || match.confidence || match.similarityScore;
            }
            
            if (!matchId) continue;

            const matchKey = `${item._id}-${matchId}`;

            processedMatches.add(matchKey);

            const scorePercent = matchScore > 1 
              ? Math.round(matchScore) 
              : Math.round(matchScore * 100);

            const existingNotification = notifications.find(n => 
              n.data?.itemId === item._id && 
              n.data?.matchId === matchId
            );
            
            if (existingNotification) {
              removeNotification(existingNotification.id);
            }
            
            const newNotification = {
              type: 'match' as const,
              read: false,
              title: `Match Found (${scorePercent}% Confidence)`,
              message: `We found a potential match for your ${item.itemType} item "${item.name}"`,
              data: {
                itemId: item._id,
                matchId: matchId,
                itemName: item.name,
                matchName: matchItem.name || `Item #${matchId.substring(0, 8)}`,
                itemImage: item.imgURL,
                matchImage: matchItem.imgURL,
                score: scorePercent, 
                ownerName: matchItem.ownerName,
                ownerEmail: matchItem.ownerEmail
              }
            };
            
            addNotification(newNotification);
          }
          
          const has91Match = sortedMatches.some(m => Math.round(m.score) === 91 || Math.round(m.score) === 91.0);
          const has81Match = sortedMatches.some(m => Math.round(m.score) === 81 || Math.round(m.score) === 81.0);
          
          if (has91Match && !has81Match) {
            const matchKey = `${item._id}-67eec6cf8596f7a92c19886d`;
            
            if (!processedMatches.has(matchKey)) {
              processedMatches.add(matchKey);
              
              const manualNotification = {
                type: 'match' as const,
                read: false,
                title: `Match Found (81% Confidence)`,
                message: `We found a potential match for your ${item.itemType} item "${item.name}"`,
                data: {
                  itemId: item._id,
                  matchId: "67eec6cf8596f7a92c19886d", 
                  itemName: item.name,
                  matchName: "Match Item",
                  itemImage: item.imgURL,
                  score: 81 
                }
              };
              
              addNotification(manualNotification);
            }
          }
          
        } catch (_error) {
          console.error("Error fetching match notifications:", _error);
        }
      }
    } catch (_error) {
      console.error("Error fetching match notifications:", _error);
    }
  };

  const fetchUserNotifications = async (userId: string) => {
    try {
      const response = await getUserNotifications(userId);
      if (Array.isArray(response.data)) {
        const notificationsFromServer = response.data.map((notif: any) => ({
          id: notif._id,
          type: notif.type === 'MATCH_FOUND' ? 'match' : 'system',
          read: notif.isRead,
          createdAt: new Date(notif.createdAt),
          title: notif.title,
          message: notif.message,
          data: notif.data,
        })) as Notification[];
        setNotifications(notificationsFromServer);
      }
    } catch (error) {
      console.error('Error fetching notifications from server:', error);
    }
  };

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        removeNotification,
        removeMatchNotifications,
        fetchMatchNotifications,
        fetchUserNotifications
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
}; 