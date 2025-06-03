/* eslint-disable @typescript-eslint/no-explicit-any */
/** @format */

import { FC, useState, useEffect } from "react";
import { useLostItems } from "../../hooks/useItems";
import { useAuth } from "../../hooks/useAuth";
import { Item } from "../../services/item-service";
import { useNavigate, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faMapMarkerAlt,
  faCalendarAlt,
  faTag,
  faMapMarkedAlt
} from "@fortawesome/free-solid-svg-icons";
import itemService from "../../services/item-service";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";

type SortOption = 'newest' | 'oldest' | 'category';

const LostItems: FC = () => {
  const { items, isLoading, error, fetchItems } = useLostItems();
  const { isAuthenticated, loading: authLoading, currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (location.state?.refresh) {
      fetchItems();
      window.history.replaceState({}, document.title);
    }
  }, [location.state, fetchItems]);

  if (!authLoading && !isAuthenticated) {
    navigate("/login");
    return null;
  }

  const handleDelete = async (itemId: string) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;

    try {
      if (!currentUser?._id) throw new Error('No user ID');
      const { request } = itemService.deleteItem(itemId, currentUser._id);
      await request;
      fetchItems();
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  };

  const handleSortChange = (option: SortOption) => {
    setSortOption(option);
    setDropdownOpen(false);
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return "N/A";
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      if (isNaN(dateObj.getTime())) {
        return "N/A";
      }
      return dateObj.toLocaleDateString();
    } catch (error) {
      console.error("Error formatting date:", date, error);
      return "N/A";
    }
  };

  const formatLocation = (location: any): string => {
    if (!location) return "Unknown location";
    
    if (typeof location === 'string') return location;
    
    if (location && typeof location === 'object') {
      if (typeof location === 'string') {
        try {
          const parsedLocation = JSON.parse(location);
          if (parsedLocation.lat && parsedLocation.lng) {
            return `Lat: ${parsedLocation.lat.toFixed(4)}, Lng: ${parsedLocation.lng.toFixed(4)}`;
          }
        } catch (e) {
            console.error("Error parsing location:", e);
        }
      }
      
      if (location.lat !== undefined && location.lng !== undefined) {
        return `Lat: ${location.lat.toFixed(4)}, Lng: ${location.lng.toFixed(4)}`;
      }
    }
    
    return String(location);
  };

  const getItemProperty = (item: any, property: string): string | undefined => {
    if (item && Object.prototype.hasOwnProperty.call(item, property)) {
      return item[property];
    }
    
    if (item && item._doc && Object.prototype.hasOwnProperty.call(item._doc, property)) {
      return item._doc[property];
    }
    
    if (item && item.fields && Object.prototype.hasOwnProperty.call(item.fields, property)) {
      return item.fields[property];
    }
    
    return undefined;
  };

  const getSortedItems = () => {
    if (!items) return [];
    
    let filteredItems = items;
    
    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      filteredItems = filteredItems.filter(item => {
        const name = (item.name || getItemProperty(item, 'name') || '').toLowerCase();
        const description = (item.description || getItemProperty(item, 'description') || '').toLowerCase();
        const category = (item.category || getItemProperty(item, 'category') || '').toLowerCase();
        const location = (item.location || getItemProperty(item, 'location') || '').toLowerCase();
        
        return name.includes(term) || 
               description.includes(term) ||
               category.includes(term) ||
               location.includes(term);
      });
    }
    
    const itemsCopy = [...filteredItems];
    
    switch (sortOption) {
      case 'newest':
        return itemsCopy.sort((a, b) => {
          const dateA = new Date(a.date || getItemProperty(a, 'date') || 0);
          const dateB = new Date(b.date || getItemProperty(b, 'date') || 0);
          return dateB.getTime() - dateA.getTime();
        });
      case 'oldest':
        return itemsCopy.sort((a, b) => {
          const dateA = new Date(a.date || getItemProperty(a, 'date') || 0);
          const dateB = new Date(b.date || getItemProperty(b, 'date') || 0);
          return dateA.getTime() - dateB.getTime();
        });
      case 'category':
        return itemsCopy.sort((a, b) => {
          const categoryA = a.category || getItemProperty(a, 'category') || '';
          const categoryB = b.category || getItemProperty(b, 'category') || '';
          return categoryA.localeCompare(categoryB);
        });
      default:
        return itemsCopy;
    }
  };

  const sortedItems = getSortedItems();
  const getSortOptionText = () => {
    switch (sortOption) {
      case 'newest': return 'Newest';
      case 'oldest': return 'Oldest';
      case 'category': return 'Category';
      default: return 'Sort by';
    }
  };

  const getProperImageUrl = (url: string): string => {
    if (!url) return '';    
    if (url.startsWith('http')) {
      return url;
    } else if (url.startsWith('/')) {
      return `http://localhost:3000${url}`;
    } else {
      return `http://localhost:3000/uploads/${url}`;
    }
  };

  const miniMapCenter = { lat: 32.0853, lng: 34.7818 };
  const miniMapMarkers = [
    { id: '1', lat: 32.0853, lng: 34.7818, name: 'ארנק שחור' },
    { id: '2', lat: 32.0800, lng: 34.7800, name: 'מפתחות עם מחזיק אדום' },
    { id: '3', lat: 32.0900, lng: 34.7850, name: 'תיק גב כחול' },
  ];

  function MiniMapPreview() {
    const { isLoaded } = useJsApiLoader({
      googleMapsApiKey: "AIzaSyAlx_vvH0P5fepk8bHpzO54syb5heCvJXI"
    });
    if (!isLoaded) return <div style={{textAlign:'center',paddingTop:40}}>Loading...</div>;
    return (
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={miniMapCenter}
        zoom={13}
        options={{
          disableDefaultUI: true,
          gestureHandling: 'none',
          draggable: false,
          zoomControl: false,
          clickableIcons: false,
          keyboardShortcuts: false,
          scrollwheel: false,
          styles: [
            { featureType: 'poi', stylers: [{ visibility: 'off' }] },
            { featureType: 'transit', stylers: [{ visibility: 'off' }] }
          ]
        }}
      >
        {miniMapMarkers.map(marker => (
          <Marker key={marker.id} position={{ lat: marker.lat, lng: marker.lng }} title={marker.name} />
        ))}
      </GoogleMap>
    );
  }

  return (
    <div className="container mt-3" style={{
      backgroundColor: '#fffbea',
      borderRadius: '8px',
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
      animation: 'fadeIn 0.5s ease-in-out'
    }}>
      {/* preview map */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ width: 220, height: 140, borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px #0001', border: '1px solid #eee' }}>
          <MiniMapPreview />
        </div>
        <button
          className="btn btn-warning"
          style={{ fontWeight: 'bold', fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}
          onClick={() => navigate('/map')}
        >
          <FontAwesomeIcon icon={faMapMarkedAlt} />
          Go to Lost Items Map
        </button>
      </div>
      <div className="row mb-4">
        <div className="col-md-6">
          <div className="input-group">
            <input
              type="text"
              className="form-control"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                borderRadius: '25px',
                transition: 'box-shadow 0.3s ease',
              }}
              onFocus={(e) => e.currentTarget.style.boxShadow = '0 0 10px rgba(255, 193, 7, 0.5)'}
              onBlur={(e) => e.currentTarget.style.boxShadow = 'none'}
            />
          </div>
        </div>
        <div className="col-md-6">
          <div className="dropdown">
            <button 
              className="btn btn-outline-secondary dropdown-toggle" 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              style={{
                transition: 'transform 0.3s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              Sort by: {getSortOptionText()}
            </button>
            {dropdownOpen && (
              <div className="dropdown-menu show">
                <button 
                  key="sort-newest"
                  className="dropdown-item"
                  onClick={() => handleSortChange('newest')}>
                  Newest
                </button>
                <button 
                  key="sort-oldest"
                  className="dropdown-item"
                  onClick={() => handleSortChange('oldest')}>
                  Oldest
                </button>
                <button 
                  key="sort-category"
                  className="dropdown-item"
                  onClick={() => handleSortChange('category')}>
                  Category
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && <p className="alert alert-danger">Error: {error}</p>}
      {isLoading && !error && <p>Loading...</p>}
      {!isLoading && sortedItems.length === 0 && !error && (
        <p className="alert alert-warning">No lost items available.</p>
      )}

      {sortedItems.length > 0 && (
        <div className="row">
          {sortedItems.map((item: Item) => {
            const itemId = item._id || getItemProperty(item, '_id');
            if (!itemId) {
              console.error("Item without _id found:", item);
              return null; 
            }
            
            const imgURL = item.imgURL || getItemProperty(item, 'imgURL');
            
            return (
              <div key={itemId} className="col-md-6 col-lg-4 mb-4">
                <div className="card shadow-sm h-100">
                  {imgURL && (
                    <img 
                      src={getProperImageUrl(imgURL)} 
                      className="card-img-top" 
                      alt={item.name || getItemProperty(item, 'name') || 'Unnamed Item'}
                      style={{ height: "200px", objectFit: "cover" }}
                      onError={(e) => {
                        console.error("LostItems - Image failed to load:", imgURL);
                        console.log("LostItems - Image URL attempted:", getProperImageUrl(imgURL));
                        setTimeout(() => {
                          if (imgURL && !imgURL.startsWith('http') && !imgURL.startsWith('/')) {
                            console.log("LostItems - Trying secondary image URL format...");
                            (e.target as HTMLImageElement).src = `http://localhost:3000/uploads/${imgURL}`;
                          } else {
                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/200?text=No+Image';
                          }
                        }, 100);
                      }}
                    />
                  )}
                  <div className="card-body d-flex flex-column">
                    <h5 className="card-title">{item.name || getItemProperty(item, 'name') || 'Unnamed Item'}</h5>
                    <p className="card-text">{item.description || getItemProperty(item, 'description') || 'No description available'}</p>
                    <div className="mt-auto">
                      <p className="card-text mb-1">
                        <FontAwesomeIcon icon={faTag} className="me-2 text-secondary" />
                        {item.category || getItemProperty(item, 'category') || 'Uncategorized'}
                      </p>
                      <p className="card-text mb-1">
                        <FontAwesomeIcon icon={faMapMarkerAlt} className="me-2 text-danger" />
                        {formatLocation(item.location || getItemProperty(item, 'location'))}
                      </p>
                      <p className="card-text">
                        <FontAwesomeIcon icon={faCalendarAlt} className="me-2 text-info" />
                        {formatDate(item.date || getItemProperty(item, 'date'))}
                      </p>
                    </div>
                  </div>
                  <div className="card-footer bg-transparent d-flex justify-content-between">
                    <button 
                      className="btn btn-sm btn-primary"
                      onClick={() => navigate(`/item/${itemId}`)}
                    >
                      View Details
                    </button>
                    {currentUser?._id === (item.owner || getItemProperty(item, 'owner')) && (
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(itemId)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LostItems; 