// src/components/App.tsx
/** @format */

import React from "react";
import { Routes, Route } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { NotificationsProvider } from "../hooks/useNotifications";   // ← משם לוקחים את ה-Provider של הקונטקסט
import NotificationProvider from "./NotificationProvider";            // ← משם לוקחים את קומפוננטת ה-UI
import Navigation from "./Navigation";
import { Login } from "./Login";
import { RegistrationForm } from "./RegristrationForm";
import LostItems from "./LostItems";
import ItemUpload from "./ItemUpload";
import ItemDetail from "./ItemDetail";
import MatchConfirmation from "./MatchConfirmation";
import UserProfile from "./UserProfile";
import "../styles/global.css";

const App: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <p>Loading...</p>;
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <NotificationsProvider>
        <NotificationProvider>
          <Navigation />
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <Routes>
              <Route path="/" element={isAuthenticated ? <LostItems /> : <Login />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<RegistrationForm />} />
              <Route path="/lost-items" element={<LostItems />} />
              <Route path="/upload-item" element={<ItemUpload />} />
              <Route path="/item/:itemId" element={<ItemDetail />} />
              <Route
                path="/item/:itemId/match/:matchId"
                element={<MatchConfirmation />}
              />
              <Route path="/profile" element={<UserProfile />} />
            </Routes>
          </div>
        </NotificationProvider>
      </NotificationsProvider>
    </div>
  );
};

export default App;
