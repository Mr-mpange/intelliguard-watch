import { useEffect, useRef, useState, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Globe2, MapPin, AlertTriangle, Eye, EyeOff, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ThreatLocation {
  id: string;
  country: string;
  city: string;
  lat: number;
  lng: number;
  threatCount: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  attackTypes: string[];
  lastSeen: Date;
}

// Mock data for threat origins
const generateMockThreatLocations = (): ThreatLocation[] => {
  const locations: ThreatLocation[] = [
    { id: '1', country: 'Russia', city: 'Moscow', lat: 55.7558, lng: 37.6173, threatCount: 450, severity: 'critical', attackTypes: ['DDoS', 'Brute Force', 'Malware'], lastSeen: new Date() },
    { id: '2', country: 'China', city: 'Beijing', lat: 39.9042, lng: 116.4074, threatCount: 380, severity: 'critical', attackTypes: ['Port Scan', 'SQL Injection', 'APT'], lastSeen: new Date() },
    { id: '3', country: 'North Korea', city: 'Pyongyang', lat: 39.0392, lng: 125.7625, threatCount: 120, severity: 'high', attackTypes: ['Zero-Day', 'Ransomware'], lastSeen: new Date() },
    { id: '4', country: 'Iran', city: 'Tehran', lat: 35.6892, lng: 51.3890, threatCount: 95, severity: 'high', attackTypes: ['Phishing', 'DDoS'], lastSeen: new Date() },
    { id: '5', country: 'Brazil', city: 'São Paulo', lat: -23.5505, lng: -46.6333, threatCount: 180, severity: 'medium', attackTypes: ['Brute Force', 'Credential Stuffing'], lastSeen: new Date() },
    { id: '6', country: 'Nigeria', city: 'Lagos', lat: 6.5244, lng: 3.3792, threatCount: 85, severity: 'medium', attackTypes: ['Phishing', 'BEC'], lastSeen: new Date() },
    { id: '7', country: 'India', city: 'Mumbai', lat: 19.0760, lng: 72.8777, threatCount: 210, severity: 'medium', attackTypes: ['Brute Force', 'XSS'], lastSeen: new Date() },
    { id: '8', country: 'Vietnam', city: 'Hanoi', lat: 21.0285, lng: 105.8542, threatCount: 65, severity: 'low', attackTypes: ['Port Scan'], lastSeen: new Date() },
    { id: '9', country: 'Romania', city: 'Bucharest', lat: 44.4268, lng: 26.1025, threatCount: 75, severity: 'medium', attackTypes: ['Malware', 'Ransomware'], lastSeen: new Date() },
    { id: '10', country: 'Ukraine', city: 'Kyiv', lat: 50.4501, lng: 30.5234, threatCount: 55, severity: 'low', attackTypes: ['Brute Force'], lastSeen: new Date() },
    { id: '11', country: 'Indonesia', city: 'Jakarta', lat: -6.2088, lng: 106.8456, threatCount: 90, severity: 'medium', attackTypes: ['DDoS', 'Phishing'], lastSeen: new Date() },
    { id: '12', country: 'Turkey', city: 'Istanbul', lat: 41.0082, lng: 28.9784, threatCount: 70, severity: 'low', attackTypes: ['Port Scan', 'Brute Force'], lastSeen: new Date() },
  ];
  return locations;
};

const getSeverityColor = (severity: string): string => {
  switch (severity) {
    case 'critical': return '#ef4444';
    case 'high': return '#f97316';
    case 'medium': return '#eab308';
    case 'low': return '#22c55e';
    default: return '#6b7280';
  }
};

interface ThreatMapProps {
  mapboxToken?: string;
}

export const ThreatMap = ({ mapboxToken: propToken }: ThreatMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  
  const [token, setToken] = useState(propToken || '');
  const [isConfigured, setIsConfigured] = useState(!!propToken);
  const [selectedLocation, setSelectedLocation] = useState<ThreatLocation | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  
  const threatLocations = useMemo(() => generateMockThreatLocations(), []);
  
  const stats = useMemo(() => {
    const total = threatLocations.reduce((sum, loc) => sum + loc.threatCount, 0);
    const critical = threatLocations.filter(l => l.severity === 'critical').reduce((sum, l) => sum + l.threatCount, 0);
    const topCountry = threatLocations.sort((a, b) => b.threatCount - a.threatCount)[0];
    return { total, critical, topCountry };
  }, [threatLocations]);

  const initializeMap = () => {
    if (!mapContainer.current || !token) return;

    mapboxgl.accessToken = token;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      projection: 'globe',
      zoom: 1.5,
      center: [30, 20],
      pitch: 30,
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({ visualizePitch: true }),
      'top-right'
    );

    map.current.scrollZoom.disable();

    map.current.on('style.load', () => {
      map.current?.setFog({
        color: 'rgb(15, 15, 25)',
        'high-color': 'rgb(30, 30, 50)',
        'horizon-blend': 0.1,
      });

      // Add markers
      threatLocations.forEach((location) => {
        const el = document.createElement('div');
        el.className = 'threat-marker';
        el.style.cssText = `
          width: ${Math.min(location.threatCount / 10 + 20, 60)}px;
          height: ${Math.min(location.threatCount / 10 + 20, 60)}px;
          background: radial-gradient(circle, ${getSeverityColor(location.severity)}aa 0%, ${getSeverityColor(location.severity)}44 50%, transparent 70%);
          border-radius: 50%;
          cursor: pointer;
          transition: transform 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        `;
        
        const inner = document.createElement('div');
        inner.style.cssText = `
          width: 12px;
          height: 12px;
          background: ${getSeverityColor(location.severity)};
          border-radius: 50%;
          box-shadow: 0 0 10px ${getSeverityColor(location.severity)};
        `;
        el.appendChild(inner);

        el.addEventListener('mouseenter', () => {
          el.style.transform = 'scale(1.2)';
        });
        el.addEventListener('mouseleave', () => {
          el.style.transform = 'scale(1)';
        });
        el.addEventListener('click', () => {
          setSelectedLocation(location);
          map.current?.flyTo({
            center: [location.lng, location.lat],
            zoom: 4,
            duration: 1500,
          });
        });

        const marker = new mapboxgl.Marker(el)
          .setLngLat([location.lng, location.lat])
          .addTo(map.current!);
        
        markers.current.push(marker);
      });
    });

    // Globe rotation
    const secondsPerRevolution = 180;
    let userInteracting = false;

    const spinGlobe = () => {
      if (!map.current) return;
      const zoom = map.current.getZoom();
      if (!userInteracting && zoom < 3) {
        const center = map.current.getCenter();
        center.lng -= 360 / secondsPerRevolution;
        map.current.easeTo({ center, duration: 1000, easing: (n) => n });
      }
    };

    map.current.on('mousedown', () => { userInteracting = true; });
    map.current.on('mouseup', () => { userInteracting = false; spinGlobe(); });
    map.current.on('touchend', () => { userInteracting = false; spinGlobe(); });
    map.current.on('moveend', spinGlobe);
    spinGlobe();

    setIsConfigured(true);
  };

  useEffect(() => {
    if (isConfigured && token) {
      initializeMap();
    }

    return () => {
      markers.current.forEach(m => m.remove());
      markers.current = [];
      map.current?.remove();
    };
  }, [isConfigured, token]);

  const handleSubmitToken = () => {
    if (token.trim()) {
      setIsConfigured(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Globe2 className="w-6 h-6 text-primary" />
            Geographic Threat Map
          </h2>
          <p className="text-muted-foreground">Global visualization of attack origins</p>
        </div>
        
        {isConfigured && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLabels(!showLabels)}
            >
              {showLabels ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
              {showLabels ? 'Hide Labels' : 'Show Labels'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                map.current?.flyTo({
                  center: [30, 20],
                  zoom: 1.5,
                  pitch: 30,
                  duration: 2000,
                });
                setSelectedLocation(null);
              }}
            >
              <Globe2 className="w-4 h-4 mr-1" />
              Reset View
            </Button>
          </div>
        )}
      </div>

      {/* Stats cards */}
      {isConfigured && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass-card">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{stats.total.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground">Total Threats</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-destructive">{stats.critical.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground">Critical Origin</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{threatLocations.length}</div>
              <p className="text-sm text-muted-foreground">Active Sources</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{stats.topCountry?.country}</div>
              <p className="text-sm text-muted-foreground">Top Origin</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Map or configuration */}
      {!isConfigured ? (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Configure Mapbox
            </CardTitle>
            <CardDescription>
              Enter your Mapbox public token to enable the geographic threat visualization.
              Get your token at <a href="https://mapbox.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">mapbox.com</a>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input
                type="text"
                placeholder="pk.eyJ1..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleSubmitToken} disabled={!token.trim()}>
                Enable Map
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="glass-card overflow-hidden">
          <CardContent className="p-0 relative">
            <div ref={mapContainer} className="w-full h-[500px]" />
            
            {/* Selected location panel */}
            <AnimatePresence>
              {selectedLocation && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="absolute top-4 right-16 w-72 glass-card rounded-lg p-4 shadow-lg"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {selectedLocation.city}, {selectedLocation.country}
                      </h4>
                      <Badge 
                        variant="outline"
                        style={{ borderColor: getSeverityColor(selectedLocation.severity), color: getSeverityColor(selectedLocation.severity) }}
                        className="mt-1"
                      >
                        {selectedLocation.severity.toUpperCase()}
                      </Badge>
                    </div>
                    <button
                      onClick={() => setSelectedLocation(null)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      ×
                    </button>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Threat Count</span>
                      <span className="font-medium text-destructive">{selectedLocation.threatCount}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Attack Types</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedLocation.attackTypes.map((type) => (
                          <Badge key={type} variant="secondary" className="text-xs">
                            {type}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Legend */}
            <div className="absolute bottom-4 left-4 glass-card rounded-lg p-3">
              <p className="text-xs font-medium mb-2">Threat Severity</p>
              <div className="space-y-1">
                {[
                  { label: 'Critical', color: '#ef4444' },
                  { label: 'High', color: '#f97316' },
                  { label: 'Medium', color: '#eab308' },
                  { label: 'Low', color: '#22c55e' },
                ].map(({ label, color }) => (
                  <div key={label} className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Threat origins table */}
      {isConfigured && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Top Threat Origins
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {threatLocations
                .sort((a, b) => b.threatCount - a.threatCount)
                .slice(0, 5)
                .map((loc, i) => (
                  <motion.div
                    key={loc.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => {
                      setSelectedLocation(loc);
                      map.current?.flyTo({
                        center: [loc.lng, loc.lat],
                        zoom: 4,
                        duration: 1500,
                      });
                    }}
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm" style={{ backgroundColor: `${getSeverityColor(loc.severity)}22`, color: getSeverityColor(loc.severity) }}>
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{loc.country}</div>
                      <div className="text-sm text-muted-foreground">{loc.city}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-medium">{loc.threatCount.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">threats</div>
                    </div>
                    <Badge
                      variant="outline"
                      style={{ borderColor: getSeverityColor(loc.severity), color: getSeverityColor(loc.severity) }}
                    >
                      {loc.severity}
                    </Badge>
                  </motion.div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ThreatMap;
