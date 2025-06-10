/** @format */

import { CredentialResponse } from "@react-oauth/google";
import { apiClient, CanceledError } from "./api-client";
import defaultImage from "../assets/avatar.png";
import { jwtDecode } from "jwt-decode";

export { CanceledError };

export interface IUser {
  _id?: string;
  email: string;
  userName: string;
  password?: string;
  imgURL?: string;
  accessToken?: string;
  refreshToken?: string;
  phoneNumber?: string;
}

interface DecodedToken {
  _id: string;
  email: string;
  exp: number;
}

const saveTokens = (accessToken: string, refreshToken: string) => {
  localStorage.setItem("accessToken", accessToken);
  localStorage.setItem("refreshToken", refreshToken);
};

const getAccessToken = () => localStorage.getItem("accessToken");
const getRefreshToken = () => localStorage.getItem("refreshToken");

const clearTokens = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
};

const getCurrentUser = async () => {
  const token = getAccessToken();
  if (!token) return null;

  try {
    const decoded = jwtDecode<DecodedToken>(token);
    const { data } = await apiClient.get<IUser>(`/auth/${decoded._id}`);
    return data;
  } catch (error) {
    console.error("Failed to fetch current user:", error);
    return null;
  }
};

const register = async (user: IUser) => {
  const abortController = new AbortController();
  try {
    const { data } = await apiClient.post<IUser>("/auth/register", user, {
      signal: abortController.signal,
    });

    if (data.accessToken && data.refreshToken) {
      saveTokens(data.accessToken, data.refreshToken);
    }

    return data;
  } catch (error) {
    console.error("Registration failed:", error);
    throw error;
  }
};

const googleSignIn = async (credential: CredentialResponse) => {
  try {
    const { data } = await apiClient.post<IUser>("/auth/google", credential);

    console.log("Google Sign-In response:", data);

    if (data.accessToken && data.refreshToken) {
      saveTokens(data.accessToken, data.refreshToken);
    } else {
      console.warn("No tokens returned from Google Sign-In!");
    }

    return data; 
  } catch (error) {
    console.error("Google Sign-In failed:", error);
    throw error;
  }
};

const uploadImage = async (img: File | null) => {
  const formData = new FormData();
  if (!img) {
    const blob = await fetch(defaultImage).then((res) => res.blob());
    const defaultFile = new File([blob], "default.png", { type: "image/png" });
    formData.append("file", defaultFile);
  } else {
    formData.append("file", img);
  }

  return apiClient.post(
    "/file?file=" + (img?.name || "default.png"),
    formData,
    {
      headers: { "Content-Type": "image/*" },
    }
  );
};

const login = async (email: string, password: string) => {
  const abortController = new AbortController();
  try {
    const { data } = await apiClient.post<IUser>(
      "/auth/login",
      { email, password },
      { 
        headers: { "Content-Type": "application/json" },
        signal: abortController.signal 
      }
    );

    if (data.accessToken && data.refreshToken) {
      saveTokens(data.accessToken, data.refreshToken);
    }
    console.log("Login success:", data);

    return data;
  } catch (error) {
    console.error("Login failed:", error);
    throw error;
  }
};

const logout = async () => {
  try {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return;

    await apiClient.post("/auth/logout", { refreshToken });

    clearTokens();
  } catch (error) {
    console.error("Logout failed:", error);
  }
};

const refresh = async () => {
  const refreshToken = getRefreshToken();
  console.log("Refresh Token Retrieved:", refreshToken);

  if (!refreshToken) {
    console.error("No refresh token found!");
    throw new Error("No refresh token available.");
  }
  const { data } = await apiClient.post("/auth/refresh", {
    refreshToken: refreshToken,
  });
  console.log("New Tokens:", data);
  saveTokens(data.accessToken, data.refreshToken);
  return data;
};

const getUserById = (id: string) => {
  const abortController = new AbortController();
  const request = apiClient.get<IUser>(`/auth/${id}`, {
    signal: abortController.signal,
  });
  return { request, abort: () => abortController.abort() };
};

const getAllUsers = () => {
  const abortController = new AbortController();
  const request = apiClient.get<IUser[]>("/auth", {
    signal: abortController.signal,
  });
  return { request, abort: () => abortController.abort() };
};
const updateUser = (id: string, userData: Partial<IUser>) => {
  const abortController = new AbortController();
  const request = apiClient.put<IUser>(`/auth/${id}`, userData, {
    signal: abortController.signal,
  });
  return { request, abort: () => abortController.abort() };
};

const deleteUser = (id: string) => {
  const abortController = new AbortController();
  const request = apiClient.delete(`/auth/${id}`, {
    signal: abortController.signal,
  });
  return { request, abort: () => abortController.abort() };
};

export default {
  register,
  uploadImage,
  googleSignIn,
  login,
  logout,
  refresh,
  getUserById,
  getAllUsers,
  clearTokens,
  updateUser,
  deleteUser,
  saveTokens,
  getAccessToken,
  getRefreshToken,
  getCurrentUser,
};
