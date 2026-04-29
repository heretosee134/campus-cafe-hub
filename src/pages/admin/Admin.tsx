import { Link, Outlet, useLocation } from "react-router-dom";
import { Utensils, Boxes, Users } from "lucide-react";

const tabs = [
  { to: "/admin/menu", label: "Menu", icon: Utensils },
  { to: "/admin/inventory", label: "Inventory", icon: Boxes },
  { to: "/admin/users", label: "Users", icon: Users },
];

export default function Admin() {
  const { pathname } = useLocation();
  return (
    <div className="max-w-[1200px] mx-auto px-6 py-12">
      <header className="mb-8">
        <h1 className="font-display text-4xl font-medium tracking-tight">Admin dashboard</h1>
        <p className="text-muted-foreground mt-1">Manage menu, inventory, and team access.</p>
      </header>

      <nav className="flex gap-1 border-b border-border mb-8 overflow-x-auto">
        {tabs.map((t) => {
          const active = pathname === t.to || (pathname === "/admin" && t.to === "/admin/menu");
          const Icon = t.icon;
          return (
            <Link
              key={t.to}
              to={t.to}
              className={`shrink-0 inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                active ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </Link>
          );
        })}
      </nav>

      <Outlet />
    </div>
  );
}
