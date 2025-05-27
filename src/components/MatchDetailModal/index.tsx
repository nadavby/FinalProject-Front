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
}

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
}) => (
  <Modal show={isOpen} onHide={onClose} className="match-detail-modal">
    <Modal.Header closeButton>
      <Modal.Title>Match Confirmation</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      <div className="match-detail-content">
        <img src={itemImage} alt={itemName} className="item-thumb" />
        <img src={matchImage} alt={matchName} className="match-thumb" />
        <p>
          Item: <strong>{itemName}</strong><br/>
          Match: <strong>{matchName}</strong><br/>
          Score: <strong>{score}</strong><br/>
          Owner: <strong>{ownerName}</strong> ({ownerEmail})
        </p>
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
