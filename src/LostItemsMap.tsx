import React, { useEffect, useState } from "react";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";

const containerStyle = {
  width: "100%",
  height: "600px"
};

const center = {
  lat: 32.0853, // תל אביב
  lng: 34.7818
};

type LostItem = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
};

// נתוני דמה
const mockItems: LostItem[] = [
  {
    id: "1",
    name: "ארנק שחור",
    latitude: 32.0853,
    longitude: 34.7818
  },
  {
    id: "2",
    name: "מפתחות עם מחזיק אדום",
    latitude: 32.0800,
    longitude: 34.7800
  },
  {
    id: "3",
    name: "תיק גב כחול",
    latitude: 32.0900,
    longitude: 34.7850
  }
];

const LostItemsMap: React.FC = () => {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: "AIzaSyAlx_vvH0P5fepk8bHpzO54syb5heCvJXI"
  });

  const [items, setItems] = useState<LostItem[]>([]);

  useEffect(() => {
    // כאן אפשר להחליף ל-API אמיתי בעתיד
    setItems(mockItems);
  }, []);

  if (!isLoaded) return <div>טוען מפה...</div>;

  return (
    <div style={{ direction: "rtl", width: "100%", maxWidth: 900, margin: "0 auto" }}>
      <h2 style={{ textAlign: "center", margin: "20px 0" }}>Lost Items Map</h2>
      <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={13}>
        {items.map((item) => (
          <Marker
            key={item.id}
            position={{ lat: item.latitude, lng: item.longitude }}
            title={item.name}
          />
        ))}
      </GoogleMap>
    </div>
  );
};

export default LostItemsMap; 