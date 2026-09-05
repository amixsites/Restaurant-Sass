import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose, DrawerDescription } from '@/components/ui/drawer';
import { useImageUpload } from '@/hooks/useImageUpload';
import { Loader2, Upload, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export type PartialCategory = {
  id?: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  sort_order?: number;
  is_active?: boolean;
};

interface AddCategoryDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  categoryToEdit?: PartialCategory | null;
  onSave: (category: PartialCategory) => Promise<void>;
}

export const AddCategoryDrawer = ({ isOpen, onOpenChange, categoryToEdit, onSave }: AddCategoryDrawerProps) => {
  const [formData, setFormData] = useState<PartialCategory>({
    name: '',
    description: '',
    image_url: '',
    sort_order: 0,
    is_active: true,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { uploadImage, isUploading, uploadProgress } = useImageUpload();
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      if (categoryToEdit) {
        setFormData({
          id: categoryToEdit.id,
          name: categoryToEdit.name || '',
          description: categoryToEdit.description || '',
          image_url: categoryToEdit.image_url || '',
          sort_order: categoryToEdit.sort_order || 0,
          is_active: categoryToEdit.is_active ?? true,
        });
      } else {
        setFormData({
          name: '',
          description: '',
          image_url: '',
          sort_order: 0,
          is_active: true,
        });
      }
      setSelectedFile(null);
    }
  }, [isOpen, categoryToEdit]);

  const handleSave = async () => {
    try {
      setIsSubmitting(true);
      
      let finalImageUrl = formData.image_url;
      
      // Image is optional. Only upload if user selected a file.
      if (selectedFile) {
        const uploadedUrl = await uploadImage(selectedFile);
        if (uploadedUrl) {
          finalImageUrl = uploadedUrl;
        }
      }
      
      await onSave({
        ...formData,
        image_url: finalImageUrl
      });
      
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving category:', error);
      toast({
        title: 'Failed To Create Category',
        description: error.message || 'Please try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="px-4 flex flex-col rounded-t-[2rem] max-h-[92dvh]">
        <DrawerHeader className="px-0">
          <DrawerTitle className="text-2xl font-bold">
            {categoryToEdit ? 'Edit Category' : 'New Category'}
          </DrawerTitle>
          <DrawerDescription className="sr-only">
            Add or edit a menu category
          </DrawerDescription>
        </DrawerHeader>
        
        <div className="flex-1 overflow-y-auto space-y-6 pb-6 pr-2 custom-scrollbar">
          {/* Optional Image Upload */}
          <div className="space-y-2">
            <Label>Category Image (Optional)</Label>
            <div className="border-2 border-dashed border-border rounded-xl h-32 flex flex-col items-center justify-center relative overflow-hidden bg-muted/30">
              {formData.image_url || selectedFile ? (
                <>
                  <img 
                    src={selectedFile ? URL.createObjectURL(selectedFile) : formData.image_url || ''} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                  />
                  <Button 
                    size="icon" 
                    variant="destructive" 
                    className="absolute top-2 right-2 rounded-full h-8 w-8"
                    onClick={() => {
                      setFormData({ ...formData, image_url: '' });
                      setSelectedFile(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="h-6 w-6 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground font-medium">Tap to upload image</p>
                  </div>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedFile(e.target.files[0]);
                      }
                    }}
                  />
                </label>
              )}
              {isUploading && (
                <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary mb-2" />
                  <span className="text-sm font-medium">{Math.round(uploadProgress)}%</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Category Name *</Label>
              <Input 
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Desserts"
                className="h-12 rounded-xl text-base"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Textarea 
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the category"
                className="resize-none rounded-xl"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Sort Order (Optional)</Label>
              <Input 
                type="number"
                value={formData.sort_order || 0}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                className="h-12 rounded-xl text-base"
              />
              <p className="text-xs text-muted-foreground">Lower numbers appear first</p>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
              <div className="space-y-0.5">
                <Label>Category Active</Label>
                <p className="text-xs text-muted-foreground">Inactive categories hide their foods</p>
              </div>
              <Switch 
                checked={formData.is_active ?? true}
                onCheckedChange={(c) => setFormData({ ...formData, is_active: c })}
              />
            </div>
          </div>
        </div>

        <DrawerFooter className="px-0 pt-4 border-t">
          <Button 
            size="lg" 
            className="w-full h-14 rounded-xl text-lg font-semibold bg-orange-500 hover:bg-orange-600"
            onClick={handleSave}
            disabled={!formData.name.trim() || isSubmitting || isUploading}
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
            {categoryToEdit ? 'Update Category' : 'Save Category'}
          </Button>
          <DrawerClose asChild>
            <Button variant="outline" size="lg" className="w-full h-14 rounded-xl">
              Cancel
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
