import React, { useState } from "react";
import { GoogleMap, Marker, InfoWindow, useJsApiLoader, OverlayView } from "@react-google-maps/api";
import { useLostItems } from "./hooks/useItems";
import { getItemImageUrl } from "./services/item-service";

const containerStyle = {
  width: "100%",
  height: "600px"
};

const center = {
  lat: 32.0853, // תל אביב
  lng: 34.7818
};

const getLatLng = (location: any) => {
  if (!location) return null;
  if (typeof location === "string") {
    // תומך במבנה 'Lat: 31.6847, Lng: 34.5700'
    const match = location.match(/Lat:\s*([\d.\-]+),\s*Lng:\s*([\d.\-]+)/);
    if (match) {
      return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
    }
    try {
      const parsed = JSON.parse(location);
      if (parsed.lat && parsed.lng) return { lat: parsed.lat, lng: parsed.lng };
    } catch {
      return null;
    }
  }
  if (location.lat && location.lng) return { lat: location.lat, lng: location.lng };
  return null;
};

const LostItemsMap: React.FC = () => {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: "AIzaSyAlx_vvH0P5fepk8bHpzO54syb5heCvJXI"
  });

  const { items, isLoading, error } = useLostItems();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  if (!isLoaded) return <div>Loading Map...</div>;
  if (isLoading) return <div>Loading Items...</div>;
  if (error) return <div>שגיאה בטעינת פריטים: {error}</div>;

  console.log('LostItemsMap - items:', items);

  return (
    <div style={{ direction: "rtl", width: "100%", maxWidth: 900, margin: "0 auto" }}>
      <h2 style={{ textAlign: "center", margin: "20px 0" }}>Lost Items Map</h2>
      <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={13}>
        {items.map((item) => {
          const pos = getLatLng(item.location);
          if (!pos) return null;
          const imageUrl = getItemImageUrl(item.imgURL);
          return (
            <React.Fragment key={item._id}>
              <Marker
                position={pos}
                title={item.name}
                onClick={() => setSelectedItemId(item._id || "")}
              />
              <OverlayView
                position={pos}
                mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
              >
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  transform: 'translateY(-60px)', // מעלה את התמונה מעל הנעיצה
                  pointerEvents: 'auto',
                }}>
                  <img
                    src={imageUrl}
                    alt={item.name}
                    style={{
                      width: 60,
                      height: 60,
                      objectFit: 'contain', // שמירה על פרופורציה אמיתית
                      borderRadius: 12,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                      background: '#fff',
                      border: '2px solid #fff',
                    }}
                  />
                </div>
              </OverlayView>
            </React.Fragment>
          );
        })}
        {items.map((item) => {
          const pos = getLatLng(item.location);
          if (!pos) return null;
          if (selectedItemId !== item._id) return null;
          const imageUrl = getItemImageUrl(item.imgURL);
          return (
            <InfoWindow
              key={item._id}
              position={pos}
              onCloseClick={() => setSelectedItemId(null)}
            >
              <div style={{ textAlign: "center", minWidth: 120 }}>
                <img src={imageUrl} alt={item.name} style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8, marginBottom: 8 }} />
                <div style={{ fontWeight: "bold" }}>{item.name}</div>
                <div style={{ fontSize: 13 }}>{item.description}</div>
                <div style={{ fontSize: 12, color: '#888' }}>{typeof item.location === 'string' ? item.location : ''}</div>
              </div>
            </InfoWindow>
          );
        })}
      </GoogleMap>
    </div>
  );
};

export default LostItemsMap; 