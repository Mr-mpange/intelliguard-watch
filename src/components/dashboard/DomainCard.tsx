import { motion } from 'framer-motion';
import { MonitoredDomain } from '@/types/intelliguard';
import { cn } from '@/lib/utils';
import { Globe, Clock, Shield, Bell, BellOff, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface DomainCardProps {
  domain: MonitoredDomain;
  index?: number;
}

const DomainCard = ({ domain, index = 0 }: DomainCardProps) => {
  const statusConfig = {
    online: {
      icon: CheckCircle2,
      class: 'text-cyber-green',
      bg: 'bg-cyber-green/10 border-cyber-green/30',
      label: 'Online',
    },
    offline: {
      icon: XCircle,
      class: 'text-cyber-red',
      bg: 'bg-cyber-red/10 border-cyber-red/30',
      label: 'Offline',
    },
    degraded: {
      icon: AlertTriangle,
      class: 'text-cyber-yellow',
      bg: 'bg-cyber-yellow/10 border-cyber-yellow/30',
      label: 'Degraded',
    },
  };

  const config = statusConfig[domain.status];
  const StatusIcon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="glass-card p-5 transition-all duration-300 hover:scale-[1.02]"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Globe className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h4 className="font-semibold font-mono">{domain.domain}</h4>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn(
                'px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1',
                config.bg
              )}>
                <StatusIcon className={cn('w-3 h-3', config.class)} />
                {config.label}
              </span>
            </div>
          </div>
        </div>
        <button className={cn(
          'p-2 rounded-lg transition-colors',
          domain.notifications ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
        )}>
          {domain.notifications ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="space-y-1">
          <span className="text-muted-foreground">Response Time</span>
          <p className={cn(
            'font-mono font-medium',
            domain.responseTime > 1000 ? 'text-cyber-red' : 
            domain.responseTime > 500 ? 'text-cyber-yellow' : 'text-cyber-green'
          )}>
            {domain.responseTime}ms
          </p>
        </div>
        <div className="space-y-1">
          <span className="text-muted-foreground">Uptime</span>
          <p className={cn(
            'font-mono font-medium',
            domain.uptimePercent >= 99 ? 'text-cyber-green' :
            domain.uptimePercent >= 95 ? 'text-cyber-yellow' : 'text-cyber-red'
          )}>
            {domain.uptimePercent}%
          </p>
        </div>
        <div className="space-y-1">
          <span className="text-muted-foreground">Threats</span>
          <p className={cn(
            'font-mono font-medium',
            domain.threatsDetected > 10 ? 'text-cyber-red' :
            domain.threatsDetected > 0 ? 'text-cyber-yellow' : 'text-cyber-green'
          )}>
            {domain.threatsDetected}
          </p>
        </div>
        <div className="space-y-1">
          <span className="text-muted-foreground">SSL Expiry</span>
          <p className="font-mono font-medium text-foreground">
            {new Date(domain.sslExpiry).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border/50 flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="w-3 h-3" />
        <span>Last check: {formatDistanceToNow(new Date(domain.lastCheck), { addSuffix: true })}</span>
      </div>
    </motion.div>
  );
};

export default DomainCard;
