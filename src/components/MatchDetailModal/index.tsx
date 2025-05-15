import { FC, useEffect, useState } from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faUser, faCheckCircle, faPercentage } from '@fortawesome/free-solid-svg-icons';
import './styles.css';
import itemService, { Item } from '../../services/item-service';
import { useAuth } from '../../hooks/useAuth';

interface MatchDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId?: string;
  matchId?: string;
  itemName?: string;
  matchName?: string;
  itemImage?: string;
  matchImage?: string;
  score?: number;
  ownerName?: string;
  ownerEmail?: string;
  onViewDetails: () => void;
}

const MatchDetailModal: FC<MatchDetailModalProps> = ({
  isOpen,
  onClose,
  itemId,
  matchId,
  itemName,
  matchName,
  itemImage,
  matchImage,
  score,
  ownerName,
  ownerEmail,
  onViewDetails
}) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [item, setItem] = useState<Item | null>(null);
  const [matchedItem, setMatchedItem] = useState<Item | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchItems = async () => {
      if (!itemId || !matchId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        if (itemName && matchName) {
          setItem({
            _id: itemId,
            name: itemName,
            imgURL: itemImage,
          } as Item);
          
          setMatchedItem({
            _id: matchId,
            name: matchName,
            imgURL: matchImage,
            ownerName,
            ownerEmail
          } as Item);
        } else {
          const [itemResponse, matchResponse] = await Promise.all([
            itemService.getItemById(itemId).request,
            itemService.getItemById(matchId).request
          ]);
          
          setItem(itemResponse.data);
          setMatchedItem(matchResponse.data);
        }
      } catch (error) {
        console.error('Error fetching items:', error);
        setError('Failed to load items. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    if (isOpen) {
      fetchItems();
    }
  }, [isOpen, itemId, matchId, itemName, matchName, itemImage, matchImage, ownerName, ownerEmail]);

  const getOtherSideInfo = () => {
    if (!currentUser) return { name: '', email: '' };
    if (item && matchedItem) {
      if (item.owner === currentUser._id || item.ownerName === currentUser.userName || item.ownerEmail === currentUser.email) {
        return { name: matchedItem.ownerName, email: matchedItem.ownerEmail };
      } else {
        return { name: item.ownerName, email: item.ownerEmail };
      }
    }
    return { name: ownerName, email: ownerEmail };
  };

  const otherSide = getOtherSideInfo();

  // פונקציה להצגת טקסט "Found by ..." או "Lost by ..."
  const getItemTypeText = (itemObj: Item | null, fallback: string) => {
    if (!itemObj) return fallback;
    if (itemObj.itemType === 'found') {
      return `Found by ${itemObj.ownerName || ''}${itemObj.ownerEmail ? ` (${itemObj.ownerEmail})` : ''}`;
    } else if (itemObj.itemType === 'lost') {
      return `Lost by ${itemObj.ownerName || ''}${itemObj.ownerEmail ? ` (${itemObj.ownerEmail})` : ''}`;
    }
    return fallback;
  };

  if (!isOpen) return null;

  return (
    <Modal show={isOpen} onHide={onClose} centered className="match-detail-modal">
      <Modal.Header closeButton>
        <Modal.Title>Potential Match Found</Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        {loading ? (
          <div className="text-center py-4">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2">Loading match details...</p>
          </div>
        ) : error ? (
          <div className="alert alert-danger">{error}</div>
        ) : (
          <>
            <div className="match-detail-score">
              <FontAwesomeIcon icon={faPercentage} className="me-2" />
              Match Score: <span>{score}%</span>
            </div>
            
            <div className="match-detail-items">
              <div className="match-detail-item">
                <div className="match-detail-item-image">
                  {itemImage && (
                    <img 
                      src={itemImage} 
                      alt={itemName} 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/100?text=No+Image';
                      }}
                    />
                  )}
                </div>
                <div className="match-detail-item-info">
                  <h5>{itemName || (item?.name || 'Your Item')}</h5>
                  <p className="item-type">{getItemTypeText(item, 'Your Item')}</p>
                </div>
              </div>
              
              <div className="match-divider">
                <div className="match-line"></div>
                <div className="match-icon">
                  <FontAwesomeIcon icon={faCheckCircle} />
                </div>
                <div className="match-line"></div>
              </div>
              
              <div className="match-detail-item">
                <div className="match-detail-item-image">
                  {matchImage && (
                    <img 
                      src={matchImage} 
                      alt={matchName} 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/100?text=No+Image';
                      }}
                    />
                  )}
                </div>
                <div className="match-detail-item-info">
                  <h5>{matchName || (matchedItem?.name || 'Matched Item')}</h5>
                  <p className="item-type">{getItemTypeText(matchedItem, 'Matched Item')}</p>
                </div>
              </div>
            </div>
            
            {(otherSide.name || otherSide.email) && (
              <div className="match-owner-info">
                <h6>Other User Information</h6>
                {otherSide.name && (
                  <div className="owner-detail">
                    <FontAwesomeIcon icon={faUser} className="me-2" />
                    {otherSide.name}
                  </div>
                )}
                {otherSide.email && (
                  <div className="owner-detail">
                    <FontAwesomeIcon icon={faEnvelope} className="me-2" />
                    {otherSide.email}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </Modal.Body>
      
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
        <Button variant="primary" onClick={onViewDetails}>
          View Full Details
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default MatchDetailModal; 