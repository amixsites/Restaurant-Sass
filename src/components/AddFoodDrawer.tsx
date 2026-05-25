import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose, DrawerDescription } from '@/components/ui/drawer';
import { useImageUpload } from '@/hooks/useImageUpload';
import { Loader2, Upload, X } from 'lucide-react';

export type MenuItem = any;
export type MenuCategory = any;

interface AddFoodDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  categories: MenuCategory[];
  itemToEdit?: MenuItem | null;
  onSave: (item: Partial<MenuItem>) => Promise<void>;
}

export const AddFoodDrawer = ({ isOpen, onOpenChange, categories, itemToEdit, onSave }: AddFoodDrawerProps) => {
  const [formData, setFormData] = useState<Partial<MenuItem>>({
    name: '',
    description: '',
    price: 0,
    type: 'veg',
    is_available: true,
    category_id: '',
    image_url: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { uploadImage, isUploading, uploadProgress } = useImageUpload();

  // Reset form when opening/closing or changing itemToEdit
  useEffect(() => {
    if (isOpen) {
      if (itemToEdit) {
        setFormData({ ...itemToEdit });
      } else {
        setFormData({
          name: '',
          description: '',
          price: 0,
          type: 'veg',
          is_available: true,
          category_id: categories.length > 0 ? categories[0].id : '',
          image_url: ''
        });
      }
      setSelectedFile(null);
    }
  }, [isOpen, itemToEdit, categories]);

  const handleSave = async () => {
    try {
      setIsSubmitting(true);
      
      let finalImageUrl = formData.image_url;
      
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
    } catch (error) {
      console.error('Error saving item:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="px-4 flex flex-col rounded-t-[2rem] max-h-[90vh]">
        <DrawerHeader className="px-0">
          <DrawerTitle className="text-2xl font-bold">
            {itemToEdit ? 'Edit Item' : 'New Item'}
          </DrawerTitle>
          <DrawerDescription className="sr-only">
            Add or edit a food item in the menu
          </DrawerDescription>
        </DrawerHeader>
        
        <div className="flex-1 overflow-y-auto space-y-6 pb-6 pr-2 custom-scrollbar">
          {/* Image Upload Area */}
          <div className="space-y-2">
            <Label>Food Image</Label>
            <div className="border-2 border-dashed border-border rounded-xl h-40 flex flex-col items-center justify-center relative overflow-hidden bg-muted/30">
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
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
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
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                  <span className="text-sm font-medium">{Math.round(uploadProgress)}%</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Food Name</Label>
              <Input 
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Margherita Pizza"
                className="h-12 rounded-xl text-base"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea 
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the item"
                className="resize-none rounded-xl"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Price (₹)</Label>
                <Input 
                  type="number"
                  value={formData.price || ''}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  className="h-12 rounded-xl text-base"
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select 
                  value={formData.category_id || ''} 
                  onValueChange={(val) => setFormData({ ...formData, category_id: val })}
                >
                  <SelectTrigger className="h-12 rounded-xl text-base">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <div className="flex bg-muted p-1 rounded-xl">
                <Button 
                  type="button"
                  variant={formData.type === 'veg' ? 'default' : 'ghost'}
                  className={`flex-1 rounded-lg ${formData.type === 'veg' ? 'bg-green-500 hover:bg-green-600 text-white' : ''}`}
                  onClick={() => setFormData({ ...formData, type: 'veg' })}
                >
                  Veg
                </Button>
                <Button 
                  type="button"
                  variant={formData.type === 'non-veg' ? 'default' : 'ghost'}
                  className={`flex-1 rounded-lg ${formData.type === 'non-veg' ? 'bg-red-500 hover:bg-red-600 text-white' : ''}`}
                  onClick={() => setFormData({ ...formData, type: 'non-veg' })}
                >
                  Non-Veg
                </Button>
                <Button 
                  type="button"
                  variant={formData.type === 'egg' ? 'default' : 'ghost'}
                  className={`flex-1 rounded-lg ${formData.type === 'egg' ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : ''}`}
                  onClick={() => setFormData({ ...formData, type: 'egg' })}
                >
                  Egg
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
              <div className="space-y-0.5">
                <Label>Available for order</Label>
                <p className="text-xs text-muted-foreground">Customers can order this item</p>
              </div>
              <Switch 
                checked={formData.is_available || false}
                onCheckedChange={(c) => setFormData({ ...formData, is_available: c })}
              />
            </div>
          </div>
        </div>

        <DrawerFooter className="px-0 pt-4 border-t">
          <Button 
            size="lg" 
            className="w-full h-14 rounded-xl text-lg font-semibold bg-orange-500 hover:bg-orange-600"
            onClick={handleSave}
            disabled={!formData.name || !formData.price || !formData.category_id || isSubmitting || isUploading}
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
            {itemToEdit ? 'Update Food' : 'Save Food'}
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
