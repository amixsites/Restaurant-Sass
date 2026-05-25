import { Edit, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

export type MenuItem = any;

interface FoodCardProps {
  item: MenuItem;
  onEdit: (item: MenuItem) => void;
  onDelete: (id: string) => void;
  onToggleAvailability: (id: string, isAvailable: boolean) => void;
}

export const FoodCard = ({ item, onEdit, onDelete, onToggleAvailability }: FoodCardProps) => {
  return (
    <div className="flex flex-col bg-card rounded-2xl overflow-hidden shadow-sm border">
      {/* Food Image */}
      <div className="relative h-40 w-full bg-muted">
        {item.image_url ? (
          <img 
            src={item.image_url} 
            alt={item.name} 
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-orange-100 text-orange-500 text-opacity-50">
            <span className="text-4xl font-bold opacity-30">No Image</span>
          </div>
        )}
        
        {/* Type Badge (Veg/Non-Veg) over the image top-left */}
        <div className="absolute top-2 left-2">
          {item.type === 'veg' && (
            <Badge className="bg-green-500 hover:bg-green-600 border-none shadow-md">
              VEG
            </Badge>
          )}
          {item.type === 'non-veg' && (
            <Badge className="bg-red-500 hover:bg-red-600 border-none shadow-md">
              NON-VEG
            </Badge>
          )}
        </div>
      </div>

      {/* Food Details */}
      <div className="p-4 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-lg leading-tight line-clamp-2 pr-2">{item.name}</h3>
          {/* Availability Chip */}
          <Badge 
            variant="outline" 
            className={`whitespace-nowrap ${item.is_available ? 'border-green-500 text-green-600' : 'border-muted-foreground text-muted-foreground'}`}
          >
            {item.is_available ? 'Available' : 'Unavailable'}
          </Badge>
        </div>
        
        {item.description && (
          <p className="text-muted-foreground text-sm line-clamp-2 mb-4 flex-grow">
            {item.description}
          </p>
        )}

        {/* Price + Actions Row */}
        <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/50">
          <div className="text-xl font-bold text-primary">
            ₹{item.price}
          </div>
          
          <div className="flex items-center gap-1">
            <div className="flex items-center mr-2">
              <Switch 
                checked={item.is_available || false} 
                onCheckedChange={(checked) => onToggleAvailability(item.id, checked)}
                aria-label="Toggle availability"
              />
            </div>
            <Button variant="ghost" size="icon" onClick={() => onEdit(item)} className="h-9 w-9 rounded-full">
              <Edit className="w-4 h-4 text-muted-foreground" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(item.id)} className="h-9 w-9 rounded-full hover:text-destructive hover:bg-destructive/10 text-muted-foreground">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
