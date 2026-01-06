import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Download, FileText, FileSpreadsheet, Loader2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format as formatDate, subDays } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type ExportFormatType = 'pdf' | 'csv';
type TimeRange = '7d' | '30d' | '90d' | 'all';

interface ExportSection {
  id: string;
  label: string;
  description: string;
}

const exportSections: ExportSection[] = [
  { id: 'scan_history', label: 'Domain Scan History', description: 'All domain scans with results' },
  { id: 'threat_summary', label: 'Threat Summary', description: 'Aggregated threat statistics' },
  { id: 'monitored_domains', label: 'Monitored Domains', description: 'Active monitoring configurations' },
  { id: 'audit_logs', label: 'Audit Logs', description: 'Security event audit trail' },
];

export const ExportAnalytics = () => {
  const { user } = useAuth();
  const [exportFormat, setExportFormat] = useState<ExportFormatType>('pdf');
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [selectedSections, setSelectedSections] = useState<string[]>(['scan_history', 'threat_summary']);
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);

  const toggleSection = (sectionId: string) => {
    setSelectedSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const getDateRange = () => {
    const end = new Date();
    let start: Date;
    
    switch (timeRange) {
      case '7d':
        start = subDays(end, 7);
        break;
      case '30d':
        start = subDays(end, 30);
        break;
      case '90d':
        start = subDays(end, 90);
        break;
      default:
        start = new Date(0);
    }
    
    return { start, end };
  };

  const fetchScanHistory = async () => {
    if (!user) return [];
    const { start, end } = getDateRange();
    
    const { data, error } = await supabase
      .from('domain_scans')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: false });
    
    return error ? [] : data || [];
  };

  const fetchMonitoredDomains = async () => {
    if (!user) return [];
    
    const { data, error } = await supabase
      .from('monitored_domains')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    return error ? [] : data || [];
  };

  const fetchAuditLogs = async () => {
    if (!user) return [];
    const { start, end } = getDateRange();
    
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: false })
      .limit(500);
    
    return error ? [] : data || [];
  };

  const exportToPDF = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Title
    doc.setFontSize(20);
    doc.setTextColor(30, 41, 59);
    doc.text('IntelliGuard Security Report', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    // Subtitle
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated: ${formatDate(new Date(), 'PPpp')}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;
    doc.text(`Time Range: ${timeRange === 'all' ? 'All Time' : `Last ${timeRange.replace('d', ' days')}`}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // Scan History
    if (selectedSections.includes('scan_history')) {
      const scans = await fetchScanHistory();
      
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text('Domain Scan History', 14, yPos);
      yPos += 8;

      if (scans.length > 0) {
        autoTable(doc, {
          startY: yPos,
          head: [['Domain', 'Status', 'Detections', 'Reputation', 'Scanned']],
          body: scans.map((scan) => [
            scan.domain,
            scan.is_malicious ? 'Malicious' : 'Clean',
            `${scan.positives}/${scan.total}`,
            scan.reputation?.toString() || 'N/A',
            formatDate(new Date(scan.created_at), 'MMM dd, yyyy'),
          ]),
          theme: 'striped',
          headStyles: { fillColor: [59, 130, 246] },
          margin: { left: 14, right: 14 },
        });
        yPos = (doc as any).lastAutoTable.finalY + 15;
      } else {
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text('No scan data available for the selected period.', 14, yPos);
        yPos += 15;
      }
    }

    // Threat Summary
    if (selectedSections.includes('threat_summary')) {
      const scans = await fetchScanHistory();
      const malicious = scans.filter((s) => s.is_malicious).length;
      const clean = scans.filter((s) => !s.is_malicious).length;
      const avgReputation = scans.filter((s) => s.reputation).reduce((sum, s) => sum + (s.reputation || 0), 0) / (scans.filter((s) => s.reputation).length || 1);

      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text('Threat Summary', 14, yPos);
      yPos += 8;

      autoTable(doc, {
        startY: yPos,
        head: [['Metric', 'Value']],
        body: [
          ['Total Scans', scans.length.toString()],
          ['Malicious Domains', malicious.toString()],
          ['Clean Domains', clean.toString()],
          ['Average Reputation', avgReputation.toFixed(1)],
          ['Detection Rate', `${scans.length > 0 ? ((malicious / scans.length) * 100).toFixed(1) : 0}%`],
        ],
        theme: 'striped',
        headStyles: { fillColor: [239, 68, 68] },
        margin: { left: 14, right: 14 },
        tableWidth: 'auto',
      });
      yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    // Monitored Domains
    if (selectedSections.includes('monitored_domains')) {
      const domains = await fetchMonitoredDomains();

      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text('Monitored Domains', 14, yPos);
      yPos += 8;

      if (domains.length > 0) {
        autoTable(doc, {
          startY: yPos,
          head: [['Domain', 'Status', 'Frequency', 'Last Scanned']],
          body: domains.map((d) => [
            d.domain,
            d.is_active ? 'Active' : 'Paused',
            d.scan_frequency,
            d.last_scanned_at ? formatDate(new Date(d.last_scanned_at), 'MMM dd, yyyy') : 'Never',
          ]),
          theme: 'striped',
          headStyles: { fillColor: [34, 197, 94] },
          margin: { left: 14, right: 14 },
        });
        yPos = (doc as any).lastAutoTable.finalY + 15;
      } else {
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text('No monitored domains configured.', 14, yPos);
        yPos += 15;
      }
    }

    // Audit Logs
    if (selectedSections.includes('audit_logs')) {
      const logs = await fetchAuditLogs();

      if (yPos > 200) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text('Audit Logs', 14, yPos);
      yPos += 8;

      if (logs.length > 0) {
        autoTable(doc, {
          startY: yPos,
          head: [['Action', 'Resource', 'Severity', 'Timestamp']],
          body: logs.slice(0, 50).map((log) => [
            log.action,
            log.resource_type,
            log.severity,
            formatDate(new Date(log.created_at), 'MMM dd HH:mm'),
          ]),
          theme: 'striped',
          headStyles: { fillColor: [168, 85, 247] },
          margin: { left: 14, right: 14 },
        });
      } else {
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text('No audit logs available for the selected period.', 14, yPos);
      }
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `IntelliGuard Security Report - Page ${i} of ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    doc.save(`intelliguard-report-${formatDate(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const exportToCSV = async () => {
    const rows: string[][] = [];
    
    if (selectedSections.includes('scan_history')) {
      const scans = await fetchScanHistory();
      rows.push(['=== DOMAIN SCAN HISTORY ===']);
      rows.push(['Domain', 'Status', 'Positives', 'Total', 'Reputation', 'SSL Issuer', 'Created At']);
      scans.forEach((scan) => {
        rows.push([
          scan.domain,
          scan.is_malicious ? 'Malicious' : 'Clean',
          scan.positives.toString(),
          scan.total.toString(),
          scan.reputation?.toString() || '',
          scan.ssl_issuer || '',
          formatDate(new Date(scan.created_at), 'yyyy-MM-dd HH:mm:ss'),
        ]);
      });
      rows.push([]);
    }

    if (selectedSections.includes('monitored_domains')) {
      const domains = await fetchMonitoredDomains();
      rows.push(['=== MONITORED DOMAINS ===']);
      rows.push(['Domain', 'Active', 'Frequency', 'Last Status', 'Last Scanned', 'Created At']);
      domains.forEach((d) => {
        rows.push([
          d.domain,
          d.is_active ? 'Yes' : 'No',
          d.scan_frequency,
          d.last_status || '',
          d.last_scanned_at ? formatDate(new Date(d.last_scanned_at), 'yyyy-MM-dd HH:mm:ss') : '',
          formatDate(new Date(d.created_at), 'yyyy-MM-dd HH:mm:ss'),
        ]);
      });
      rows.push([]);
    }

    if (selectedSections.includes('audit_logs')) {
      const logs = await fetchAuditLogs();
      rows.push(['=== AUDIT LOGS ===']);
      rows.push(['Action', 'Resource Type', 'Resource ID', 'Severity', 'IP Address', 'Created At']);
      logs.forEach((log) => {
        rows.push([
          log.action,
          log.resource_type,
          log.resource_id || '',
          log.severity,
          log.ip_address || '',
          formatDate(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
        ]);
      });
    }

    const csvContent = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `intelliguard-report-${formatDate(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    if (selectedSections.length === 0) {
      toast.error('Please select at least one section to export');
      return;
    }

    setIsExporting(true);
    setExportComplete(false);

    try {
      if (exportFormat === 'pdf') {
        await exportToPDF();
      } else {
        await exportToCSV();
      }
      setExportComplete(true);
      toast.success(`Report exported successfully as ${exportFormat.toUpperCase()}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export report');
    } finally {
      setIsExporting(false);
      setTimeout(() => setExportComplete(false), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Download className="w-6 h-6 text-primary" />
          Export Analytics
        </h2>
        <p className="text-muted-foreground">Generate compliance reports in PDF or CSV format</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Export options */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Export Configuration</CardTitle>
            <CardDescription>Select format, time range, and data sections</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Format selection */}
            <div className="space-y-2">
              <Label>Export Format</Label>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant={exportFormat === 'pdf' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setExportFormat('pdf')}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  PDF Report
                </Button>
                <Button
                  type="button"
                  variant={exportFormat === 'csv' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setExportFormat('csv')}
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  CSV Data
                </Button>
              </div>
            </div>

            {/* Time range */}
            <div className="space-y-2">
              <Label>Time Range</Label>
              <Select value={timeRange} onValueChange={(v: TimeRange) => setTimeRange(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="90d">Last 90 Days</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Section selection */}
            <div className="space-y-3">
              <Label>Data Sections</Label>
              {exportSections.map((section) => (
                <div
                  key={section.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                >
                  <Checkbox
                    id={section.id}
                    checked={selectedSections.includes(section.id)}
                    onCheckedChange={() => toggleSection(section.id)}
                  />
                  <div className="flex-1">
                    <Label htmlFor={section.id} className="font-medium cursor-pointer">
                      {section.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">{section.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Preview and export */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Export Preview</CardTitle>
            <CardDescription>Review your export configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Format</span>
                <span className="font-medium">{exportFormat.toUpperCase()}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Time Range</span>
                <span className="font-medium">
                  {timeRange === 'all' ? 'All Time' : `Last ${timeRange.replace('d', ' days')}`}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Sections</span>
                <span className="font-medium">{selectedSections.length} selected</span>
              </div>
              <div className="py-2">
                <span className="text-muted-foreground text-sm">Included sections:</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedSections.map((id) => {
                    const section = exportSections.find((s) => s.id === id);
                    return (
                      <span
                        key={id}
                        className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-md"
                      >
                        {section?.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            <Button
              onClick={handleExport}
              className="w-full"
              disabled={isExporting || selectedSections.length === 0}
            >
              <AnimatePresence mode="wait">
                {isExporting ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating Report...
                  </motion.div>
                ) : exportComplete ? (
                  <motion.div
                    key="complete"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Export Complete!
                  </motion.div>
                ) : (
                  <motion.div
                    key="export"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export {exportFormat.toUpperCase()} Report
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ExportAnalytics;
