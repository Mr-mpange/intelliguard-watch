import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ThreatPrediction } from '@/types/intelliguard';
import { cn } from '@/lib/utils';
import { Shield, AlertTriangle, Zap, Clock, Server } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ThreatCardProps {
  prediction: ThreatPrediction;
  index?: number;
}

const ThreatCard = ({ prediction, index = 0 }: ThreatCardProps) => {
  const navigate = useNavigate();
  const isNormal = prediction.attackType === 'Normal';
  
  const severityBadgeClass = {
    critical: 'threat-critical',
    high: 'threat-high',
    medium: 'threat-medium',
    low: 'threat-low',
    info: 'threat-info',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      onClick={() => navigate(`/threat/${prediction.id}`)}
      className={cn(
        'glass-card p-5 transition-all duration-300 hover:scale-[1.02] cursor-pointer',
        isNormal ? 'border-cyber-green/20' : 'border-cyber-red/20'
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            'p-2 rounded-lg',
            isNormal ? 'bg-cyber-green/10' : 'bg-cyber-red/10'
          )}>
            {isNormal ? (
              <Shield className="w-5 h-5 text-cyber-green" />
            ) : prediction.isZeroDay ? (
              <Zap className="w-5 h-5 text-cyber-red" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-cyber-red" />
            )}
          </div>
          <div>
            <h4 className="font-semibold">{prediction.attackType}</h4>
            {prediction.isZeroDay && (
              <span className="text-xs text-cyber-red font-medium">Zero-Day Anomaly</span>
            )}
          </div>
        </div>
        <span className={cn(
          'px-3 py-1 rounded-full text-xs font-medium',
          severityBadgeClass[prediction.severity]
        )}>
          {prediction.severity.toUpperCase()}
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Confidence</span>
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${prediction.confidence * 100}%` }}
                transition={{ duration: 0.8, delay: index * 0.05 + 0.2 }}
                className={cn(
                  'h-full rounded-full',
                  isNormal ? 'bg-cyber-green' : 'bg-cyber-red'
                )}
              />
            </div>
            <span className="font-mono text-sm">
              {(prediction.confidence * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        {!isNormal && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Anomaly Score</span>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${prediction.anomalyScore * 100}%` }}
                  transition={{ duration: 0.8, delay: index * 0.05 + 0.3 }}
                  className="h-full rounded-full bg-cyber-purple"
                />
              </div>
              <span className="font-mono text-sm">
                {(prediction.anomalyScore * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-border/50 grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Server className="w-4 h-4" />
            <span className="font-mono truncate">{prediction.sourceIP}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>{formatDistanceToNow(new Date(prediction.timestamp), { addSuffix: true })}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ThreatCard;
