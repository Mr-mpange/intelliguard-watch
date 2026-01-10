import { useState } from 'react';
import { motion } from 'framer-motion';
import { Globe, Shield, AlertTriangle, ExternalLink, RefreshCw, Loader2 } from 'lucide-react';
import { enrichThreatIntelligence, EnrichedThreatData } from '@/services/threatIntelligence';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ThreatIntelPanelProps {
  domain?: string;
  ip?: string;
}

const ThreatIntelPanel = ({ domain, ip }: ThreatIntelPanelProps) => {
  const [intelData, setIntelData] = useState<EnrichedThreatData | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleEnrich = async () => {
    if (!domain && !ip) {
      toast.error('Please provide a domain or IP address');
      return;
    }

    setLoading(true);
    try {
      const data = await enrichThreatIntelligence(domain, ip);
      setIntelData(data);
      setHasSearched(true);
      if (data) {
        toast.success('Threat intelligence enriched');
      } else {
        toast.info('No threat data found');
      }
    } catch (error) {
      toast.error('Failed to fetch threat intelligence');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-cyber-red bg-cyber-red/10 border-cyber-red/30';
      case 'high': return 'text-cyber-orange bg-cyber-orange/10 border-cyber-orange/30';
      case 'medium': return 'text-cyber-yellow bg-cyber-yellow/10 border-cyber-yellow/30';
      case 'low': return 'text-cyber-green bg-cyber-green/10 border-cyber-green/30';
      default: return 'text-muted-foreground bg-muted border-border';
    }
  };

  const targetLabel = domain || ip || 'Unknown';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Threat Intel: <span className="font-mono text-primary">{targetLabel}</span></h3>
        </div>
        <button
          onClick={handleEnrich}
          disabled={loading || (!domain && !ip)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors",
            loading 
              ? "bg-muted cursor-not-allowed" 
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Enriching...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Enrich Data
            </>
          )}
        </button>
      </div>

      {!hasSearched && !loading && (
        <div className="text-center py-8 text-muted-foreground">
          <Shield className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>Click "Enrich Data" to fetch threat intelligence</p>
          <p className="text-sm">from AlienVault OTX and AbuseIPDB</p>
        </div>
      )}

      {intelData && (
        <div className="space-y-6">
          {/* Risk Overview */}
          <div className="flex items-center gap-4">
            <div className={cn(
              "px-4 py-2 rounded-lg border font-semibold",
              getRiskColor(intelData.riskLevel)
            )}>
              Risk: {intelData.riskLevel.toUpperCase()}
            </div>
            <div className="text-sm text-muted-foreground">
              Score: <span className="font-mono font-medium">{intelData.threatScore}/100</span>
            </div>
          </div>

          {/* Sources */}
          {intelData.sources && intelData.sources.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                Data Sources
              </h4>
              <div className="flex flex-wrap gap-2">
                {intelData.sources.map((source, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 rounded-full text-sm bg-primary/10 text-primary border border-primary/20"
                  >
                    {source}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Indicators */}
          {intelData.indicators && intelData.indicators.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-cyber-orange" />
                <h4 className="font-medium">Threat Indicators ({intelData.indicators.length})</h4>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-cyber">
                {intelData.indicators.map((indicator, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg bg-muted/30 border border-border"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{indicator.type}</span>
                      <span className={cn(
                        "px-2 py-0.5 rounded text-xs",
                        indicator.severity === 'high' ? 'bg-cyber-red/20 text-cyber-red' :
                        indicator.severity === 'medium' ? 'bg-cyber-yellow/20 text-cyber-yellow' :
                        'bg-muted text-muted-foreground'
                      )}>
                        {indicator.severity}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{indicator.description}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <span>Source: {indicator.source}</span>
                      {indicator.last_seen && (
                        <span>• Last seen: {new Date(indicator.last_seen).toLocaleDateString()}</span>
                      )}
                    </div>
                    {indicator.tags && indicator.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {indicator.tags.slice(0, 5).map((tag, j) => (
                          <span
                            key={j}
                            className="px-2 py-0.5 rounded text-xs bg-muted border border-border"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {intelData.tags && intelData.tags.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium">Associated Tags</h4>
              <div className="flex flex-wrap gap-1">
                {intelData.tags.slice(0, 12).map((tag, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded text-xs bg-muted border border-border"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Last Updated */}
          <div className="text-xs text-muted-foreground text-right">
            Enriched at: {new Date(intelData.enrichedAt).toLocaleString()}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default ThreatIntelPanel;
