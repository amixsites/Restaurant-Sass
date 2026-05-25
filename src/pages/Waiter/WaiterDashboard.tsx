import { useTables } from '@/hooks/api/useTables';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Plus } from 'lucide-react';

export const WaiterDashboard = () => {
  const { data: tables, isLoading } = useTables();

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Tables</h2>
        <Button size="lg" className="text-lg h-12 px-6"><Plus className="w-5 h-5 mr-2"/> New Order</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {tables?.map((table) => {
          let statusColor = "border-green-500 bg-green-50 text-green-700";
          if (table.status === 'occupied') statusColor = "border-red-500 bg-red-50 text-red-700";
          if (table.status === 'reserved') statusColor = "border-yellow-500 bg-yellow-50 text-yellow-700";
          if (table.status === 'billing') statusColor = "border-blue-500 bg-blue-50 text-blue-700";

          return (
            <Card key={table.id} className={`border-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-95 min-h-[140px] flex flex-col justify-between ${statusColor}`}>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xl flex justify-between items-center">
                  T-{table.table_number}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <Badge variant="outline" className={`bg-white/60 text-sm py-1 px-2 ${statusColor}`}>
                  {table.status.toUpperCase()}
                </Badge>
                {table.status === 'occupied' && (
                  <div className="mt-4 text-lg font-bold">
                    ₹ 1,240
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
