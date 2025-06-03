// src/components/MatchDetailModal/index.tsx

import React from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import './styles.css';

interface MatchDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewDetails: (e: React.MouseEvent<HTMLButtonElement>) => void;
  itemId: string;
  matchId: string;
  itemName: string;
  matchName: string;
  itemImage: string;
  matchImage: string;
  score: number;
  ownerName: string;
  ownerEmail: string;
  contactMethod?: string;
  contactDetails?: string;
  itemDescription?: string;
  matchDescription?: string;
  itemCategory?: string;
  matchCategory?: string;
  itemDate?: string;
  matchDate?: string;
  itemLocation?: string;
  matchLocation?: string;
  message?: string;
  title?: string;
}

// פונקציה להמרת תאריך לפורמט DD.MM.YYYY
const formatDate = (dateStr?: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-GB');
};

// פונקציה להמרת קואורדינטות לשם עיר (פשוטה, ללא API)
const formatLocation = (loc?: string) => {
  if (!loc) return '';
  try {
    const obj = typeof loc === 'string' ? JSON.parse(loc) : loc;
    if (obj && typeof obj === 'object' && obj.lat && obj.lng) {
      // כאן אפשר להוסיף קריאה ל-API הפוכה (reverse geocoding) בעתיד
      return `Lat: ${obj.lat}, Lng: ${obj.lng}`;
    }
  } catch {
    // לא JSON
  }
  return loc;
};

const MatchDetailModal: React.FC<MatchDetailModalProps> = ({
  isOpen,
  onClose,
  onViewDetails,
  itemName,
  matchName,
  itemImage,
  matchImage,
  score,
  ownerName,
  ownerEmail,
  contactMethod,
  contactDetails,
  itemDescription,
  matchDescription,
  itemCategory,
  matchCategory,
  itemDate,
  matchDate,
  itemLocation,
  matchLocation,
  message,
  title,
}) => (
  <Modal show={isOpen} onHide={onClose} className="match-detail-modal">
    <Modal.Header closeButton>
      <Modal.Title>{title || 'Match Confirmation'}</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      <div className="match-detail-content">
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'center' }}>
          {itemImage && <img src={itemImage} alt={itemName} className="item-thumb" />}
          {matchImage && <img src={matchImage} alt={matchName} className="match-thumb" />}
        </div>
        <hr />
        <div style={{ display: 'flex', gap: 32, justifyContent: 'space-between' }}>
          <div>
            <h5>Your Item</h5>
            <div><strong>Name:</strong> {itemName}</div>
            {itemDescription && <div><strong>Description:</strong> {itemDescription}</div>}
            {itemCategory && <div><strong>Category:</strong> {itemCategory}</div>}
            {itemDate && <div><strong>Date:</strong> {formatDate(itemDate)}</div>}
            {itemLocation && <div><strong>Location:</strong> {formatLocation(itemLocation)}</div>}
          </div>
          <div>
            <h5>Matched Item</h5>
            <div><strong>Name:</strong> {matchName}</div>
            {matchDescription && <div><strong>Description:</strong> {matchDescription}</div>}
            {matchCategory && <div><strong>Category:</strong> {matchCategory}</div>}
            {matchDate && <div><strong>Date:</strong> {formatDate(matchDate)}</div>}
            {matchLocation && <div><strong>Location:</strong> {formatLocation(matchLocation)}</div>}
          </div>
        </div>
        <hr />
        <div>
          {typeof score !== 'undefined' && score !== null && (
            <div><strong>Match Score:</strong> {score}</div>
          )}
          <div><strong>Owner:</strong> {ownerName} ({ownerEmail})</div>
          {contactDetails && (
            <div><strong>Contact Details:</strong> {contactDetails} {contactMethod && `(${contactMethod})`}</div>
          )}
          {message && (
            <div><strong>Message:</strong> {message}</div>
          )}
        </div>
      </div>
    </Modal.Body>
    <Modal.Footer>
      <Button variant="secondary" onClick={onClose}>
        Close
      </Button>
      <Button
        variant="primary"
        onMouseDown={e => e.stopPropagation()}
        onClick={onViewDetails}
      >
        View Full Details
      </Button>
    </Modal.Footer>
  </Modal>
);

export default MatchDetailModal;
