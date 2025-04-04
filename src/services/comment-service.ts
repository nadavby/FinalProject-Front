/** @format */

import { apiClient, CanceledError } from "./api-client";
export { CanceledError };

export interface Comment {
  _id?: string;
  content: string;
  postId: string;
  owner: string;
}

const create = async (comment: Comment) => {
  const token = localStorage.getItem("refreshToken");
  if (!token) {
    console.error("No authentication token found");
    return Promise.reject("Unauthorized: No token found");
  }
  console.log(comment);
  const response = await apiClient.post("/comments", comment, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  return response.data;
};

const updateById = async (id: string, updateData: Partial<Comment>) => {
  const token = localStorage.getItem("refreshToken");
  if (!token) {
    console.error("No authentication token found");
    return Promise.reject("Unauthorized: No token found");
  }
  const response = await apiClient.put(`/comments/${id}`, updateData, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  return response.data;
};

const deleteById = async (id: string) => {
  const token = localStorage.getItem("refreshToken");
  if (!token) {
    console.error("No authentication token found");
    return Promise.reject("Unauthorized: No token found");
  }
  await apiClient.delete(`/comments/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

const getAll = <T>(endpoint: string) => {
  const abortController = new AbortController();
  const request = apiClient.get<T[]>(endpoint, {
    signal: abortController.signal,
  });
  return {
    abort: () => abortController.abort(),
    request,
  };
};

export default { create, updateById, deleteById, getAll };
