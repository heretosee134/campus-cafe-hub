import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { Button } from "@/components/ui/button";
import { ShoppingBag, LogOut, LayoutDashboard, BookOpen } from "lucide-react";

export default function Navbar() {
  const { user, signOut, isStaff, isAdmin } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm transition-colors ${isActive ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between gap-6">
        <Link to="/" className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-accent" />
          <span className="font-display text-xl italic font-medium">Oakhaven Grounds</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <NavLink to="/" end className={linkClass}>Menu</NavLink>
          {user && <NavLink to="/orders" className={linkClass}>My Orders</NavLink>}
          {isStaff && <NavLink to="/staff" className={linkClass}>Kitchen</NavLink>}
          {isAdmin && <NavLink to="/admin" className={linkClass}>Admin</NavLink>}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate("/checkout")} className="relative gap-2">
                <ShoppingBag className="h-4 w-4" />
                <span className="hidden sm:inline">Cart</span>
                {count > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center min-w-[20px] h-5 text-xs font-medium bg-accent text-accent-foreground rounded-full px-1.5 tabular-nums">
                    {count}
                  </span>
                )}
              </Button>
              {(isStaff || isAdmin) && (
                <Button variant="ghost" size="icon" onClick={() => navigate(isAdmin ? "/admin" : "/staff")} aria-label="Dashboard">
                  <LayoutDashboard className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => signOut().then(() => navigate("/"))} aria-label="Sign out">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>Sign in</Button>
              <Button size="sm" onClick={() => navigate("/auth?mode=signup")} className="bg-accent text-accent-foreground hover:bg-accent/90">
                Join
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
