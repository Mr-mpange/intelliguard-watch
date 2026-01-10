import { useState } from 'react';
import { Download, FileText, FileSpreadsheet, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EnrichedThreatData } from '@/services/threatIntelligence';
import { toast } from 'sonner';
import { format as formatDate } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ThreatIntelExportProps {
  data: EnrichedThreatData;
  className?: string;
}

const ThreatIntelExport = ({ data, className }: ThreatIntelExportProps) => {
  const [isExporting, setIsExporting] = useState(false);

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 20;

      // Title
      doc.setFontSize(20);
      doc.setTextColor(30, 41, 59);
      doc.text('Threat Intelligence Report', pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;

      // Subtitle
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated: ${formatDate(new Date(), 'PPpp')}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;

      // Overview
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text('Threat Overview', 14, yPos);
      yPos += 8;

      autoTable(doc, {
        startY: yPos,
        head: [['Metric', 'Value']],
        body: [
          ['Indicator', data.indicator],
          ['Type', data.type],
          ['Risk Level', data.riskLevel.toUpperCase()],
          ['Threat Score', `${data.threatScore}/100`],
          ['Enriched At', formatDate(new Date(data.enrichedAt), 'PPpp')],
        ],
        theme: 'striped',
        headStyles: { fillColor: [239, 68, 68] },
        margin: { left: 14, right: 14 },
      });
      yPos = (doc as any).lastAutoTable.finalY + 15;

      // Sources
      if (data.sources && data.sources.length > 0) {
        doc.setFontSize(14);
        doc.text('Intelligence Sources', 14, yPos);
        yPos += 8;

        autoTable(doc, {
          startY: yPos,
          head: [['Source']],
          body: data.sources.map(s => [s]),
          theme: 'striped',
          headStyles: { fillColor: [59, 130, 246] },
          margin: { left: 14, right: 14 },
        });
        yPos = (doc as any).lastAutoTable.finalY + 15;
      }

      // Indicators
      if (data.indicators && data.indicators.length > 0) {
        if (yPos > 200) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.text('Threat Indicators', 14, yPos);
        yPos += 8;

        autoTable(doc, {
          startY: yPos,
          head: [['Type', 'Severity', 'Source', 'Description']],
          body: data.indicators.map(ind => [
            ind.type,
            ind.severity,
            ind.source,
            ind.description.slice(0, 60) + (ind.description.length > 60 ? '...' : ''),
          ]),
          theme: 'striped',
          headStyles: { fillColor: [234, 88, 12] },
          margin: { left: 14, right: 14 },
          columnStyles: {
            3: { cellWidth: 60 },
          },
        });
        yPos = (doc as any).lastAutoTable.finalY + 15;
      }

      // Tags
      if (data.tags && data.tags.length > 0) {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.text('Associated Tags', 14, yPos);
        yPos += 8;

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(data.tags.join(', '), 14, yPos, { maxWidth: pageWidth - 28 });
      }

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `IntelliGuard Threat Intelligence Report - Page ${i} of ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      doc.save(`threat-intel-${data.indicator.replace(/[^a-zA-Z0-9]/g, '-')}-${formatDate(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('PDF report downloaded');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const exportToCSV = async () => {
    setIsExporting(true);
    try {
      const rows: string[][] = [];
      
      // Overview
      rows.push(['=== THREAT INTELLIGENCE REPORT ===']);
      rows.push(['Generated', formatDate(new Date(), 'yyyy-MM-dd HH:mm:ss')]);
      rows.push([]);
      rows.push(['=== OVERVIEW ===']);
      rows.push(['Indicator', data.indicator]);
      rows.push(['Type', data.type]);
      rows.push(['Risk Level', data.riskLevel]);
      rows.push(['Threat Score', data.threatScore.toString()]);
      rows.push(['Enriched At', data.enrichedAt]);
      rows.push([]);

      // Sources
      if (data.sources && data.sources.length > 0) {
        rows.push(['=== INTELLIGENCE SOURCES ===']);
        data.sources.forEach(s => rows.push([s]));
        rows.push([]);
      }

      // Indicators
      if (data.indicators && data.indicators.length > 0) {
        rows.push(['=== THREAT INDICATORS ===']);
        rows.push(['Type', 'Severity', 'Source', 'Description', 'First Seen', 'Last Seen', 'Tags']);
        data.indicators.forEach(ind => {
          rows.push([
            ind.type,
            ind.severity,
            ind.source,
            ind.description,
            ind.first_seen || '',
            ind.last_seen || '',
            ind.tags?.join('; ') || '',
          ]);
        });
        rows.push([]);
      }

      // Tags
      if (data.tags && data.tags.length > 0) {
        rows.push(['=== ASSOCIATED TAGS ===']);
        rows.push([data.tags.join(', ')]);
      }

      const csvContent = rows.map(row => 
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ).join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `threat-intel-${data.indicator.replace(/[^a-zA-Z0-9]/g, '-')}-${formatDate(new Date(), 'yyyy-MM-dd')}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      
      toast.success('CSV report downloaded');
    } catch (error) {
      console.error('CSV export error:', error);
      toast.error('Failed to export CSV');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={className} disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToPDF}>
          <FileText className="w-4 h-4 mr-2" />
          Export as PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToCSV}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ThreatIntelExport;
