import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Mail,
  Send,
  PlusCircle,
  Menu,
  X,
  LogOut,
  Building,
  User as UserIcon,
} from "lucide-react";
import { getUser, removeToken, removeUser } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const user = getUser();

  const handleLogout = () => {
    removeToken();
    removeUser();
    setLocation("/login");
  };

  const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Semua Surat", href: "/surat", icon: Mail },
    { name: "Surat Baru", href: "/surat/baru", icon: PlusCircle },
  ];

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-sidebar border-r border-sidebar-border z-10">
        <div className="flex h-16 shrink-0 items-center px-6 border-b border-sidebar-border">
          <Building className="h-6 w-6 text-primary-foreground mr-3" />
          <span className="text-lg font-bold text-sidebar-foreground tracking-tight">Sistem Persuratan</span>
        </div>
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href || (location.startsWith("/surat") && item.href !== "/" && item.href === "/surat");
            // Highlight surat nav if we are in /surat or /surat/:id, but not /surat/baru if it has its own link
            const isExact = location === item.href;
            
            return (
              <Link key={item.name} href={item.href}>
                <div
                  className={cn(
                    "flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer",
                    isExact
                      ? "bg-primary text-primary-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5 mr-3 shrink-0" />
                  {item.name}
                </div>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center px-3 py-2 text-sm text-sidebar-foreground mb-4">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary-foreground mr-3 shrink-0">
              <UserIcon className="h-4 w-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-medium truncate">{user?.namaLengkap || "User"}</span>
              <span className="text-xs text-sidebar-foreground/60 truncate capitalize">
                {user?.role || "Staff"}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5 mr-3 shrink-0" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Mobile Header & Sidebar */}
      <div className="md:hidden flex flex-col w-full h-full">
        <header className="flex h-16 shrink-0 items-center justify-between px-4 border-b bg-card">
          <div className="flex items-center">
            <Building className="h-6 w-6 text-primary mr-2" />
            <span className="text-lg font-bold text-foreground">Sistem Persuratan</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </header>

        {isMobileMenuOpen && (
          <div className="absolute top-16 left-0 right-0 bottom-0 bg-background z-50 flex flex-col">
            <nav className="flex-1 px-4 py-6 space-y-2">
              {navItems.map((item) => {
                const isExact = location === item.href;
                return (
                  <Link key={item.name} href={item.href}>
                    <div
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center px-4 py-3 rounded-lg text-base font-medium transition-colors",
                        isExact
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <item.icon className="h-5 w-5 mr-4" />
                      {item.name}
                    </div>
                  </Link>
                );
              })}
            </nav>
            <div className="p-4 border-t border-border">
              <div className="flex items-center px-4 py-3 mb-2">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mr-3">
                  <UserIcon className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">{user?.namaLengkap || "User"}</span>
                  <span className="text-sm text-muted-foreground capitalize">{user?.role || "Staff"}</span>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto bg-muted/30">
          <div className="container mx-auto p-4 max-w-5xl">
            {children}
          </div>
        </main>
      </div>

      {/* Desktop Main Content */}
      <main className="hidden md:flex flex-1 flex-col overflow-hidden bg-muted/30">
        <header className="h-16 shrink-0 flex items-center px-8 border-b bg-card">
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            {navItems.find(item => item.href === location)?.name || 
             (location.startsWith("/surat/baru") ? "Surat Baru" :
             location.startsWith("/surat/") ? "Detail Surat" : "Dashboard")}
          </h1>
        </header>
        <div className="flex-1 overflow-y-auto p-8">
          <div className="mx-auto max-w-5xl">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
