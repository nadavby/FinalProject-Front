/* eslint-disable @typescript-eslint/no-explicit-any */
/** @format */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faCheck,
  faTag,
  faMapMarkerAlt,
  faCalendarAlt,
  faInfoCircle,
  faExchangeAlt
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../hooks/useAuth';
import itemService, { Item } from '../../services/item-service';
import imageComparisonService from '../../services/imageComparisonService';
import './ItemDetail.css';

const ItemDetail: React.FC = () => {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [item, setItem] = useState<Item | null>(null);
  const [matches, setMatches] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);

  useEffect(() => {
    if (!itemId) return;

    const fetchItem = async () => {
      try {
        setLoading(true);
        const { request } = itemService.getItemById(itemId);
        const response = await request;
        setItem(response.data);
        
        fetchMatches(itemId);
      } catch (error) {
        console.error('Error fetching item:', error);
        setError('Failed to load item details');
      } finally {
        setLoading(false);
      }
    };

    fetchItem();
  }, [itemId]);

  const fetchMatches = async (itemId: string) => {
    try {
      setMatchesLoading(true);
      
      if (item?.matchResults && item.matchResults.length > 0) {
        setMatches(item.matchResults);
      } else {
        const matchesData = await imageComparisonService.findMatches(itemId);
        setMatches(matchesData.matches || []);
      }
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setMatchesLoading(false);
    }
  };

  const handleResolveItem = async (matchId?: string) => {
    if (!itemId || !item) return;
    
    try {
      await itemService.updateItem(itemId, { 
        ...item,
        isResolved: true,
        resolvedWithItemId: matchId 
      });
      
      setItem({ ...item, isResolved: true });
      setResolveDialogOpen(false);
      
      navigate(`/items/${item.itemType === 'lost' ? 'lost' : 'found'}`);
    } catch (error) {
      console.error('Error resolving item:', error);
      setError('Failed to mark item as resolved');
    }
  };

  const openResolveDialog = (match: any = null) => {
    setSelectedMatch(match);
    setResolveDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="container mt-5 text-center">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2">Loading item details...</p>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="container mt-5">
        <div className="alert alert-danger">
          {error || 'Item not found'}
        </div>
        <button 
          className="btn btn-primary" 
          onClick={() => navigate(-1)}
        >
          <FontAwesomeIcon icon={faArrowLeft} className="me-2" />
          Go Back
        </button>
      </div>
    );
  }

  const isOwner = currentUser && currentUser._id === item.owner;

  const getProperImageUrl = (url: string): string => {
    if (!url) return '';
    
    console.log("Original image URL:", url);
    
    if (url.startsWith('http')) {
      return url;
    } else if (url.startsWith('/')) {
      return `http://localhost:3000${url}`;
    } else {
      return `http://localhost:3000/uploads/${url}`;
    }
  };

  const formatLocation = (location: any): string => {
    if (!location) return "Unknown location";
    
    if (typeof location === 'string') return location;
    
    if (location && typeof location === 'object') {
      if (location.lat !== undefined && location.lng !== undefined) {
        return `Lat: ${location.lat.toFixed(4)}, Lng: ${location.lng.toFixed(4)}`;
      }
    }
    
    return String(location);
  };

  return (
    <div className="container mt-4 pb-5">
      <div className="d-flex align-items-center mb-4">
        <button
          className="btn btn-outline-secondary me-3"
          onClick={() => navigate(-1)}
        >
          <FontAwesomeIcon icon={faArrowLeft} /> Back
        </button>
        <h1 className="mb-0">
          {item.itemType === 'lost' ? 'Lost' : 'Found'} Item Details
        </h1>
      </div>

      <div className="row">
        <div className="col-lg-8">
          <div className="card shadow-sm mb-4">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <h2 className="card-title mb-3">{item.name}</h2>
                {item.isResolved ? (
                  <span className="badge bg-success">Resolved</span>
                ) : (
                  <span className="badge bg-warning">Active</span>
                )}
              </div>
              
              <div className="row">
                <div className="col-md-6">
                  {item.imgURL ? (
                    <img 
                      src={getProperImageUrl(item.imgURL)} 
                      alt={item.name}
                      className="img-fluid rounded mb-3"
                      style={{ maxHeight: '300px', objectFit: 'contain' }}
                      onError={(e) => {
                        console.error("Image failed to load:", item.imgURL);
                        console.log("Image URL attempted:", getProperImageUrl(item.imgURL));
                        setTimeout(() => {
                          if (item.imgURL && !item.imgURL.startsWith('http') && !item.imgURL.startsWith('/')) {
                            console.log("Trying secondary image URL format...");
                            (e.target as HTMLImageElement).src = `http://localhost:3000/uploads/${item.imgURL}`;
                          } else {
                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300?text=Image+Not+Available';
                          }
                        }, 100);
                      }}
                    />
                  ) : (
                    <div className="text-center py-5 border rounded mb-3 bg-light">
                      <FontAwesomeIcon icon={faInfoCircle} size="3x" className="text-secondary mb-3" />
                      <p className="text-muted">No image available</p>
                    </div>
                  )}
                </div>
                
                <div className="col-md-6">
                  <h5 className="mt-md-0 mt-3">Description</h5>
                  <p>{item.description}</p>
                  
                  <ul className="list-group list-group-flush">
                    <li className="list-group-item d-flex align-items-center px-0">
                      <FontAwesomeIcon icon={faTag} className="me-2 text-secondary" />
                      <strong className="me-2">Category:</strong> {item.category}
                    </li>
                    <li className="list-group-item d-flex align-items-center px-0">
                      <FontAwesomeIcon icon={faMapMarkerAlt} className="me-2 text-danger" />
                      <strong className="me-2">Location:</strong> {formatLocation(item.location)}
                    </li>
                    <li className="list-group-item d-flex align-items-center px-0">
                      <FontAwesomeIcon icon={faCalendarAlt} className="me-2 text-info" />
                      <strong className="me-2">Date:</strong> {new Date(item.date).toLocaleDateString()}
                    </li>
                  </ul>
                  
                  {isOwner && !item.isResolved && (
                    <div className="mt-3">
                      <button 
                        className="btn btn-success"
                        onClick={() => openResolveDialog()}
                      >
                        <FontAwesomeIcon icon={faCheck} className="me-2" />
                        Mark as Resolved
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-lg-4">
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-white">
              <h3 className="card-title mb-0">
                <FontAwesomeIcon icon={faExchangeAlt} className="me-2 text-primary" />
                Potential Matches
              </h3>
            </div>
            <div className="card-body">
              {matchesLoading ? (
                <div className="text-center py-4">
                  <div className="spinner-border spinner-border-sm text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-2 mb-0">Finding matches...</p>
                </div>
              ) : matches && matches.length > 0 ? (
                <div className="match-list">
                  {matches.map((match) => (
                    <div key={match.matchedItemId || match._id} className="card mb-3 match-card">
                      <div className="row g-0">
                        {match.itemImgURL && (
                          <div className="col-4">
                            <img 
                              src={getProperImageUrl(match.itemImgURL)} 
                              alt={match.itemName} 
                              className="img-fluid rounded-start"
                              style={{ height: '100%', objectFit: 'cover' }}
                              onError={(e) => {
                                console.error("Match image failed to load:", match.itemImgURL);
                                console.log("Match image URL attempted:", getProperImageUrl(match.itemImgURL));
                                setTimeout(() => {
                                  if (match.itemImgURL && !match.itemImgURL.startsWith('http') && !match.itemImgURL.startsWith('/')) {
                                    console.log("Trying secondary match image URL format...");
                                    (e.target as HTMLImageElement).src = `http://localhost:3000/uploads/${match.itemImgURL}`;
                                  } else {
                                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/100?text=No+Image';
                                  }
                                }, 100);
                              }}
                            />
                          </div>
                        )}
                        <div className={match.itemImgURL ? "col-8" : "col-12"}>
                          <div className="card-body py-2">
                            <h5 className="card-title mb-1">{match.itemName}</h5>
                            <p className="card-text small text-muted mb-1">{match.itemDescription}</p>
                            <div className="d-flex justify-content-between align-items-center">
                              <span className="badge bg-info">
                                {(match.similarity * 100).toFixed()}% Match
                              </span>
                              <button 
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => navigate(`/item/${match.matchedItemId}`)}
                              >
                                View
                              </button>
                            </div>
                            {isOwner && !item.isResolved && (
                              <button 
                                className="btn btn-sm btn-success mt-2 w-100"
                                onClick={() => openResolveDialog(match)}
                              >
                                This is my item!
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted mb-0">
                    No potential matches found yet. We'll continue looking!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {resolveDialogOpen && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {selectedMatch ? 'Confirm Match' : 'Mark as Resolved'}
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setResolveDialogOpen(false)}
                ></button>
              </div>
              <div className="modal-body">
                {selectedMatch ? (
                  <p>
                    Are you sure this is a match with "{selectedMatch.itemName}"? 
                    This will mark your item as resolved.
                  </p>
                ) : (
                  <p>
                    Are you sure you want to mark this item as resolved?
                  </p>
                )}
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setResolveDialogOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-success"
                  onClick={() => handleResolveItem(selectedMatch?.matchedItemId)}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show"></div>
        </div>
      )}
    </div>
  );
};

export default ItemDetail; 