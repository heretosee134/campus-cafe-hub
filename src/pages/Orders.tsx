import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import StatusBadge from "@/components/StatusBadge";
import { format } from "date-fns";

interface OrderRow {
  id: string;
  order_date: string;
  total_amount: number;
  order_status: string;
  order_item: { quantity: number; unit_price: number; menu_item: { item_name: string } | null }[];
}

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "My Orders — Oakhaven Grounds";
    if (!user) return;
    const load = async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id,order_date,total_amount,order_status,order_item(quantity,unit_price,menu_item(item_name))")
        .eq("user_id", user.id)
        .order("order_date", { ascending: false });
      if (!error) setOrders((data ?? []) as any);
      setLoading(false);
    };
    load();
    const ch = supabase
      .channel("orders-user")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="font-display text-4xl font-medium tracking-tight mb-8">My orders</h1>

      {loading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : orders.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground">
          You haven't placed any orders yet.
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <div key={o.id} className="bg-card border border-border rounded-2xl shadow-soft p-6 animate-fade-in">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Order #{o.id.slice(0, 8)}</div>
                  <div className="text-sm text-muted-foreground mt-1">{format(new Date(o.order_date), "PPp")}</div>
                </div>
                <StatusBadge status={o.order_status} />
              </div>
              <ul className="text-sm space-y-1 mb-4">
                {o.order_item.map((it, idx) => (
                  <li key={idx} className="flex justify-between text-muted-foreground">
                    <span><span className="text-foreground tabular-nums">{it.quantity}×</span> {it.menu_item?.item_name ?? "—"}</span>
                    <span className="tabular-nums">${(Number(it.unit_price) * it.quantity).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex justify-between pt-3 border-t border-border">
                <span className="text-muted-foreground text-sm">Total</span>
                <span className="font-medium tabular-nums">${Number(o.total_amount).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
