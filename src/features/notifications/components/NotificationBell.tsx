"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  Calendar,
  Clock,
  CheckSquare,
  Briefcase,
  FileText,
  Info,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotificationStore } from "../store/useNotificationStore";
import { NotificationItem, NotificationType } from "../types";
import { cn } from "@/lib/utils";

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "hace un momento";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `hace ${diffInMinutes} min`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `hace ${diffInHours} ${diffInHours === 1 ? "hora" : "horas"}`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return "ayer";
  if (diffInDays < 30) return `hace ${diffInDays} días`;
  return date.toLocaleDateString("es-DO", { day: "numeric", month: "short" });
}

function getNotificationBadge(type: NotificationType) {
  switch (type) {
    case "audiencia":
      return {
        label: "Audiencia",
        icon: Calendar,
        className: "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200",
      };
    case "plazo":
      return {
        label: "Plazo",
        icon: Clock,
        className: "bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300",
      };
    case "tarea":
      return {
        label: "Tarea",
        icon: CheckSquare,
        className: "bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300",
      };
    case "expediente":
      return {
        label: "Expediente",
        icon: Briefcase,
        className: "bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300",
      };
    case "documento":
      return {
        label: "Documento",
        icon: FileText,
        className: "bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300",
      };
    default:
      return {
        label: "Sistema",
        icon: Info,
        className: "bg-zinc-100 text-zinc-800 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-200",
      };
  }
}

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const { notifications, markAsRead, markAllAsRead, unreadCount } = useNotificationStore();
  const count = unreadCount();

  const handleNotificationClick = (item: NotificationItem) => {
    markAsRead(item.id);
    if (item.link) {
      setOpen(false);
      router.push(item.link);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Abrir notificaciones"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-700 px-1 text-[10px] font-semibold text-white shadow-xs">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 md:w-96 p-0 shadow-lg border-slate-200 dark:border-slate-800"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Notificaciones
            </span>
            {count > 0 && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {count} {count === 1 ? "nueva" : "nuevas"}
              </span>
            )}
          </div>
          {count > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-7 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-2 dark:text-slate-400 dark:hover:text-slate-100"
            >
              <CheckCheck className="mr-1 h-3.5 w-3.5" />
              Marcar todas
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-[360px] divide-y divide-slate-100 dark:divide-slate-800">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Bell className="h-8 w-8 text-slate-300 mb-2" />
              <p className="text-xs text-slate-500 font-medium">No tienes notificaciones pendientes</p>
            </div>
          ) : (
            notifications.map((item) => {
              const badge = getNotificationBadge(item.type);
              const Icon = badge.icon;
              return (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={cn(
                    "flex flex-col gap-1 p-3.5 transition-colors cursor-pointer text-left border-b border-slate-100 dark:border-slate-800 last:border-b-0",
                    !item.read
                      ? "bg-slate-50/80 hover:bg-slate-100/70 dark:bg-slate-900/60 dark:hover:bg-slate-800/80"
                      : "bg-white hover:bg-slate-50/50 dark:bg-slate-950 dark:hover:bg-slate-900/40"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-xs border px-1.5 py-0.5 text-[10px] font-medium tracking-wide",
                          badge.className
                        )}
                      >
                        <Icon className="h-2.5 w-2.5" />
                        {badge.label}
                      </span>
                      {!item.read && (
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
                      )}
                    </div>
                    <span className="text-[11px] text-slate-600 dark:text-slate-500">
                      {formatRelativeTime(item.createdAt)}
                    </span>
                  </div>

                  <p
                    className={cn(
                      "text-xs leading-snug line-clamp-1",
                      !item.read
                        ? "font-semibold text-slate-900 dark:text-slate-100"
                        : "font-normal text-slate-700 dark:text-slate-300"
                    )}
                  >
                    {item.title}
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {item.message}
                  </p>
                </div>
              );
            })
          )}
        </ScrollArea>

        <div className="border-t border-slate-100 p-2 text-center dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setOpen(false);
              router.push("/agenda");
            }}
            className="w-full text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
          >
            Ver toda la agenda y plazos
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
