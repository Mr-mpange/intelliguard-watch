import DashboardLayout from '@/components/layout/DashboardLayout';
import { ThreatTimeline } from '@/components/analytics/ThreatTimeline';
import { DomainComparison } from '@/components/analytics/DomainComparison';
import { ThreatMap } from '@/components/analytics/ThreatMap';
import { ExportAnalytics } from '@/components/analytics/ExportAnalytics';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, GitCompare, BarChart3, Globe2, Download } from 'lucide-react';

const Analytics = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <BarChart3 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Security Analytics</h1>
              <p className="text-muted-foreground">
                Deep-dive into threat patterns, geographic origins, and domain security comparisons
              </p>
            </div>
          </div>
        </div>
        
        {/* Tabs for different analytics views */}
        <Tabs defaultValue="timeline" className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="timeline" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Timeline</span>
            </TabsTrigger>
            <TabsTrigger value="map" className="flex items-center gap-2">
              <Globe2 className="w-4 h-4" />
              <span className="hidden sm:inline">Threat Map</span>
            </TabsTrigger>
            <TabsTrigger value="comparison" className="flex items-center gap-2">
              <GitCompare className="w-4 h-4" />
              <span className="hidden sm:inline">Compare</span>
            </TabsTrigger>
            <TabsTrigger value="export" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="timeline">
            <ThreatTimeline />
          </TabsContent>
          
          <TabsContent value="map">
            <ThreatMap />
          </TabsContent>
          
          <TabsContent value="comparison">
            <DomainComparison />
          </TabsContent>
          
          <TabsContent value="export">
            <ExportAnalytics />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Analytics;
