import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import Breadcrumb from './Breadcrumb';
import { useRealtimeThreats } from '@/hooks/useRealtimeThreats';

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  // Enable realtime threat notifications globally
  useRealtimeThreats();
  return (
    <div className="min-h-screen bg-background flex">
      {/* Background Pattern */}
      <div className="fixed inset-0 bg-grid-pattern opacity-30 pointer-events-none" />
      
      {/* Ambient Glow Effects */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-cyber-blue/10 rounded-full blur-3xl pointer-events-none" />

      <Sidebar />
      
      <main className="flex-1 overflow-y-auto lg:ml-0">
        <div className="container mx-auto p-6 lg:p-8 pt-16 lg:pt-8">
          <Breadcrumb />
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
