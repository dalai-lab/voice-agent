"use client";

import React, { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useOrgConfig } from "@/context/OrgConfigContext";
import { useTalkarCustomer } from "@/context/TalkarCustomerContext";
import { formatDistanceToNow } from "date-fns";

type Notification = {
  id: number;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  created_at: string;
};

export function NotificationBell() {
  const { orgContext } = useOrgConfig();
  const dograhOrgId = orgContext?.organization_id;
  const { isTalkarCustomer, isAdminBypass } = useTalkarCustomer();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!dograhOrgId || (!isTalkarCustomer && !isAdminBypass)) return;

    const fetchNotifications = async () => {
      try {
        const res = await fetch(`/api/talkar/notifications?dograh_org_id=${dograhOrgId}`);
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications || []);
          setUnreadCount(data.unread_count || 0);
        }
      } catch (err) {
        console.error("Failed to fetch notifications", err);
      }
    };

    fetchNotifications();
    
    // Poll every 1 minute
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [dograhOrgId, isTalkarCustomer, isAdminBypass]);

  // Don't render for non-Talkar users at all
  if (!isTalkarCustomer && !isAdminBypass) return null;

  const markAsRead = async (id: number) => {
    try {
      await fetch(`/api/talkar/notifications/${id}/read?dograh_org_id=${dograhOrgId}`, {
        method: "PATCH",
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch(`/api/talkar/notifications/read-all?dograh_org_id=${dograhOrgId}`, {
        method: "POST",
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all as read", err);
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case "warning":
        return "text-amber-500 bg-amber-500/10";
      case "billing":
        return "text-emerald-500 bg-emerald-500/10";
      case "support":
        return "text-blue-500 bg-blue-500/10";
      default:
        return "text-indigo-500 bg-indigo-500/10";
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative h-8 w-8 rounded-lg border-border bg-sidebar-accent/50 hover:bg-sidebar-accent text-sidebar-foreground"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-background">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0 sm:w-96 shadow-xl border-border/50">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50/50 border-b border-border/50">
          <DropdownMenuLabel className="p-0 font-semibold text-sm">Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-auto p-0 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-transparent font-medium"
            >
              Mark all as read
            </Button>
          )}
        </div>
        <div className="max-h-[60vh] overflow-y-auto no-scrollbar">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center px-4">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <Bell className="h-5 w-5 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-900">No notifications</p>
              <p className="text-xs text-slate-500 mt-1">You&apos;re all caught up!</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`flex flex-col gap-1 px-4 py-3 border-b border-border/50 last:border-0 transition-colors ${
                    !notif.is_read ? "bg-indigo-50/30" : "hover:bg-slate-50/50"
                  }`}
                  onClick={() => !notif.is_read && markAsRead(notif.id)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm ${!notif.is_read ? "font-semibold text-slate-900" : "font-medium text-slate-700"}`}>
                      {notif.title}
                    </p>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap shrink-0 mt-0.5">
                      {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className={`text-xs ${!notif.is_read ? "text-slate-700" : "text-slate-500"} line-clamp-2`}>
                    {notif.body}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
