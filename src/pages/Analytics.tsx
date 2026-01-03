import DashboardLayout from '@/components/layout/DashboardLayout';
import { ThreatTimeline } from '@/components/analytics/ThreatTimeline';
import { DomainComparison } from '@/components/analytics/DomainComparison';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, GitCompare, BarChart3 } from 'lucide-react';

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
                Deep-dive into threat patterns and domain security comparisons
              </p>
            </div>
          </div>
        </div>
        
        {/* Tabs for different analytics views */}
        <Tabs defaultValue="timeline" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="timeline" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Threat Timeline
            </TabsTrigger>
            <TabsTrigger value="comparison" className="flex items-center gap-2">
              <GitCompare className="w-4 h-4" />
              Domain Comparison
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="timeline">
            <ThreatTimeline />
          </TabsContent>
          
          <TabsContent value="comparison">
            <DomainComparison />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Analytics;
