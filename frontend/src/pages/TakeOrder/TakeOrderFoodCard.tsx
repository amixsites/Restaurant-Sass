import { motion } from 'framer-motion';
import { CheckCircle2, Dot, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MenuItem } from '@/pages/RestaurantAdmin/MenuManagement';
import { useTakeOrderCart } from '@/store/useTakeOrderCart';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TakeOrderFoodCardProps {
  item: MenuItem;
  onAdd?: () => void;
}

export const TakeOrderFoodCard = ({ item, onAdd }: TakeOrderFoodCardProps) => {
  const addItem = useTakeOrderCart((state) => state.addItem);
  const { toast } = useToast();

  const handleQuickAdd = () => {
    if (!item.is_available) {
      toast({
        title: 'Item Unavailable',
        description: `${item.name} is currently out of stock.`,
        variant: 'destructive',
      });
      return;
    }

    addItem({ id: item.id, name: item.name, price: item.price });
    onAdd?.();
    toast({
      description: `Added ${item.name} to cart.`,
      duration: 1400,
    });
  };

  const getVegNonVegBadge = () => {
    const isVeg = item.type?.toLowerCase() === 'veg';
    const isNonVeg = item.type?.toLowerCase() === 'non-veg';
    const borderColor = isVeg ? 'border-emerald-600' : isNonVeg ? 'border-rose-600' : 'border-amber-600';
    const dotColor = isVeg ? 'bg-emerald-600' : isNonVeg ? 'bg-rose-600' : 'bg-amber-600';

    return (
      <span className={cn('inline-block h-5 w-5 rounded-md border-2 bg-white p-[2px] shadow-sm', borderColor)}>
        <span className={cn('block h-full w-full rounded-full', dotColor)} />
      </span>
    );
  };

  return (
    <motion.article
      layout
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.985 }}
      className={cn(
        'group relative flex min-h-[320px] flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:shadow-xl',
        !item.is_available && 'opacity-60 grayscale-[0.25]'
      )}
    >
      <div className="relative h-40 w-full shrink-0 overflow-hidden bg-slate-100">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-100 via-orange-100 to-rose-100 text-amber-600">
            <Dot className="h-14 w-14" />
          </div>
        )}

        <div className="absolute left-3 top-3 z-10">{getVegNonVegBadge()}</div>

        <div className="absolute right-3 top-3 rounded-lg border border-white/25 bg-white/90 px-2 py-1 text-[10px] font-semibold text-slate-600 shadow">
          {item.is_available ? 'Available' : 'Unavailable'}
        </div>

        <div className="absolute bottom-3 right-3 rounded-xl border border-white/25 bg-black/65 px-3 py-1 text-sm font-black text-white shadow-lg backdrop-blur-sm">
          Rs {item.price}
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-between gap-4 p-4">
        <div className="space-y-2">
          <h3 className="line-clamp-2 text-base font-bold leading-snug text-slate-900 transition-colors group-hover:text-orange-600">
            {item.name}
          </h3>
          <p className="min-h-[36px] line-clamp-2 text-xs leading-relaxed text-slate-500">
            {item.description || 'Chef-prepared item with fresh ingredients.'}
          </p>

          {!item.is_available && (
            <div className="pt-1">
              <Badge variant="destructive" className="rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                Out of stock
              </Badge>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2.5">
          <div>
            <p className="text-[11px] font-medium text-slate-500">Price</p>
            <p className="text-lg font-black text-slate-900">Rs {item.price}</p>
          </div>
          {item.is_available && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
        </div>

        <Button
          className={cn(
            'h-12 w-full rounded-2xl text-sm font-black shadow-sm transition-all active:scale-[0.98]',
            item.is_available
              ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:opacity-95'
              : 'bg-zinc-100 text-zinc-400'
          )}
          style={{ minHeight: 48 }}
          onClick={handleQuickAdd}
          disabled={!item.is_available}
        >
          <Plus className="mr-1.5 h-4 w-4 shrink-0" /> Add to Cart
        </Button>
      </div>
    </motion.article>
  );
};
