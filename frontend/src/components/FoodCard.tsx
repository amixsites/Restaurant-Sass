import { Edit, Trash2, Leaf, Drumstick } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

export type MenuItem = any;

interface FoodCardProps {
  item: MenuItem;
  onEdit: (item: MenuItem) => void;
  onDelete: (id: string) => void;
  onToggleAvailability: (id: string, isAvailable: boolean) => void;
}

export const FoodCard = ({ item, onEdit, onDelete, onToggleAvailability }: FoodCardProps) => {
  const isVeg = item.type === 'veg';
  const isNonVeg = item.type === 'non-veg';
  const isEgg = item.type === 'egg';

  return (
    <div className={cn(
      "glass rounded-2xl overflow-hidden shadow-card hover-lift flex flex-col justify-between border border-border/40 transition-all",
      !item.is_available && "opacity-75"
    )}>
      {/* Food Image */}
      <div className="relative h-44 w-full bg-accent/30">
        {item.image_url ? (
          <img 
            src={item.image_url} 
            alt={item.name} 
            className="w-full h-full object-cover rounded-t-2xl"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-primary/5 text-primary/50">
            <span className="text-5xl font-black opacity-30 select-none">🍔</span>
          </div>
        )}
        
        {/* Type Badge (Veg/Non-Veg/Egg) over the image top-left */}
        <div className="absolute top-3 left-3">
          {isVeg && (
            <Badge className="bg-success text-white border-none shadow-md flex items-center gap-1 text-[10px] font-bold py-0.5 px-2.5 rounded-full">
              <Leaf className="size-2.5" /> VEG
            </Badge>
          )}
          {isNonVeg && (
            <Badge className="bg-destructive text-white border-none shadow-md flex items-center gap-1 text-[10px] font-bold py-0.5 px-2.5 rounded-full">
              <Drumstick className="size-2.5" /> NON-VEG
            </Badge>
          )}
          {isEgg && (
            <Badge className="bg-warning text-warning-foreground border-none shadow-md flex items-center gap-1 text-[10px] font-bold py-0.5 px-2.5 rounded-full">
              🍳 EGG
            </Badge>
          )}
        </div>

        {/* Availability Badge top-right */}
        <div className="absolute top-3 right-3">
          <Badge className={cn(
            "border-none shadow-md font-bold text-[9px] px-2 py-0.5 rounded-full",
            item.is_available 
              ? "bg-success/90 text-white" 
              : "bg-muted text-muted-foreground"
          )}>
            {item.is_available ? 'In Stock' : 'Out of Stock'}
          </Badge>
        </div>
      </div>

      {/* Food Details */}
      <div className="p-4 flex flex-col flex-grow min-w-0">
        <div>
          <h3 className="font-semibold text-base leading-snug line-clamp-2 text-foreground mb-1">
            {item.name}
          </h3>
          
          {item.description && (
            <p className="text-muted-foreground text-xs line-clamp-2 mb-4 leading-relaxed">
              {item.description}
            </p>
          )}
        </div>

        {/* Price & Action Control Row */}
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/40">
          <div className="text-lg font-bold text-foreground tabular-nums flex items-center">
            ₹{item.price}
          </div>
          
          <div className="flex items-center gap-1">
            {/* Availability Switch */}
            <div className="flex items-center mr-1">
              <Switch 
                checked={item.is_available || false} 
                onCheckedChange={(checked) => onToggleAvailability(item.id, checked)}
                aria-label="Toggle availability"
                className="scale-90"
              />
            </div>
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => onEdit(item)} 
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
            >
              <Edit className="w-4 h-4" />
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => onDelete(item.id)} 
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
