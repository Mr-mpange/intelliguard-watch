import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, Mail, Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';

interface ScheduledReport {
  id: string;
  report_name: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  include_scan_history: boolean;
  include_threat_summary: boolean;
  include_monitored_domains: boolean;
  include_audit_logs: boolean;
  is_active: boolean;
  last_sent_at: string | null;
  next_scheduled_at: string;
}

const ScheduledReports = () => {
  const [reports, setReports] = useState<ScheduledReport[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  const [newReport, setNewReport] = useState<{
    report_name: string;
    frequency: 'daily' | 'weekly' | 'monthly';
    include_scan_history: boolean;
    include_threat_summary: boolean;
    include_monitored_domains: boolean;
    include_audit_logs: boolean;
  }>({
    report_name: '',
    frequency: 'weekly',
    include_scan_history: true,
    include_threat_summary: true,
    include_monitored_domains: true,
    include_audit_logs: false,
  });

  useEffect(() => {
    if (user) {
      fetchReports();
    }
  }, [user]);

  const fetchReports = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('scheduled_reports')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setReports(data as ScheduledReport[]);
    }
    setLoading(false);
  };

  const createReport = async () => {
    if (!user || !newReport.report_name) return;

    const nextScheduled = new Date();
    switch (newReport.frequency) {
      case 'daily':
        nextScheduled.setDate(nextScheduled.getDate() + 1);
        break;
      case 'weekly':
        nextScheduled.setDate(nextScheduled.getDate() + 7);
        break;
      case 'monthly':
        nextScheduled.setMonth(nextScheduled.getMonth() + 1);
        break;
    }

    const { data, error } = await supabase
      .from('scheduled_reports')
      .insert({
        user_id: user.id,
        ...newReport,
        next_scheduled_at: nextScheduled.toISOString(),
      })
      .select()
      .single();

    if (error) {
      toast({ variant: 'destructive', title: 'Failed to create report', description: error.message });
    } else {
      setReports([data as ScheduledReport, ...reports]);
      setIsCreating(false);
      setNewReport({
        report_name: '',
        frequency: 'weekly',
        include_scan_history: true,
        include_threat_summary: true,
        include_monitored_domains: true,
        include_audit_logs: false,
      });
      toast({ title: 'Report scheduled', description: 'Your security report has been scheduled.' });
    }
  };

  const toggleReport = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from('scheduled_reports')
      .update({ is_active: isActive })
      .eq('id', id);

    if (!error) {
      setReports(reports.map(r => r.id === id ? { ...r, is_active: isActive } : r));
    }
  };

  const deleteReport = async (id: string) => {
    const { error } = await supabase
      .from('scheduled_reports')
      .delete()
      .eq('id', id);

    if (!error) {
      setReports(reports.filter(r => r.id !== id));
      toast({ title: 'Report deleted' });
    }
  };

  const frequencyLabels = {
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Scheduled Reports
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Automatically receive security reports via email
          </p>
        </div>
        <Button onClick={() => setIsCreating(true)} disabled={isCreating}>
          <Plus className="w-4 h-4 mr-2" />
          New Report
        </Button>
      </div>

      {isCreating && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-6 p-4 border border-primary/30 rounded-lg bg-card"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <Label htmlFor="report-name">Report Name</Label>
              <Input
                id="report-name"
                placeholder="Weekly Security Summary"
                value={newReport.report_name}
                onChange={(e) => setNewReport({ ...newReport, report_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select
                value={newReport.frequency}
                onValueChange={(value: 'daily' | 'weekly' | 'monthly') => 
                  setNewReport({ ...newReport, frequency: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={newReport.include_scan_history}
                onCheckedChange={(checked) => 
                  setNewReport({ ...newReport, include_scan_history: checked })
                }
              />
              <Label className="text-sm">Scan History</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={newReport.include_threat_summary}
                onCheckedChange={(checked) => 
                  setNewReport({ ...newReport, include_threat_summary: checked })
                }
              />
              <Label className="text-sm">Threat Summary</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={newReport.include_monitored_domains}
                onCheckedChange={(checked) => 
                  setNewReport({ ...newReport, include_monitored_domains: checked })
                }
              />
              <Label className="text-sm">Monitored Domains</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={newReport.include_audit_logs}
                onCheckedChange={(checked) => 
                  setNewReport({ ...newReport, include_audit_logs: checked })
                }
              />
              <Label className="text-sm">Audit Logs</Label>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setIsCreating(false)}>
              <X className="w-4 h-4 mr-1" /> Cancel
            </Button>
            <Button onClick={createReport} disabled={!newReport.report_name}>
              <Check className="w-4 h-4 mr-1" /> Create Report
            </Button>
          </div>
        </motion.div>
      )}

      <div className="space-y-3">
        {loading ? (
          <div className="text-center text-muted-foreground py-8">Loading...</div>
        ) : reports.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Mail className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No scheduled reports yet</p>
          </div>
        ) : (
          reports.map((report) => (
            <div
              key={report.id}
              className={`p-4 rounded-lg border ${
                report.is_active ? 'bg-card border-border' : 'bg-muted/30 border-border/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{report.report_name}</h4>
                    <Badge variant={report.is_active ? 'default' : 'secondary'}>
                      {frequencyLabels[report.frequency]}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Next: {formatDistanceToNow(new Date(report.next_scheduled_at), { addSuffix: true })}
                    </span>
                    {report.last_sent_at && (
                      <span>
                        Last sent: {formatDistanceToNow(new Date(report.last_sent_at), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={report.is_active}
                    onCheckedChange={(checked) => toggleReport(report.id, checked)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => deleteReport(report.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
};

export default ScheduledReports;
