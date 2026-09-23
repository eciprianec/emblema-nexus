'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  ChevronLeft, 
  ChevronRight, 
  LayoutDashboard, 
  Calendar,
  Users, 
  Briefcase, 
  Compass,
  FolderOpen,
  Receipt,
  Settings, 
  LogOut,
  ShieldCheck,
  FileCode,
  Building2,
  Globe,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const mainNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Agenda y Plazos', href: '/agenda', icon: Calendar },
  { name: 'Clientes', href: '/clientes', icon: Users },
  { name: 'Expedientes', href: '/expedientes', icon: Briefcase },
  { name: 'Agrimensura', href: '/agrimensura', icon: Compass },
  { name: 'Inmobiliaria', href: '/inmobiliaria', icon: Building2 },
  { name: 'Documentos', href: '/documentos', icon: FolderOpen },
  { name: 'Finanzas', href: '/finanzas', icon: Receipt },
  { name: 'Facturación e-CF', href: '/finanzas/ecf', icon: ShieldCheck },
  { name: 'Portal de Clientes', href: '/portal', icon: Globe },
  { name: 'Configuración', href: '/configuracion', icon: Settings },
];

interface SidebarProps {
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export default function Sidebar({ user }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();

  return (
    <aside
      className={cn(
        "relative flex flex-col bg-slate-950 text-slate-300 transition-all duration-300 z-20",
        isCollapsed ? "w-16" : "w-[280px]"
      )}
    >
      <div className="flex h-16 items-center justify-between px-4 border-b border-slate-800">
        {!isCollapsed ? (
          <div className="flex flex-col truncate">
            <span className="text-lg font-bold text-white tracking-tight">Emblema Nexus</span>
            <span className="text-[10px] uppercase tracking-wider text-slate-500 truncate">
              Gestión Empresarial
            </span>
          </div>
        ) : (
          <span className="text-xl font-bold text-white mx-auto">EN</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-2">
          {mainNavigation.map((item) => {
            const isActive =
              item.href === '/finanzas'
                ? pathname === '/finanzas' || (pathname.startsWith('/finanzas') && !pathname.startsWith('/finanzas/ecf'))
                : item.href === '/configuracion'
                ? pathname === '/configuracion' || (pathname.startsWith('/configuracion') && !pathname.startsWith('/configuracion/ecf'))
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-slate-800 text-white" 
                    : "text-slate-300 hover:bg-slate-900 hover:text-white"
                )}
                title={isCollapsed ? item.name : undefined}
              >
                <item.icon
                  className={cn(
                    "h-5 w-5 flex-shrink-0",
                    isActive ? "text-white" : "text-slate-400 group-hover:text-white",
                    isCollapsed ? "mr-0" : "mr-3"
                  )}
                  aria-hidden="true"
                />
                {!isCollapsed && <span>{item.name}</span>}
              </Link>
            );
          })}

          <div className="pt-2 mt-2 border-t border-slate-850">
            <Link
              href="/configuracion/ecf"
              className={cn(
                "group flex items-center rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                pathname.startsWith('/configuracion/ecf')
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:bg-slate-900 hover:text-white"
              )}
              title={isCollapsed ? 'Configuración e-CF' : undefined}
            >
              <FileCode
                className={cn(
                  "h-4 w-4 flex-shrink-0",
                  pathname.startsWith('/configuracion/ecf') ? "text-emerald-400" : "text-slate-500 group-hover:text-white",
                  isCollapsed ? "mr-0" : "mr-3"
                )}
              />
              {!isCollapsed && <span>Configuración e-CF</span>}
            </Link>

            <Link
              href="/portal/tracking"
              target="_blank"
              className={cn(
                "group flex items-center rounded-md px-3 py-1.5 text-xs font-medium transition-colors text-slate-400 hover:bg-slate-900 hover:text-white"
              )}
              title={isCollapsed ? 'Tracking de Expedientes' : undefined}
            >
              <ExternalLink
                className={cn(
                  "h-4 w-4 flex-shrink-0 text-cyan-400",
                  isCollapsed ? "mr-0" : "mr-3"
                )}
              />
              {!isCollapsed && <span>Tracking de Casos (TRK)</span>}
            </Link>
          </div>
        </nav>
      </div>

      <div className="border-t border-slate-800 p-4">
        <div className={cn("flex items-center", isCollapsed ? "justify-center" : "justify-between")}>
          <div className="flex items-center">
            <Avatar className="h-8 w-8 bg-slate-800">
              <AvatarFallback className="text-xs bg-slate-800 text-slate-200">
                {initials}
              </AvatarFallback>
            </Avatar>
            {!isCollapsed && (
              <div className="ml-3 flex flex-col truncate">
                <span className="text-sm font-medium text-white truncate">
                  {user.firstName} {user.lastName}
                </span>
                <span className="text-xs text-slate-500 truncate">{user.email}</span>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-slate-400 hover:text-white">
              <LogOut className="h-4 w-4" />
              <span className="sr-only">Cerrar sesión</span>
            </Button>
          )}
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-3 top-20 h-6 w-6 rounded-full border border-slate-800 bg-slate-950 text-slate-400 hover:text-white z-50"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </Button>
    </aside>
  );
}
