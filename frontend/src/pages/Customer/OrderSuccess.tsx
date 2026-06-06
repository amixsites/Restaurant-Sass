import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, ChefHat } from 'lucide-react';
import { MobileShell } from '@/components/MobileShell';

export const OrderSuccess = () => {
  const navigate = useNavigate();
  const { restaurantId, tableId, restaurantSlug, tableNumber, qrToken } = useParams();

  const handleBackToMenu = () => {
    if (qrToken) {
      navigate(window.location.pathname.startsWith('/order') ? `/order/${qrToken}` : `/menu/${qrToken}`);
    } else if (restaurantSlug && tableNumber) {
      navigate(`/r/${restaurantSlug}/t/${tableNumber}`);
    } else {
      navigate(`/m/${restaurantId}/${tableId}`);
    }
  };

  return (
    <MobileShell>
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 14 }}
          className="size-24 rounded-full bg-gradient-success mx-auto grid place-items-center shadow-glow mb-6 relative"
        >
          <div className="flex items-center justify-center text-white">
            <Check className="size-12" strokeWidth={3.5} />
          </div>
          <div className="absolute -bottom-1 -right-1 size-10 rounded-full bg-card border-2 border-card grid place-items-center shadow-md">
            <ChefHat className="size-5 text-primary" />
          </div>
        </motion.div>
        
        <motion.h2 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-2xl font-extrabold text-foreground"
        >
          Order Sent to Kitchen!
        </motion.h2>
        
        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-sm text-muted-foreground mt-2 max-w-xs"
        >
          Kitchen staff has received your order and started preparing it.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="w-full max-w-xs mt-8 space-y-3"
        >
          <button 
            onClick={handleBackToMenu}
            className="w-full h-12 rounded-2xl bg-gradient-primary text-white font-bold text-sm shadow-glow tap-highlight-none hover:opacity-95 transition-all"
          >
            Back to Menu
          </button>
        </motion.div>
      </div>
    </MobileShell>
  );
};
