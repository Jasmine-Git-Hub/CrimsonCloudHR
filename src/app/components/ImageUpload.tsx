import React, { useState, useRef } from 'react';
import { Upload, X, Loader2, Camera } from 'lucide-react';
import { storage, db } from '../../config/firebaseSetup';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

interface ImageUploadProps {
  currentImageUrl?: string;
  userId: string;
  onImageUpdate: (newImageUrl: string) => void;
  className?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  currentImageUrl,
  userId,
  onImageUpdate,
  className = ""
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast.error('Image size should be less than 5MB');
      return;
    }

    setIsUploading(true);

    try {
      // Delete existing image if any
      if (currentImageUrl) {
        const oldImageRef = ref(storage, currentImageUrl);
        try {
          await deleteObject(oldImageRef);
        } catch (error) {
          console.log('No existing image to delete');
        }
      }

      // Upload new image
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const storagePath = `profile-images/${userId}/${fileName}`;
      const imageRef = ref(storage, storagePath);
      
      const snapshot = await uploadBytes(imageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      // Update user profile in database
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, { imageUrl: downloadURL });

      onImageUpdate(downloadURL);
      toast.success('Profile picture updated successfully!');
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (uploadError: any) {
      console.error('Upload failed:', uploadError);
      const errorMessage = uploadError?.message || 'Failed to upload image. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!currentImageUrl) return;

    setIsUploading(true);
    
    try {
      const imageRef = ref(storage, currentImageUrl);
      await deleteObject(imageRef);

      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, { imageUrl: null });

      onImageUpdate('');
      toast.success('Profile picture removed');
    } catch (removeError: any) {
      console.error('Failed to remove image:', removeError);
      const errorMessage = removeError?.message || 'Failed to remove image';
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div
        onClick={handleClick}
        className={`
          relative cursor-pointer rounded-xl border-2 border-dashed transition-all duration-200
          border-gray-300 hover:border-[#810100] hover:bg-gray-50
          ${isUploading ? 'pointer-events-none opacity-50' : ''}
        `}
      >
        {currentImageUrl ? (
          <div className="relative">
            <img
              src={currentImageUrl}
              alt="Profile"
              className="w-full h-full object-cover rounded-xl"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClick();
                  }}
                  className="p-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-colors"
                  title="Change image"
                >
                  <Camera className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveImage();
                  }}
                  className="p-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-colors"
                  title="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 px-4">
            {isUploading ? (
              <Loader2 className="w-8 h-8 text-[#810100] animate-spin mb-2" />
            ) : (
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
            )}
            <p className="text-sm text-gray-600 text-center">
              {isUploading ? 'Uploading...' : 'Drop image here or click to browse'}
            </p>
            <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 5MB</p>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
      />
    </div>
  );
};

export default ImageUpload;