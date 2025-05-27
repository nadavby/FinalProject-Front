/* eslint-disable @typescript-eslint/no-explicit-any */
/** @format */

import { FC, useState, ChangeEvent, FormEvent, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import itemService from "../../services/item-service";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUpload,
  faCamera,
  faArrowLeft,
  faTag,
  faMapMarkerAlt,
  faCalendarAlt,
  faLocationCrosshairs
} from "@fortawesome/free-solid-svg-icons";
import { itemCategories, ItemCategoryGroup } from "../../data/itemCategories";
import { useLoadScript } from "@react-google-maps/api";
import MultiMatchesModal, { MatchResult } from "../MultiMatchesModal";

interface Location {
  lat: number;
  lng: number;
}

interface ItemFormData {
  kind: "lost" | "found";
  categoryGroup: string;
  itemType: string;
  otherItemType?: string;
  description: string;
  date: string;
  location: Location;
}

const defaultLocation = {
  lat: 32.0853, 
  lng: 34.7818
};

const mapContainerStyle = {
  width: "100%",
  height: "300px",
  marginBottom: "1rem",
  borderRadius: "0.5rem"
};

const libraries = ["places"];

const ItemUpload: FC = () => {
  const navigate = useNavigate();
  const { currentUser, isAuthenticated, loading } = useAuth();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  
  const [apiKey] = useState(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyCqhXlqSGDjbIsC8sFcADsTV2z3nbuwLCs");
  
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey,
    libraries: libraries as any
  });

  const [formData, setFormData] = useState<ItemFormData>({
    kind: "lost",
    categoryGroup: "",
    itemType: "",
    otherItemType: "",
    description: "",
    date: new Date().toISOString().split('T')[0],
    location: defaultLocation
  });
  
  const [selectedCategoryGroup, setSelectedCategoryGroup] = useState<ItemCategoryGroup | null>(null);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matchResults, setMatchResults] = useState<MatchResult[] | null>(null);
  const [uploadedItemId, setUploadedItemId] = useState<string | null>(null);
  const [uploadedItemName, setUploadedItemName] = useState<string | null>(null);
  const [showMatchesModal, setShowMatchesModal] = useState(false);
  const [otherCategory, setOtherCategory] = useState<string>("");
  const [mapInitialized, setMapInitialized] = useState(false);

  useEffect(() => {
    if (isLoaded && !loadError && mapContainerRef.current && !mapInitialized) {
      try {
        const map = new window.google.maps.Map(mapContainerRef.current, {
          center: formData.location,
          zoom: 13,
          fullscreenControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          zoomControl: true
        });
        
        const marker = new window.google.maps.Marker({
          position: formData.location,
          map: map,
          draggable: true
        });
        
        map.addListener('click', (e: google.maps.MapMouseEvent) => {
          if (e.latLng) {
            marker.setPosition(e.latLng);
            setFormData(prev => ({
              ...prev,
              location: {
                lat: e.latLng.lat(),
                lng: e.latLng.lng()
              }
            }));
          }
        });
        
        marker.addListener('dragend', () => {
          const position = marker.getPosition();
          if (position) {
            setFormData(prev => ({
              ...prev,
              location: {
                lat: position.lat(),
                lng: position.lng()
              }
            }));
          }
        });
        
        googleMapRef.current = map;
        markerRef.current = marker;
        setMapInitialized(true);
      } catch (err) {
        console.error("Error initializing Google Map:", err);
        setError("Failed to initialize the map. Please try again later.");
      }
    }
  }, [isLoaded, loadError, mapInitialized, formData.location]);
  
  useEffect(() => {
    if (mapInitialized && markerRef.current) {
      markerRef.current.setPosition(formData.location);
      googleMapRef.current?.setCenter(formData.location);
    }
  }, [formData.location, mapInitialized]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          
          setFormData(prev => ({
            ...prev,
            location: newLocation
          }));
        },
        (error) => {
          console.error("Error getting location:", error);
          setError("Could not get your current location. Please select manually on the map.");
        }
      );
    } else {
      setError("Geolocation is not supported by your browser. Please select location manually on the map.");
    }
  };

  if (!loading && !isAuthenticated) {
    navigate("/login");
    return null;
  }

  const handleCategoryGroupChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const groupLabel = e.target.value;
    const group = itemCategories.find(g => g.label === groupLabel) || null;
    setSelectedCategoryGroup(group);
    setFormData(prev => ({
      ...prev,
      categoryGroup: groupLabel,
      itemType: ""
    }));
    setOtherCategory("");
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === "category") {
      setFormData(prev => ({
        ...prev,
        itemType: value
      }));
      
      if (value !== "other") {
        setOtherCategory("");
      }
    } else if (name === "itemType") {
      setFormData(prev => ({
        ...prev,
        kind: value as "lost" | "found"
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleOtherCategoryChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setOtherCategory(value);
    setFormData(prev => ({
      ...prev,
      itemType: "other",
      otherItemType: value || "Other"
    }));
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setUploadedImage(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!currentUser || !currentUser._id) {
      setError("You must be logged in to upload an item");
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const submitData = new FormData();
      
      const itemName = formData.itemType === "other" && otherCategory ? otherCategory : formData.itemType;
      submitData.append('name', itemName);
      submitData.append('description', formData.description);
      submitData.append('category', formData.categoryGroup);
      submitData.append('location', formData.location ? JSON.stringify(formData.location) : '');
      submitData.append('date', formData.date);
      submitData.append('itemType', formData.kind); 
      submitData.append('owner', currentUser._id);
      
      if (uploadedImage) {
        submitData.append('image', uploadedImage);
      }
      
      // Fire and forget - don't await the response
      itemService.addItem(submitData)
        .then(response => {
          console.log("Item upload completed in background:", response);
        })
        .catch(err => {
          console.error("Background item upload error:", err);
        });

      // Navigate immediately after initiating the upload
      if (formData.kind === 'lost') {
        navigate('/lost-items', { state: { refresh: true } });
      } else {
        navigate('/profile');
      }
      
    } catch (err: any) {
      console.error("Error uploading item:", err);
      
      if (err.response?.status === 401) {
        setError("Authentication error: Your session may have expired. Please log in again.");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setError(err.response?.data?.message || "Failed to upload item");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseMatchesModal = () => {
    setShowMatchesModal(false);
    navigate(formData.kind === 'lost' ? '/lost-items' : '/profile');
  };

  if (loadError) {
    return <div>Error loading maps: {loadError.message}</div>;
  }

  if (!isLoaded) {
    return <div>Loading maps...</div>;
  }

  return (
    <div className="container mt-4" style={{ 
      height: 'calc(100vh - 2rem)',
      overflowY: 'auto',
      paddingBottom: '4rem'
    }}>
      <div className="d-flex align-items-center mb-4">
        <button
          className="btn btn-outline-secondary me-3"
          onClick={() => navigate(-1)}
        >
          <FontAwesomeIcon icon={faArrowLeft} /> Back
        </button>
        <h1 className="mb-0">Upload {formData.kind === 'lost' ? 'Lost' : 'Found'} Item</h1>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="row">
          <div className="col-md-6">
            <div className="card shadow-sm mb-4">
              <div className="card-body">
                <h5 className="card-title mb-4">Item Information</h5>
                
                <div className="mb-3">
                  <label htmlFor="itemType" className="form-label">Lost/Found</label>
                  <select
                    id="itemType"
                    name="itemType"
                    className="form-select"
                    value={formData.kind}
                    onChange={handleChange}
                    required
                  >
                    <option value="lost">Lost Item</option>
                    <option value="found">Found Item</option>
                  </select>
                </div>

                <div className="mb-3">
                  <label htmlFor="categoryGroup" className="form-label">
                    <FontAwesomeIcon icon={faTag} className="me-2 text-secondary" />
                    Category Group
                  </label>
                  <select
                    className="form-select"
                    id="categoryGroup"
                    value={selectedCategoryGroup?.label || ""}
                    onChange={handleCategoryGroupChange}
                    required
                  >
                    <option value="">Select a category group</option>
                    {itemCategories.map((group) => (
                      <option key={group.label} value={group.label}>
                        {group.label}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedCategoryGroup && (
                  <div className="mb-3">
                    <label htmlFor="category" className="form-label">Item Type</label>
                    <select
                      className="form-select"
                      id="category"
                      name="category"
                      value={formData.itemType}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Select an item type</option>
                      {selectedCategoryGroup.options.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {formData.itemType === "other" && (
                  <div className="mb-3">
                    <label htmlFor="otherCategory" className="form-label">
                      Specify Item Type
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="otherCategory"
                      value={otherCategory}
                      onChange={handleOtherCategoryChange}
                      placeholder="Please specify the item type"
                      required
                    />
                  </div>
                )}
                
                <div className="mb-3">
                  <label htmlFor="description" className="form-label">Description</label>
                  <textarea
                    className="form-control"
                    id="description"
                    name="description"
                    rows={4}
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Describe the item in detail"
                    required
                  />
                </div>
                
                <div className="mb-3">
                  <label htmlFor="date" className="form-label">
                    <FontAwesomeIcon icon={faCalendarAlt} className="me-2 text-info" />
                    Date
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    id="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">
                    <FontAwesomeIcon icon={faMapMarkerAlt} className="me-2 text-danger" />
                    Location
                  </label>
                  <div className="mb-2">
                    <button
                      type="button"
                      className="btn btn-outline-primary"
                      onClick={handleGetCurrentLocation}
                    >
                      <FontAwesomeIcon icon={faLocationCrosshairs} className="me-2" />
                      Use My Current Location
                    </button>
                  </div>
                  
                  <div 
                    ref={mapContainerRef} 
                    style={mapContainerStyle} 
                    className="border rounded"
                  ></div>
                  
                  {(!isLoaded || loadError) && (
                    <div className="mt-3">
                      <p className="text-muted mb-2">Enter coordinates manually:</p>
                      <div className="input-group mb-3">
                        <span className="input-group-text">Latitude</span>
                        <input 
                          type="number" 
                          className="form-control"
                          value={formData.location.lat}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            location: {
                              ...prev.location,
                              lat: parseFloat(e.target.value) || prev.location.lat
                            }
                          }))}
                          step="0.000001"
                        />
                      </div>
                      <div className="input-group">
                        <span className="input-group-text">Longitude</span>
                        <input 
                          type="number" 
                          className="form-control"
                          value={formData.location.lng}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            location: {
                              ...prev.location,
                              lng: parseFloat(e.target.value) || prev.location.lng
                            }
                          }))}
                          step="0.000001"
                        />
                      </div>
                    </div>
                  )}
                  
                  <small className="form-text text-muted mt-2">
                    {isLoaded && !loadError 
                      ? "Click on the map to set location or drag the marker"
                      : "Enter coordinates manually or use current location"
                    }
                  </small>
                </div>
              </div>
            </div>
          </div>
          
          <div className="col-md-6">
            <div className="card shadow-sm mb-4">
              <div className="card-body">
                <h5 className="card-title mb-4">Item Photo</h5>
                
                <div className="mb-3">
                  <label htmlFor="image" className="form-label">Upload Image</label>
                  <input
                    type="file"
                    className="form-control"
                    id="image"
                    name="image"
                    accept="image/*"
                    onChange={handleImageChange}
                    required
                  />
                  <small className="form-text text-muted">
                    An image helps in identifying the item.
                  </small>
                </div>
                
                {imagePreview ? (
                  <div className="mb-3 text-center">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="img-thumbnail"
                      style={{ maxHeight: "300px" }}
                    />
                  </div>
                ) : (
                  <div className="text-center py-5 border rounded mb-3">
                    <FontAwesomeIcon icon={faCamera} size="3x" className="text-secondary mb-3" />
                    <p className="text-muted">No image uploaded</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="d-grid gap-2 col-md-6 mx-auto mb-4">
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Uploading...
              </span>
            ) : (
              <span>
                <FontAwesomeIcon icon={faUpload} className="me-2" />
                Upload {formData.kind === 'lost' ? 'Lost' : 'Found'} Item
              </span>
            )}
          </button>
        </div>
      </form>

      <MultiMatchesModal
        isOpen={showMatchesModal}
        onClose={handleCloseMatchesModal}
        itemId={uploadedItemId || undefined}
        itemName={uploadedItemName || undefined}
        itemImage={imagePreview || undefined}
        matches={matchResults || []}
      />
    </div>
  );
};

export default ItemUpload; 