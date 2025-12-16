import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'success' | 'warning' | 'danger';
  delay?: number;
}

const MetricCard = ({ title, value, icon: Icon, trend, variant = 'default', delay = 0 }: MetricCardProps) => {
  const variantStyles = {
    default: 'border-border/50',
    success: 'border-cyber-green/30',
    warning: 'border-cyber-yellow/30',
    danger: 'border-cyber-red/30',
  };

  const iconVariantStyles = {
    default: 'text-primary bg-primary/10',
    success: 'text-cyber-green bg-cyber-green/10',
    warning: 'text-cyber-yellow bg-cyber-yellow/10',
    danger: 'text-cyber-red bg-cyber-red/10',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={cn('metric-card group', variantStyles[variant])}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <motion.p 
            className="text-3xl font-bold font-mono tracking-tight"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, delay: delay + 0.2 }}
          >
            {value}
          </motion.p>
          {trend && (
            <div className={cn(
              'flex items-center gap-1 text-sm font-medium',
              trend.isPositive ? 'text-cyber-green' : 'text-cyber-red'
            )}>
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}%</span>
              <span className="text-muted-foreground">vs last hour</span>
            </div>
          )}
        </div>
        <div className={cn(
          'p-3 rounded-xl transition-all duration-300 group-hover:scale-110',
          iconVariantStyles[variant]
        )}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </motion.div>
  );
};

export default MetricCard;
