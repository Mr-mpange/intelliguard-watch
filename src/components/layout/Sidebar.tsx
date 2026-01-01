import { NavLink as RouterNavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Search, 
  BarChart3, 
  Bell, 
  Globe, 
  Settings,
  Shield,
  Menu,
  X,
  LogOut,
  User,
  ShieldCheck,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Overview' },
  { path: '/analyze', icon: Search, label: 'Analyze Traffic' },
  { path: '/results', icon: BarChart3, label: 'Results' },
  { path: '/threat-intelligence', icon: TrendingUp, label: 'Threat Intel' },
  { path: '/alerts', icon: Bell, label: 'Alerts' },
  { path: '/monitoring', icon: Globe, label: 'Domain Monitor' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

const adminNavItem = { path: '/admin', icon: ShieldCheck, label: 'Admin Dashboard' };

const Sidebar = () => {
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { user, profile, signOut } = useAuth();

  // Check if user is admin
  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .rpc('has_role', { _user_id: user.id, _role: 'admin' });
      
      setIsAdmin(!!data);
    };
    
    checkAdminRole();
  }, [user]);

  const getInitials = () => {
    if (profile?.full_name) {
      return profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return user?.email?.slice(0, 2).toUpperCase() || 'U';
  };

  // Build nav items with admin if applicable
  const allNavItems = isAdmin ? [...navItems, adminNavItem] : navItems;

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-card border border-border lg:hidden"
      >
        {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <motion.aside
        initial={{ x: -280 }}
        animate={{ x: isMobileOpen ? 0 : -280 }}
        className={cn(
          'fixed left-0 top-0 bottom-0 w-[280px] bg-sidebar border-r border-sidebar-border z-50',
          'flex flex-col',
          'lg:translate-x-0 lg:static'
        )}
      >
        {/* Logo */}
        <div className="p-6 border-b border-sidebar-border">
          <RouterNavLink to="/" className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-cyber-blue flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="absolute -inset-1 rounded-xl bg-gradient-to-br from-primary to-cyber-blue opacity-30 blur-md -z-10" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gradient-cyber">IntelliGuard</h1>
              <p className="text-xs text-muted-foreground">Cyber Defense System</p>
            </div>
          </RouterNavLink>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto scrollbar-cyber">
          <ul className="space-y-2">
            {allNavItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <RouterNavLink
                    to={item.path}
                    onClick={() => setIsMobileOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                      'hover:bg-sidebar-accent',
                      isActive && 'bg-primary/10 text-primary border-l-2 border-primary'
                    )}
                  >
                    <item.icon className={cn(
                      'w-5 h-5 transition-colors',
                      isActive ? 'text-primary' : 'text-sidebar-foreground'
                    )} />
                    <span className={cn(
                      'font-medium',
                      isActive ? 'text-primary' : 'text-sidebar-foreground'
                    )}>
                      {item.label}
                    </span>
                    {isActive && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
                      />
                    )}
                  </RouterNavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Profile & Logout */}
        <div className="p-4 border-t border-sidebar-border">
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full">
              <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-sidebar-accent transition-colors cursor-pointer">
                <Avatar className="w-10 h-10 border-2 border-primary/30">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left overflow-hidden">
                  <p className="text-sm font-medium truncate">
                    {profile?.full_name || 'Security Analyst'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.email}
                  </p>
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem 
                className="cursor-pointer"
                onClick={() => window.location.href = '/profile'}
              >
                <User className="w-4 h-4 mr-2" />
                Profile Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={signOut}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* System Status */}
          <div className="mt-4 glass-card p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-cyber-green animate-pulse" />
              <span className="text-sm font-medium text-cyber-green">System Active</span>
            </div>
            <p className="text-xs text-muted-foreground">
              All systems operational
            </p>
          </div>
        </div>
      </motion.aside>
    </>
  );
};

export default Sidebar;
