import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface MenuItem {
  id: string;
  item_name: string;
  description: string | null;
  price: number;
  category: "drink" | "snack" | "meal" | "dessert";
  availability_status: "available" | "out_of_stock";
}

const empty: Omit<MenuItem, "id"> = { item_name: "", description: "", price: 0, category: "drink", availability_status: "available" };

export default function MenuAdmin() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [form, setForm] = useState<Omit<MenuItem, "id">>(empty);

  const load = async () => {
    const { data, error } = await supabase.from("menu_item").select("*").order("category");
    if (error) toast.error(error.message);
    setItems((data ?? []) as MenuItem[]);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (m: MenuItem) => {
    setEditing(m);
    setForm({ item_name: m.item_name, description: m.description ?? "", price: Number(m.price), category: m.category, availability_status: m.availability_status });
    setOpen(true);
  };

  const save = async () => {
    if (!form.item_name.trim() || form.price < 0) { toast.error("Invalid input"); return; }
    if (editing) {
      const { error } = await supabase.from("menu_item").update(form).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Updated");
    } else {
      const { data: inserted, error } = await supabase.from("menu_item").insert(form).select().single();
      if (error) return toast.error(error.message);
      // Auto-create inventory row
      await supabase.from("inventory").insert({ item_id: inserted.id, quantity_in_stock: 0, reorder_level: 5 });
      toast.success("Added");
    }
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    const { error } = await supabase.from("menu_item").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2">
              <Plus className="h-4 w-4" /> New item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display text-2xl">{editing ? "Edit item" : "New menu item"}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={form.item_name} onChange={(e) => setForm({ ...form, item_name: e.target.value })} maxLength={100} />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={300} rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Price</Label>
                  <Input type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(v: any) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="drink">Drink</SelectItem>
                      <SelectItem value="snack">Snack</SelectItem>
                      <SelectItem value="meal">Meal</SelectItem>
                      <SelectItem value="dessert">Dessert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Availability</Label>
                <Select value={form.availability_status} onValueChange={(v: any) => setForm({ ...form, availability_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="out_of_stock">Out of stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} className="bg-accent text-accent-foreground hover:bg-accent/90">Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-soft overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-5 py-3">Name</th>
              <th className="text-left px-5 py-3 hidden md:table-cell">Category</th>
              <th className="text-right px-5 py-3">Price</th>
              <th className="text-left px-5 py-3 hidden md:table-cell">Status</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((m) => (
              <tr key={m.id} className="hover:bg-muted/20">
                <td className="px-5 py-4">
                  <div className="font-medium">{m.item_name}</div>
                  <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{m.description}</div>
                </td>
                <td className="px-5 py-4 hidden md:table-cell capitalize text-muted-foreground">{m.category}</td>
                <td className="px-5 py-4 text-right tabular-nums">${Number(m.price).toFixed(2)}</td>
                <td className="px-5 py-4 hidden md:table-cell">
                  <span className={m.availability_status === "available" ? "text-status-ready" : "text-status-cancelled"}>
                    {m.availability_status === "available" ? "Available" : "Out of stock"}
                  </span>
                </td>
                <td className="px-5 py-4 text-right">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(m)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(m.id)} className="text-status-cancelled"><Trash2 className="h-4 w-4" /></Button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">No items yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
