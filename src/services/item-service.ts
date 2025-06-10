/* eslint-disable @typescript-eslint/no-explicit-any */
/** @format */

import { apiClient, CanceledError } from "./api-client";

export { CanceledError };

export interface Item {
  _id?: string;
  name: string;
  description: string;
  category: string;
  location: string;
  date: string;
  itemType: 'lost' | 'found';
  imgURL?: string;
  owner: string;
  ownerName?: string;
  ownerEmail?: string;
  matchResults?: MatchResult[];
  isResolved?: boolean;
  resolvedWithItemId?: string;
  createdAt?: string;
  updatedAt?: string;
  contactMethod?: string;
  contactDetails?: string;
  message?: string;
  userId?: string;
}

export interface MatchResult {
  _id?: string;
  matchedItemId: string;
  similarity: number;
  itemName: string;
  itemDescription: string;
  itemImgURL?: string;
  ownerName: string;
  ownerContact?: string;
}

export const getItemImageUrl = (url: string | undefined): string => {
  if (!url) return '';
  
  console.log("item-service - Processing image URL:", url);
  
  if (url.startsWith('http')) {
    return url;
  } else if (url.startsWith('/')) {
    return `http://localhost:3000${url}`;
  } else {
    return `http://localhost:3000/uploads/${url}`;
  }
};

const getAllLostItems = () => {
  const abortController = new AbortController();
  const request = apiClient.get<Item[]>("/items?itemType=lost", {
    signal: abortController.signal,
  });
  
  const enhancedRequest = request.then(response => {
    if (response.data && response.data.length > 0) {
      const firstItem = response.data[0];
      if (!Object.prototype.hasOwnProperty.call(firstItem, 'name') && Object.prototype.hasOwnProperty.call(firstItem, 'data')) {
        console.log("Transforming nested item structure...");
        response.data = response.data.map((item: any) => item.data || item);
      }
    }
    return response;
  });
  
  return { 
    request: enhancedRequest, 
    abort: () => abortController.abort() 
  };
};

const getAllFoundItems = () => {
  const abortController = new AbortController();
  const request = apiClient.get<Item[]>("/items/found", {
    signal: abortController.signal,
  });
  
  const enhancedRequest = request.then(response => {
    console.log("Raw found items response:", response.data);
    
    if (response.data && response.data.length > 0) {
      const firstItem = response.data[0];
      if (!Object.prototype.hasOwnProperty.call(firstItem, 'name') && Object.prototype.hasOwnProperty.call(firstItem, 'data')) {
        console.log("Transforming nested found item structure...");
        response.data = response.data.map((item: any) => item.data || item);
      }
    }
    
    return response;
  });
  
  return { 
    request: enhancedRequest, 
    abort: () => abortController.abort() 
  };
};

const getItemById = (id: string) => {
  const abortController = new AbortController();
  const request = apiClient.get<Item>(`/items/${id}`, {
    signal: abortController.signal,
  });
  
  const enhancedRequest = request.then(response => {
    console.log("Raw item response:", response.data);
    
    if (response.data) {
      const item = response.data as any;
      if (!Object.prototype.hasOwnProperty.call(item, 'name') && Object.prototype.hasOwnProperty.call(item, 'data')) {
        console.log("Transforming nested item details structure...");
        response.data = item.data;
      }
    }
    
    return response;
  });
  
  return { 
    request: enhancedRequest, 
    abort: () => abortController.abort() 
  };
};

const getItemsByUser = (userId: string) => {
  const abortController = new AbortController();
  const request = apiClient.get<Item[]>(`/items?userId=${userId}`, {
    signal: abortController.signal,
  });
  
  const enhancedRequest = request.then(response => {    
    if (response.data && response.data.length > 0) {
      const firstItem = response.data[0] as any;
      if (!Object.prototype.hasOwnProperty.call(firstItem, 'name') && Object.prototype.hasOwnProperty.call(firstItem, 'data')) {
        console.log("Transforming nested user items structure...");
        response.data = response.data.map((item: any) => item.data || item);
      }
    }
    
    return response;
  });
  
  return { 
    request: enhancedRequest, 
    abort: () => abortController.abort() 
  };
};

const addItem = async (formData: FormData) => {
  try {
    for (const pair of formData.entries()) {
      if (pair[0] === 'image') {
        const file = pair[1] as File;
        console.log(`${pair[0]}: [File] ${file.name}, type: ${file.type}, size: ${file.size} bytes`);
      } else {
        console.log(`${pair[0]}: ${pair[1]}`);
      }
    }
    
    return apiClient.post('/items', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    });
  } catch (error: any) {
    console.error('Error in addItem:', error);
    
    if (error.response) {
      console.error("Response data:", error.response.data);
      console.error("Response status:", error.response.status);
      console.error("Response headers:", error.response.headers);
    } else if (error.request) {
      console.error("No response received:", error.request);
    } else {
      console.error("Request setup error:", error.message);
    }
    
    throw error;
  }
};

const updateItem = async (id: string, item: Partial<Item>, image?: File, userId?: string) => {
  try {
    const itemWithUser = { ...item, userId };
    if (!image) {
      console.log("No image provided for update - using direct JSON PUT");
      return apiClient.put<Item>(`/items/${id}`, itemWithUser, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
    console.log("Image provided for update - using FormData");
    const formData = new FormData();
    if (item.name) formData.append('name', item.name);
    if (item.description) formData.append('description', item.description);
    if (item.category) formData.append('category', item.category);
    if (item.location) formData.append('location', item.location);
    if (item.date) formData.append('date', item.date);
    if (item.itemType) formData.append('itemType', item.itemType);
    if (userId) formData.append('userId', userId);
    formData.append('itemData', JSON.stringify(itemWithUser));
    formData.append('image', image, image.name);
    return apiClient.put<Item>(`/items/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  } catch (error: any) {
    console.error("Error in updateItem:", error.message);
    if (error.response) {
      console.error("Response data:", error.response.data);
      console.error("Response status:", error.response.status);
      console.error("Response headers:", error.response.headers);
    }
    throw error;
  }
};

const deleteItem = (id: string, userId: string) => {
  const abortController = new AbortController();
  const request = apiClient.delete(`/items/${id}`, {
    data: { userId },
    signal: abortController.signal,
  });
  return { request, abort: () => abortController.abort() };
};

const getMatchResults = (itemId: string) => {
  const abortController = new AbortController();
  const request = apiClient.get<MatchResult[]>(`/items/${itemId}/matches`, {
    signal: abortController.signal,
  });
  return { request, abort: () => abortController.abort() };
};

const resolveItem = async (id: string, data: any, userId: string) => {
  return apiClient.put(`/items/${id}/resolve`, { ...data, userId });
};

export default {
  getAllLostItems,
  getAllFoundItems,
  getItemById,
  getItemsByUser,
  addItem,
  updateItem,
  deleteItem,
  getMatchResults,
  resolveItem,
}; 