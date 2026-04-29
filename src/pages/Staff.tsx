import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";

interface OrderRow {
  id: string;
  order_date: string;
  total_amount: number;
  order_status: string;
  user_id: string;
  profiles?: { full_name: string } | null;
  order_item: { quantity: number; menu_item: { item_name: string } | null }[];
}

const STATUSES = ["pending", "preparing", "ready", "collected", "cancelled"];

export default function Staff() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [filter, setFilter] = useState<string>("active");

  useEffect(() => {
    document.title = "Kitchen — Oakhaven Grounds";
    const load = async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id,order_date,total_amount,order_status,user_id,order_item(quantity,menu_item(item_name))")
        .order("order_date", { ascending: false });
      if (error) { toast.error(error.message); return; }
      // Fetch profile names separately to avoid relation ambiguity
      const ids = Array.from(new Set((data ?? []).map((o: any) => o.user_id)));
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id,full_name").in("id", ids)
        : { data: [] as any };
      const map = new Map((profs ?? []).map((p: any) => [p.id, p.full_name]));
      setOrders((data ?? []).map((o: any) => ({ ...o, profiles: { full_name: map.get(o.user_id) ?? "—" } })));
    };
    load();
    const ch = supabase
      .channel("orders-staff")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ order_status: status as any }).eq("id", id);
    if (error) toast.error(error.message); else toast.success("Order updated");
  };

  const filtered = filter === "all"
    ? orders
    : filter === "active"
    ? orders.filter((o) => ["pending", "preparing", "ready"].includes(o.order_status))
    : orders.filter((o) => o.order_status === filter);

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-12">
      <div className="flex items-end justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-4xl font-medium tracking-tight">Kitchen queue</h1>
          <p className="text-muted-foreground mt-1">Manage incoming orders and update statuses.</p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active queue</SelectItem>
            <SelectItem value="all">All orders</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground">No orders.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((o) => (
            <div key={o.id} className="bg-card border border-border rounded-2xl shadow-soft p-5 flex flex-col">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">#{o.id.slice(0, 8)}</div>
                  <div className="font-display text-lg font-medium mt-0.5">{o.profiles?.full_name}</div>
                  <div className="text-xs text-muted-foreground">{format(new Date(o.order_date), "p, MMM d")}</div>
                </div>
                <StatusBadge status={o.order_status} />
              </div>
              <ul className="text-sm space-y-1 mb-4 flex-1">
                {o.order_item.map((it, idx) => (
                  <li key={idx} className="text-muted-foreground">
                    <span className="text-foreground tabular-nums">{it.quantity}×</span> {it.menu_item?.item_name ?? "—"}
                  </li>
                ))}
              </ul>
              <div className="flex items-center gap-2 justify-between pt-3 border-t border-border">
                <span className="font-medium tabular-nums">${Number(o.total_amount).toFixed(2)}</span>
                <Select value={o.order_status} onValueChange={(v) => updateStatus(o.id, v)}>
                  <SelectTrigger className="w-36 h-8 text-xs capitalize"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
