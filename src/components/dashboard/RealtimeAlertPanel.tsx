import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Check, AlertTriangle, Shield, Eye, Trash2, Filter, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRealtimeThreats } from '@/hooks/useRealtimeThreats';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const severityConfig = {
  critical: { color: 'bg-destructive text-destructive-foreground', icon: AlertTriangle },
  high: { color: 'bg-cyber-orange text-white', icon: AlertTriangle },
  medium: { color: 'bg-cyber-yellow text-black', icon: Eye },
  low: { color: 'bg-cyber-green text-white', icon: Shield },
};

type SeverityFilter = 'all' | 'critical' | 'high' | 'medium' | 'low';

const RealtimeAlertPanel = () => {
  const { alerts, unreadCount, markAsRead, markAllAsRead, deleteAlert } = useRealtimeThreats();
  const navigate = useNavigate();
  
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Get unique threat types from alerts
  const threatTypes = useMemo(() => {
    const types = new Set(alerts.map(a => a.threat_type));
    return Array.from(types).filter(Boolean);
  }, [alerts]);

  // Filter alerts
  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      // Severity filter
      if (severityFilter !== 'all' && alert.severity !== severityFilter) {
        return false;
      }
      
      // Type filter
      if (typeFilter !== 'all' && alert.threat_type !== typeFilter) {
        return false;
      }
      
      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          alert.title.toLowerCase().includes(query) ||
          alert.description.toLowerCase().includes(query) ||
          alert.source_domain?.toLowerCase().includes(query) ||
          alert.threat_type.toLowerCase().includes(query)
        );
      }
      
      return true;
    });
  }, [alerts, severityFilter, typeFilter, searchQuery]);

  const handleViewDetails = (alertId: string) => {
    // Navigate to threat investigation with the alert data
    navigate(`/threat/${alertId}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          Real-time Alerts
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-2">
              {unreadCount}
            </Badge>
          )}
        </h3>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? 'bg-muted' : ''}
          >
            <Filter className="w-4 h-4 mr-1" />
            Filter
          </Button>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              <Check className="w-4 h-4 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 mb-4 rounded-lg bg-muted/30 border border-border space-y-3">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search alerts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="flex-1 min-w-[140px]">
                  <label className="text-xs text-muted-foreground mb-1 block">Severity</label>
                  <Select value={severityFilter} onValueChange={(v: SeverityFilter) => setSeverityFilter(v)}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Severities</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 min-w-[140px]">
                  <label className="text-xs text-muted-foreground mb-1 block">Threat Type</label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {threatTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {(severityFilter !== 'all' || typeFilter !== 'all' || searchQuery) && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Showing {filteredAlerts.length} of {alerts.length} alerts
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSeverityFilter('all');
                      setTypeFilter('all');
                      setSearchQuery('');
                    }}
                  >
                    <X className="w-3 h-3 mr-1" />
                    Clear filters
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ScrollArea className="h-[320px]">
        <AnimatePresence mode="popLayout">
          {filteredAlerts.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Shield className="w-12 h-12 mx-auto mb-2 opacity-50" />
              {alerts.length === 0 ? (
                <p>No alerts yet. You're secure!</p>
              ) : (
                <p>No alerts match your filters</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAlerts.map((alert) => {
                const config = severityConfig[alert.severity as keyof typeof severityConfig] || severityConfig.low;
                const Icon = config.icon;

                return (
                  <motion.div
                    key={alert.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      alert.is_read
                        ? 'bg-muted/30 border-border/50 hover:bg-muted/50'
                        : 'bg-card border-primary/30 shadow-glow-sm hover:bg-card/80'
                    }`}
                    onClick={() => handleViewDetails(alert.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full ${config.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge className={config.color} variant="outline">
                            {alert.severity.toUpperCase()}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {alert.threat_type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <h4 className="font-medium truncate">{alert.title}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {alert.description}
                        </p>
                        {alert.source_domain && (
                          <p className="text-xs font-mono text-primary mt-1">
                            Domain: {alert.source_domain}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {!alert.is_read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => markAsRead(alert.id)}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => deleteAlert(alert.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </AnimatePresence>
      </ScrollArea>
    </motion.div>
  );
};

export default RealtimeAlertPanel;
