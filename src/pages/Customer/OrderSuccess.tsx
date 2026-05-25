import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const OrderSuccess = () => {
  const navigate = useNavigate();
  const { restaurantId, tableId } = useParams();

  return (
    <div className="flex flex-col items-center justify-center h-[70vh] text-center space-y-6 px-4">
      <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-4">
        <CheckCircle2 className="w-12 h-12 text-green-600" />
      </div>
      <h2 className="text-3xl font-black tracking-tight">Order Placed!</h2>
      <p className="text-muted-foreground text-lg">
        The kitchen has received your order and is preparing it right now.
      </p>
      
      <div className="pt-8 w-full max-w-sm space-y-4">
        <Button 
          size="lg" 
          className="w-full rounded-full"
          onClick={() => navigate(`/m/${restaurantId}/${tableId}`)}
        >
          Back to Menu
        </Button>
        <Button 
          size="lg" 
          variant="outline"
          className="w-full rounded-full"
        >
          Track Order
        </Button>
      </div>
    </div>
  );
};
