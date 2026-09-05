import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

export const useImageUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { restaurantId } = useAuthStore();

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!file || !restaurantId) return null;

    try {
      setIsUploading(true);
      setUploadProgress(0);

      // Create a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${restaurantId}/${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('menu-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Supabase Storage Error:', error);
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('menu-images')
        .getPublicUrl(data.path);

      setUploadProgress(100);
      return publicUrl;
    } catch (error: any) {
      console.error('Error uploading image:', error);
      // We do not have toast here directly, but we can throw to let caller handle it, 
      // or we can just return null as before but ensure caller knows.
      // The caller just checks if (uploadedUrl). We should probably return null but alert the user if possible.
      // Instead of changing the signature, we return null and let the console show the error clearly.
      alert(`Image upload failed: ${error.message || 'Check storage permissions'}`);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    uploadImage,
    isUploading,
    uploadProgress
  };
};
