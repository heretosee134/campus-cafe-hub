import { useNavigate } from "react-router-dom";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export default function Checkout() {
  const { items, setQty, remove, clear, total } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const placeOrder = async () => {
    if (!user) { navigate("/auth"); return; }
    if (items.length === 0) return;
    setBusy(true);
    try {
      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({ user_id: user.id, total_amount: total, order_status: "pending" })
        .select()
        .single();
      if (orderErr) throw orderErr;

      const { error: itemsErr } = await supabase.from("order_item").insert(
        items.map((i) => ({
          order_id: order.id,
          item_id: i.id,
          quantity: i.qty,
          unit_price: i.price,
        }))
      );
      if (itemsErr) throw itemsErr;

      clear();
      toast.success("Order placed. We'll have it ready shortly.");
      navigate("/orders");
    } catch (e: any) {
      toast.error(e.message ?? "Could not place order");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="font-display text-4xl font-medium tracking-tight mb-8">Your cart</h1>

      {items.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground">
          Your cart is empty.
          <div className="mt-4">
            <Button variant="outline" onClick={() => navigate("/")}>Browse menu</Button>
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl shadow-soft p-6 md:p-8">
          <ul className="divide-y divide-border">
            {items.map((i) => (
              <li key={i.id} className="py-5 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="font-display text-lg font-medium">{i.name}</div>
                  <div className="text-sm text-muted-foreground tabular-nums">${i.price.toFixed(2)} each</div>
                </div>
                <div className="flex items-center gap-1.5 bg-muted/50 rounded-full px-1 py-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full" onClick={() => setQty(i.id, i.qty - 1)}>
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="min-w-[2ch] text-center text-sm tabular-nums font-medium">{i.qty}</span>
                  <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full" onClick={() => setQty(i.id, i.qty + 1)}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <div className="w-20 text-right tabular-nums font-medium">${(i.price * i.qty).toFixed(2)}</div>
                <Button size="icon" variant="ghost" onClick={() => remove(i.id)} className="text-muted-foreground">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>

          <div className="mt-6 pt-6 border-t border-border flex items-center justify-between">
            <span className="text-muted-foreground">Total</span>
            <span className="font-display text-2xl font-medium tabular-nums">${total.toFixed(2)}</span>
          </div>

          <Button onClick={placeOrder} disabled={busy} className="w-full mt-6 bg-accent text-accent-foreground hover:bg-accent/90 h-12">
            {busy ? "Placing…" : "Place order"}
          </Button>
        </div>
      )}
    </div>
  );
}
