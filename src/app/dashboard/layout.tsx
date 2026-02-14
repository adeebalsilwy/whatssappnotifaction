'use client';

import {
  LineChart,
  Settings,
  BookCopy,
  FlaskConical,
  MessageSquare,
  BarChart3,
  UserCog,
  Activity,
  LayoutDashboard
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar";
import { DashboardHeader } from "./components/DashboardHeader";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const menuItems = [
    {
      title: "لوحة التحكم",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "سجلات الرسائل",
      href: "/dashboard/logs",
      icon: BookCopy,
    },
    {
      title: "إدارة الرسائل",
      href: "/dashboard/messages",
      icon: MessageSquare,
    },
    {
      title: "التقارير والتحليلات",
      href: "/dashboard/reports",
      icon: BarChart3,
    },
    {
      title: "إدارة المستخدمين",
      href: "/dashboard/users",
      icon: UserCog,
    },
    {
      title: "سجلات التدقيق",
      href: "/dashboard/audit",
      icon: Activity,
    },
    {
      title: "الاختبار",
      href: "/dashboard/testing",
      icon: FlaskConical,
    },
    {
      title: "قوالب الرسائل",
      href: "/dashboard/templates",
      icon: MessageSquare,
    },
    {
      title: "الإعدادات",
      href: "/dashboard/settings",
      icon: Settings,
    },
  ];

  return (
    <SidebarProvider>
      <Sidebar side="right" variant="sidebar" collapsible="offcanvas">
        <SidebarHeader className="border-b h-16 flex items-center justify-center">
          <h2 className="text-xl font-bold text-primary">بوابة الواتساب</h2>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>القائمة الرئيسية</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {menuItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.title}
                        className={cn(
                          "transition-all duration-200",
                          isActive ? "bg-primary/10 text-primary font-bold" : "hover:bg-accent"
                        )}
                      >
                        <Link href={item.href} className="flex items-center gap-3">
                          <item.icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-muted-foreground")} />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4 sticky top-0 bg-background z-20">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <div className="h-6 w-px bg-border mx-2 hidden md:block" />
            <DashboardHeader />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
