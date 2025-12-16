import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { AlertTriangle, Shield, Info, Activity, X } from 'lucide-react';
import { Alert, ThreatSeverity } from '@/types/intelliguard';
import { cn } from '@/lib/utils';

interface AlertItemProps {
  alert: Alert;
  onDismiss?: (id: string) => void;
}

const AlertItem = ({ alert, onDismiss }: AlertItemProps) => {
  const severityConfig: Record<ThreatSeverity, { icon: typeof AlertTriangle; class: string; bg: string }> = {
    critical: { icon: AlertTriangle, class: 'text-cyber-red', bg: 'bg-cyber-red/10 border-cyber-red/30' },
    high: { icon: Shield, class: 'text-cyber-orange', bg: 'bg-cyber-orange/10 border-cyber-orange/30' },
    medium: { icon: Activity, class: 'text-cyber-yellow', bg: 'bg-cyber-yellow/10 border-cyber-yellow/30' },
    low: { icon: Info, class: 'text-cyber-blue', bg: 'bg-cyber-blue/10 border-cyber-blue/30' },
    info: { icon: Info, class: 'text-muted-foreground', bg: 'bg-muted/50 border-border' },
  };

  const config = severityConfig[alert.severity];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={cn(
        'glass-card p-4 border transition-all duration-300 hover:scale-[1.02]',
        config.bg,
        !alert.isRead && 'ring-1 ring-primary/30'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('p-2 rounded-lg', config.bg)}>
          <Icon className={cn('w-5 h-5', config.class)} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-semibold truncate">{alert.title}</h4>
            {!alert.isRead && (
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            )}
          </div>
          
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {alert.message}
          </p>
          
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span className="font-mono">
              {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
            </span>
            {alert.sourceIP && (
              <span className="font-mono bg-muted px-2 py-0.5 rounded">
                {alert.sourceIP}
              </span>
            )}
            {alert.attackType && (
              <span className={cn(
                'px-2 py-0.5 rounded text-xs font-medium',
                `threat-${alert.severity}`
              )}>
                {alert.attackType}
              </span>
            )}
          </div>
        </div>

        {onDismiss && (
          <button 
            onClick={() => onDismiss(alert.id)}
            className="p-1 rounded hover:bg-muted/50 transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default AlertItem;
