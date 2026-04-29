import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

interface Row {
  id: string;
  item_id: string;
  quantity_in_stock: number;
  reorder_level: number;
  last_updated: string;
  menu_item: { item_name: string; category: string } | null;
}

export default function InventoryAdmin() {
  const [rows, setRows] = useState<Row[]>([]);
  const [edits, setEdits] = useState<Record<string, { qty: number; reorder: number }>>({});

  const load = async () => {
    const { data, error } = await supabase
      .from("inventory")
      .select("id,item_id,quantity_in_stock,reorder_level,last_updated,menu_item(item_name,category)")
      .order("last_updated", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data ?? []) as any);
    const e: Record<string, { qty: number; reorder: number }> = {};
    (data ?? []).forEach((r: any) => { e[r.id] = { qty: r.quantity_in_stock, reorder: r.reorder_level }; });
    setEdits(e);
  };
  useEffect(() => { load(); }, []);

  const save = async (r: Row) => {
    const e = edits[r.id];
    if (e.qty < 0 || e.reorder < 0) return toast.error("Values must be ≥ 0");
    const { error } = await supabase.from("inventory")
      .update({ quantity_in_stock: e.qty, reorder_level: e.reorder })
      .eq("id", r.id);
    if (error) return toast.error(error.message);
    // Auto-update availability
    await supabase.from("menu_item")
      .update({ availability_status: e.qty > 0 ? "available" : "out_of_stock" })
      .eq("id", r.item_id);
    toast.success("Updated");
    load();
  };

  return (
    <div className="bg-card border border-border rounded-2xl shadow-soft overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wider">
          <tr>
            <th className="text-left px-5 py-3">Item</th>
            <th className="text-left px-5 py-3 hidden md:table-cell">Category</th>
            <th className="text-left px-5 py-3">Stock</th>
            <th className="text-left px-5 py-3">Reorder at</th>
            <th className="px-5 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => {
            const low = (edits[r.id]?.qty ?? 0) <= r.reorder_level;
            return (
              <tr key={r.id} className="hover:bg-muted/20">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    {low && <AlertTriangle className="h-4 w-4 text-status-pending" />}
                    <span className="font-medium">{r.menu_item?.item_name ?? "—"}</span>
                  </div>
                </td>
                <td className="px-5 py-4 hidden md:table-cell capitalize text-muted-foreground">{r.menu_item?.category}</td>
                <td className="px-5 py-4">
                  <Input
                    type="number"
                    min="0"
                    value={edits[r.id]?.qty ?? 0}
                    onChange={(e) => setEdits({ ...edits, [r.id]: { ...edits[r.id], qty: parseInt(e.target.value) || 0 } })}
                    className="w-24 h-8"
                  />
                </td>
                <td className="px-5 py-4">
                  <Input
                    type="number"
                    min="0"
                    value={edits[r.id]?.reorder ?? 0}
                    onChange={(e) => setEdits({ ...edits, [r.id]: { ...edits[r.id], reorder: parseInt(e.target.value) || 0 } })}
                    className="w-24 h-8"
                  />
                </td>
                <td className="px-5 py-4 text-right">
                  <Button size="sm" onClick={() => save(r)}>Save</Button>
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr><td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">No inventory yet. Add items in the Menu tab.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
