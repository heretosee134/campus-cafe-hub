import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { Button } from "@/components/ui/button";
import { Plus, Coffee, Cookie, Utensils, Cake } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

type Category = "all" | "drink" | "snack" | "meal" | "dessert";

interface MenuItem {
  id: string;
  item_name: string;
  description: string | null;
  price: number;
  category: string;
  availability_status: string;
}

const categories: { id: Category; label: string; icon: any }[] = [
  { id: "all", label: "All", icon: Utensils },
  { id: "drink", label: "Drinks", icon: Coffee },
  { id: "snack", label: "Snacks", icon: Cookie },
  { id: "meal", label: "Meals", icon: Utensils },
  { id: "dessert", label: "Desserts", icon: Cake },
];

export default function Index() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Category>("all");
  const { user } = useAuth();
  const { add } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Oakhaven Grounds — Campus Café";
    (async () => {
      const { data, error } = await supabase
        .from("menu_item")
        .select("id,item_name,description,price,category,availability_status")
        .order("category");
      if (error) toast.error(error.message);
      setItems((data ?? []) as MenuItem[]);
      setLoading(false);
    })();
  }, []);

  const filtered = filter === "all" ? items : items.filter((i) => i.category === filter);

  const handleAdd = (item: MenuItem) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (item.availability_status !== "available") {
      toast.error("Currently out of stock");
      return;
    }
    add({ id: item.id, name: item.item_name, price: Number(item.price) });
    toast.success(`${item.item_name} added`);
  };

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-12 md:py-16">
      <header className="max-w-2xl mb-12 animate-fade-in">
        <h1 className="font-display text-4xl md:text-5xl font-medium tracking-tight text-balance leading-tight">
          {user ? "Good day. Settle in." : "Brewed for the long study."}<br />
        </h1>
        <p className="text-muted-foreground text-lg mt-4 max-w-[45ch] text-pretty leading-relaxed">
          The reading room is currently quiet. What can we prepare for your session today?
        </p>
      </header>

      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-8 scrollbar-hide -mx-6 px-6 md:mx-0 md:px-0">
        {categories.map((c) => {
          const active = filter === c.id;
          const Icon = c.icon;
          return (
            <button
              key={c.id}
              onClick={() => setFilter(c.id)}
              className={`shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                active
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {c.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-80 bg-muted/40 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">No items in this category yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {filtered.map((item) => (
            <article
              key={item.id}
              className="bg-card rounded-2xl border border-border shadow-soft hover:shadow-elevated transition-all duration-300 group overflow-hidden flex flex-col animate-fade-in"
            >
              <div className="aspect-[4/3] w-full bg-secondary/60 relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-display text-6xl text-accent/20 group-hover:scale-110 transition-transform duration-700">
                    {item.item_name.charAt(0)}
                  </span>
                </div>
                {item.availability_status !== "available" && (
                  <div className="absolute top-3 right-3 bg-background/95 px-2.5 py-1 rounded-full text-xs font-medium text-muted-foreground border border-border">
                    Sold out
                  </div>
                )}
              </div>
              <div className="p-5 md:p-6 flex flex-col flex-grow">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <h3 className="font-display text-xl font-medium tracking-tight">{item.item_name}</h3>
                  <span className="text-xs uppercase tracking-wider text-muted-foreground mt-1.5">{item.category}</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mt-1">{item.description}</p>
                <div className="mt-auto pt-6 flex justify-between items-center">
                  <span className="tabular-nums font-medium text-lg">${Number(item.price).toFixed(2)}</span>
                  <Button
                    size="sm"
                    onClick={() => handleAdd(item)}
                    disabled={item.availability_status !== "available"}
                    className="bg-accent/10 text-accent hover:bg-accent hover:text-accent-foreground gap-1.5"
                    variant="ghost"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add to cart
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
