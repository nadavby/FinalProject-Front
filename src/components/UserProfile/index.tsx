/* eslint-disable @typescript-eslint/no-explicit-any */
/** @format */

import { FC, useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useUserItems } from "../../hooks/useItems";
import { Item } from "../../services/item-service";
import userService from "../../services/user-service";
import itemService from "../../services/item-service";
import defaultAvatar from "../../assets/avatar.png";
import { Navigate, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faArrowLeft, 
  faImage, 
  faMapMarkerAlt,
  faCalendarAlt,
  faTag
} from "@fortawesome/free-solid-svg-icons";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNotifications } from "../../hooks/useNotifications";

const profileFormSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  userName: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  profileImage: z.optional(z.instanceof(FileList))
});

type ProfileFormData = z.infer<typeof profileFormSchema>;

interface UserData {
  _id?: string;
  email: string;
  userName: string;
  password?: string;
  imgURL?: string;
  accessToken?: string;
  refreshToken?: string;
}

const UserProfile: FC = () => {
  const { currentUser, updateAuthState, isAuthenticated, loading } = useAuth();
  const { fetchMatchNotifications } = useNotifications();
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [localUser, setLocalUser] = useState<UserData | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [tempImageURL, setTempImageUrl] = useState<string | null>(null);
  const navigate = useNavigate();
  
  // Get user items
  const { items, isLoading: itemsLoading, error: itemsError } = 
    useUserItems(currentUser?._id || "");
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      email: "",
      userName: "",
      password: ""
    }
  });

  const watchProfileImage = watch("profileImage");

  useEffect(() => {
    if (currentUser) {
      setLocalUser({ ...currentUser });
      setValue("email", currentUser.email);
      setValue("userName", currentUser.userName || "");
      setValue("password", ""); 
    }
  }, [currentUser, setValue]);

  useEffect(() => {
    if (watchProfileImage && watchProfileImage.length > 0) {
      const file = watchProfileImage[0];
      setSelectedImage(file);
      setTempImageUrl(URL.createObjectURL(file));
      
      return () => {
        if (tempImageURL) URL.revokeObjectURL(tempImageURL);
      };
    }
  }, [watchProfileImage, tempImageURL]);

  useEffect(() => {
    if (items && items.length > 0) {
      fetchMatchNotifications(items);
    }
  }, [items, fetchMatchNotifications]);

  const onSubmit = async (data: ProfileFormData) => {
    if (!localUser || !localUser._id) return;
    
    setIsUploading(true);
    
    try {
      const updatedUserData: Partial<UserData> = {
        email: data.email,
        userName: data.userName
      };
      
      if (data.password && data.password.length >= 8) {
        updatedUserData.password = data.password;
      }
      
      if (selectedImage) {
        const { data: imageData } = await userService.uploadImage(selectedImage);
        updatedUserData.imgURL = imageData.url;
      }
      
      const { request } = userService.updateUser(localUser._id, updatedUserData);
      const response = await request;
      const updatedUser = response.data;
      console.log("User updated:", updatedUser);
      setLocalUser({
        ...localUser,
        ...updatedUserData,
        imgURL: updatedUserData.imgURL || localUser.imgURL
      });
      setSelectedImage(null);
      setTempImageUrl(null);
      setIsEditing(false);
      
      await updateAuthState();
    } catch (error) {
      console.error("Failed to update user details:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancelEdit = () => {
    if (localUser) {
      setValue("email", localUser.email);
      setValue("userName", localUser.userName || "");
      setValue("password", "");
    }
    setSelectedImage(null);
    setTempImageUrl(null);
    setIsEditing(false);
  };

  const handleDeleteAccount = async () => {
    if (!localUser || !localUser._id) return;
    
    if (window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      try {
        const { request } = userService.deleteUser(localUser._id);
        await request;
        window.location.href = "/login";
      } catch (error) {
        console.error("Failed to delete user account:", error);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await userService.logout();
      window.location.href = "/login";
    } catch (error) {
      console.error("Failed to logout:", error);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;

    try {
      const { request } = itemService.deleteItem(itemId);
      await request;
      window.location.reload();
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return "N/A";
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      return dateObj.toLocaleDateString();
    } catch (error) {
      console.error("Error formatting date:", error);
      return "N/A";
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

  if (!loading && !isAuthenticated) return <Navigate to="/login" />;
  if (!localUser) return <div>Loading...</div>;

  const { ref: profileImageRef, ...profileImageRest } = register("profileImage");

  const renderUserItems = (typeParam: 'lost' | 'found') => {
    if (itemsLoading) return <div>Loading posts...</div>;
    if (itemsError) return <div>Error loading posts: {itemsError}</div>;

    console.log('All items before filtering:', items);

    const filtered = items.filter(item => {
      // בדיקה שהפריט שייך למשתמש הנוכחי
      const itemOwner = item.owner || item.userId;
      if (!itemOwner || !currentUser?._id) return false;

      const isCurrentUserItem = String(itemOwner) === String(currentUser._id);
      if (!isCurrentUserItem) return false;

      // בדיקת סוג הפריט (lost/found)
      const itemType = (item.itemType || '').toLowerCase().trim();
      console.log('Item:', item.name, 'Type:', itemType, 'Expected:', typeParam);
      return itemType === typeParam;
    });

    console.log('Filtered items for', typeParam, ':', filtered);

    if (!filtered || filtered.length === 0) {
      return <div>No {typeParam} items found.</div>;
    }

    return (
      <div className="row">
        {filtered.map(item => (
          <div className="col-md-6 col-lg-4 mb-4" key={item._id}>
            <div className="card h-100">
              {item.imgURL && (
                <img src={item.imgURL} alt={item.name} className="card-img-top" style={{maxHeight: 200, objectFit: 'cover'}} />
              )}
              <div className="card-body">
                <h5 className="card-title">{item.name}</h5>
                <p className="card-text">{item.description}</p>
                <p className="card-text"><strong>Category:</strong> {item.category}</p>
                <p className="card-text"><strong>Location:</strong> {item.location}</p>
                <p className="card-text"><strong>Date:</strong> {formatDate(item.date)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="container mt-4">
      <button
        className="btn btn-outline-primary mb-3"
        onClick={() => navigate(-1)}>
        <FontAwesomeIcon icon={faArrowLeft} className="me-2" />
        Back
      </button>
      
      <div className="card p-4">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="row align-items-center text-center text-md-start">
            <div className="col-md-3 text-center position-relative">
              <img
                src={tempImageURL || localUser.imgURL || defaultAvatar}
                alt="Profile"
                className="rounded-circle img-thumbnail"
                style={{ width: "120px", height: "120px", objectFit: "cover" }}
              />
              
              {isEditing && (
                <div className="position-absolute bottom-0 end-0" style={{ marginRight: "30%" }}>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary rounded-circle"
                    onClick={() => document.getElementById("profileImageInput")?.click()}
                  >
                    <FontAwesomeIcon icon={faImage} />
                  </button>
                  <input
                    id="profileImageInput"
                    {...profileImageRest}
                    ref={(e) => {
                      profileImageRef(e);
                    }}
                    type="file"
                    className="d-none"
                    accept="image/jpeg,image/png"
                    disabled={!isEditing}
                  />
                </div>
              )}
              
              {isUploading && <p className="text-primary mt-2">Uploading...</p>}
            </div>
            
            <div className="col-md-9">
              {!isEditing ? (
                <>
                  <p>
                    <strong>Username:</strong> {localUser.userName || "Not set"}
                  </p>
                  <p>
                    <strong>Email:</strong> {localUser.email}
                  </p>
                  <p>
                    <strong>Password:</strong> ********
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="btn btn-primary me-2">
                    Edit Profile
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    className="btn btn-danger">
                    Delete Account
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="btn btn-secondary ms-2">
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <div className="mb-3">
                    <label htmlFor="userName" className="form-label">Username:</label>
                    <input
                      id="userName"
                      {...register("userName")}
                      type="text"
                      className={`form-control ${errors.userName ? "is-invalid" : ""}`}
                    />
                    {errors.userName && (
                      <div className="invalid-feedback">{errors.userName.message}</div>
                    )}
                  </div>
                  
                  <div className="mb-3">
                    <label htmlFor="email" className="form-label">Email:</label>
                    <input
                      id="email"
                      {...register("email")}
                      type="email"
                      className={`form-control ${errors.email ? "is-invalid" : ""}`}
                    />
                    {errors.email && (
                      <div className="invalid-feedback">{errors.email.message}</div>
                    )}
                  </div>
                  
                  <div className="mb-3">
                    <label htmlFor="password" className="form-label">New Password:</label>
                    <input
                      id="password"
                      {...register("password")}
                      type="password"
                      className={`form-control ${errors.password ? "is-invalid" : ""}`}
                      placeholder="Enter new password"
                    />
                    {errors.password && (
                      <div className="invalid-feedback">{errors.password.message}</div>
                    )}
                  </div>
                  
                  <button
                    type="submit"
                    className="btn btn-success me-2"
                    disabled={isUploading}>
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="btn btn-secondary">
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </form>
      </div>
      
      <div className="mt-4">
        <h3>My Lost Items</h3>
        {renderUserItems('lost')}
      </div>
      
      <div className="mt-4">
        <h3>My Found Items</h3>
        {renderUserItems('found')}
      </div>
      
      <div className="my-4 text-center">
        <button 
          className="btn btn-success btn-lg"
          onClick={() => navigate("/upload-item")}
        >
          <FontAwesomeIcon icon={faImage} className="me-2" />
          Upload New Item
        </button>
      </div>
    </div>
  );
};

export default UserProfile;