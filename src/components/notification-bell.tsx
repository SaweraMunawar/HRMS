"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { markAllNotificationsRead, markNotificationRead } from "@/app/(app)/notification-actions";
import { cn } from "@/lib/utils";

type Item = { id: number; message: string; link: string | null; isRead: boolean; createdAt: Date };

/** "2 hours ago" type relative time, bina kisi extra library ke */
function timeAgo(date: Date): string {
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  const units: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, "second"],
    [3600, "minute"],
    [86400, "hour"],
    [604800, "day"],
    [2629800, "week"],
    [31557600, "month"],
  ];

  const fmt = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  let divisor = 1;
  for (const [limit, unit] of units) {
    if (seconds < limit) return fmt.format(-Math.round(seconds / divisor), unit);
    divisor = limit;
  }
  return fmt.format(-Math.round(seconds / 31557600), "year");
}

export function NotificationBell({ items, unreadCount }: { items: Item[]; unreadCount: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  const openItem = (item: Item) => {
    setOpen(false);
    startTransition(async () => {
      if (!item.isRead) await markNotificationRead(item.id);
      if (item.link) router.push(item.link);
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}>
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-sm font-medium">Notifications</p>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => startTransition(async () => { await markAllNotificationsRead(); })}
            >
              <CheckCheck className="size-3.5" />
              Mark all read
            </Button>
          )}
        </div>

        {items.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">You have no notifications.</p>
        ) : (
          <ScrollArea className="max-h-80">
            <ul className="flex flex-col">
              {items.map((item) => (
                <li key={item.id} className="border-b last:border-b-0">
                  <button
                    type="button"
                    onClick={() => openItem(item)}
                    className={cn(
                      "flex w-full flex-col items-start gap-1 px-3 py-2.5 text-left transition-colors hover:bg-accent",
                      !item.isRead && "bg-accent/40",
                    )}
                  >
                    <span className="flex w-full items-start gap-2">
                      {!item.isRead && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-hidden />}
                      <span className={cn("text-sm", item.isRead && "text-muted-foreground")}>{item.message}</span>
                    </span>
                    <span className="pl-4 text-xs text-muted-foreground">{timeAgo(item.createdAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}

        <div className="border-t px-3 py-2">
          <Link href="/leave" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)}>
            Go to my leave
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
