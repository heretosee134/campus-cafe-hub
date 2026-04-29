import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth, AppRole } from "@/hooks/useAuth";

interface UserRow {
  id: string;
  full_name: string;
  email: string;
  phone_number: string | null;
  roles: AppRole[];
}

const ALL_ROLES: AppRole[] = ["student", "staff", "cafe_staff", "admin"];

export default function UsersAdmin() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);

  const load = async () => {
    const { data: profiles, error } = await supabase.from("profiles").select("id,full_name,email,phone_number");
    if (error) return toast.error(error.message);
    const { data: roles } = await supabase.from("user_roles").select("user_id,role");
    const map = new Map<string, AppRole[]>();
    (roles ?? []).forEach((r: any) => {
      const arr = map.get(r.user_id) ?? [];
      arr.push(r.role);
      map.set(r.user_id, arr);
    });
    setUsers((profiles ?? []).map((p: any) => ({ ...p, roles: map.get(p.id) ?? [] })));
  };
  useEffect(() => { load(); }, []);

  const toggleRole = async (uid: string, role: AppRole, has: boolean) => {
    if (uid === me?.id && role === "admin" && has) {
      return toast.error("You cannot remove your own admin role");
    }
    if (has) {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", uid).eq("role", role);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: uid, role });
      if (error) return toast.error(error.message);
    }
    load();
  };

  return (
    <div className="bg-card border border-border rounded-2xl shadow-soft overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wider">
          <tr>
            <th className="text-left px-5 py-3">User</th>
            <th className="text-left px-5 py-3 hidden md:table-cell">Phone</th>
            <th className="text-left px-5 py-3">Roles</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {users.map((u) => (
            <tr key={u.id} className="hover:bg-muted/20">
              <td className="px-5 py-4">
                <div className="font-medium">{u.full_name}</div>
                <div className="text-xs text-muted-foreground">{u.email}</div>
              </td>
              <td className="px-5 py-4 hidden md:table-cell text-muted-foreground">{u.phone_number ?? "—"}</td>
              <td className="px-5 py-4">
                <div className="flex flex-wrap gap-1.5">
                  {ALL_ROLES.map((r) => {
                    const has = u.roles.includes(r);
                    return (
                      <Button
                        key={r}
                        size="sm"
                        variant={has ? "default" : "outline"}
                        onClick={() => toggleRole(u.id, r, has)}
                        className={`h-7 text-xs capitalize ${has ? "bg-accent text-accent-foreground hover:bg-accent/90" : ""}`}
                      >
                        {r.replace("_", " ")}
                      </Button>
                    );
                  })}
                </div>
              </td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr><td colSpan={3} className="px-5 py-12 text-center text-muted-foreground">No users yet.</td></tr>
          )}
        </tbody>
      </table>
      <div className="px-5 py-3 text-xs text-muted-foreground bg-muted/20 border-t border-border">
        Tip: assign yourself the <Badge variant="outline" className="mx-1">admin</Badge> role from the database tools to access this dashboard.
      </div>
    </div>
  );
}
