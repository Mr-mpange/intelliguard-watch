import { motion } from 'framer-motion';
import { SystemHealth } from '@/types/intelliguard';
import { cn } from '@/lib/utils';
import { Activity, Cpu, HardDrive, Shield, Clock, Layers } from 'lucide-react';

interface StatusPanelProps {
  health: SystemHealth;
}

const StatusPanel = ({ health }: StatusPanelProps) => {
  const statusColors = {
    healthy: 'text-cyber-green',
    warning: 'text-cyber-yellow',
    critical: 'text-cyber-red',
  };

  const statusBg = {
    healthy: 'bg-cyber-green/10 border-cyber-green/30',
    warning: 'bg-cyber-yellow/10 border-cyber-yellow/30',
    critical: 'bg-cyber-red/10 border-cyber-red/30',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="glass-card p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          System Status
        </h3>
        <span className={cn(
          'px-3 py-1 rounded-full text-sm font-medium border',
          statusBg[health.status]
        )}>
          <span className={cn('inline-flex items-center gap-1.5', statusColors[health.status])}>
            <span className={cn(
              'w-2 h-2 rounded-full animate-pulse',
              health.status === 'healthy' ? 'bg-cyber-green' :
              health.status === 'warning' ? 'bg-cyber-yellow' : 'bg-cyber-red'
            )} />
            {health.status.charAt(0).toUpperCase() + health.status.slice(1)}
          </span>
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Cpu className="w-4 h-4" />
            CPU Usage
          </div>
          <div className="relative">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${health.cpuUsage}%` }}
                transition={{ duration: 1 }}
                className={cn(
                  'h-full rounded-full',
                  health.cpuUsage < 50 ? 'bg-cyber-green' :
                  health.cpuUsage < 80 ? 'bg-cyber-yellow' : 'bg-cyber-red'
                )}
              />
            </div>
            <span className="text-sm font-mono mt-1 block">
              {health.cpuUsage.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <HardDrive className="w-4 h-4" />
            Memory
          </div>
          <div className="relative">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${health.memoryUsage}%` }}
                transition={{ duration: 1, delay: 0.1 }}
                className={cn(
                  'h-full rounded-full',
                  health.memoryUsage < 60 ? 'bg-cyber-green' :
                  health.memoryUsage < 85 ? 'bg-cyber-yellow' : 'bg-cyber-red'
                )}
              />
            </div>
            <span className="text-sm font-mono mt-1 block">
              {health.memoryUsage.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Shield className="w-4 h-4" />
            Uptime
          </div>
          <span className="text-xl font-mono font-bold text-cyber-green">
            {health.uptime}%
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Activity className="w-4 h-4" />
            Packets Analyzed
          </div>
          <span className="text-lg font-mono font-semibold">
            {health.packetsAnalyzed.toLocaleString()}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Clock className="w-4 h-4" />
            Last Scan
          </div>
          <span className="text-sm font-mono">
            {new Date(health.lastScan).toLocaleTimeString()}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Layers className="w-4 h-4" />
            Model Version
          </div>
          <span className="text-sm font-mono bg-primary/10 text-primary px-2 py-1 rounded">
            {health.modelVersion}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default StatusPanel;
