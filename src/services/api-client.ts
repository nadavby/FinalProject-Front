/** @format */

import axios, { CanceledError } from "axios";
export { CanceledError };

const getApiUrl = () => {
  const currentUrl = window.location.origin;
  if (currentUrl.includes('localhost')) {
    return 'http://localhost:3000';
  }
  return window.location.origin;
};

export const apiClient = axios.create({
  baseURL: getApiUrl(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `JWT ${token}`;
    } else {
      console.warn("No token found in localStorage");
    }
    return config;
  },
  (error) => {
    console.error("Request interceptor error:", error);
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }
    
    console.log("Response interceptor caught error:", error.response?.status, error.message);
    
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && 
        !originalRequest._retry && 
        !originalRequest.url?.includes('/auth/refresh')) {
      
      originalRequest._retry = true;
      console.log("Attempting token refresh for URL:", originalRequest.url);
      
      try {
        const refreshToken = localStorage.getItem("refreshToken");
        if (!refreshToken) {
          console.error("No refresh token available");
          throw new Error("No refresh token available");
        }
        
        console.log("Using refresh token:", refreshToken.substring(0, 10) + "...");
        console.log("Making refresh token request to " + getApiUrl() + "/auth/refresh");
        
        const response = await axios.post(getApiUrl() + "/auth/refresh", {
          refreshToken,
        }, {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          }
        });
        
        if (response.data.accessToken && response.data.refreshToken) {
          console.log("Refresh successful, got new tokens!");
          console.log("New access token:", response.data.accessToken.substring(0, 10) + "...");
          localStorage.setItem("accessToken", response.data.accessToken);
          localStorage.setItem("refreshToken", response.data.refreshToken);
          originalRequest.headers.Authorization = `JWT ${response.data.accessToken}`;
          console.log("Updated original request headers with new token");
          console.log("Retrying original request to:", originalRequest.url);
          return axios(originalRequest);
        } else {
          console.error("Refresh response did not include tokens:", response.data);
          throw new Error("Token refresh response invalid");
        }
      } catch (refreshError) {
        console.error("Error refreshing token:", refreshError);
        console.log("Token refresh failed - clearing tokens and redirecting to login");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export const getUserNotifications = (userId: string) => {
  return apiClient.get(`/items/notifications/${userId}`);
};

export const markNotificationRead = (notificationId: string) => {
  return apiClient.patch(`/items/notifications/read/${notificationId}`);
};
