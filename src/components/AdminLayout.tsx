import { NavLink, Outlet } from "react-router-dom";
import { BarChart3, ClipboardList, CreditCard, FileText, Gift, LayoutDashboard, LogOut, Plane, Settings, Ticket, UserCog, Users, Wallet } from "lucide-react";
import { ModalStack } from "@/components/ModalStack";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Statistics", icon: BarChart3, end: true },
  { to: "/applications", label: "Applications", icon: ClipboardList },
  { to: "/users", label: "Users", icon: Users },
  { to: "/user-control", label: "User control", icon: UserCog },
  { to: "/payments", label: "Payments", icon: CreditCard },
  { to: "/finance", label: "Finance tracker", icon: Wallet },
  { to: "/audit", label: "Audit log", icon: FileText },
  { to: "/travel-credits", label: "Travel credits", icon: Gift },
  { to: "/tickets", label: "Tickets", icon: Ticket },
  { to: "/routes", label: "Routes", icon: Plane },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AdminLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-hairline bg-surface-elevated">
        <nav className="flex-1 space-y-1 overflow-y-auto p-3 pt-5">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-signal-soft text-ink"
                    : "text-muted-foreground hover:bg-surface hover:text-ink",
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-hairline p-4">
          <div className="rounded-xl bg-surface px-3 py-2.5">
            <p className="truncate text-sm font-medium text-ink">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={() => logout()}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-hairline px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface hover:text-ink"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      <main className="ml-64 min-h-screen flex-1">
        <header className="sticky top-0 z-20 border-b border-hairline bg-background/80 px-8 py-4 backdrop-blur-md">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LayoutDashboard className="h-4 w-4" />
            <span>Biazo operations</span>
          </div>
        </header>
        <div className="px-8 py-8">
          <Outlet />
        </div>
      </main>
      <ModalStack />
    </div>
  );
}
