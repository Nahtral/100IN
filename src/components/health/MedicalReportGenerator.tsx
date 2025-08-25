import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarIcon, FileText, Download } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface MedicalReportGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
}

const MedicalReportGenerator: React.FC<MedicalReportGeneratorProps> = ({
  isOpen,
  onClose
}) => {
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('');
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [includeInjuries, setIncludeInjuries] = useState(true);
  const [includeFitness, setIncludeFitness] = useState(true);
  const [includeCheckIns, setIncludeCheckIns] = useState(true);
  const { toast } = useToast();

  const handleGenerateReport = async () => {
    if (!reportType || !startDate || !endDate) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const reportData = {
        type: reportType,
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
        includeInjuries,
        includeFitness,
        includeCheckIns,
        generatedAt: new Date().toISOString(),
        generatedBy: (await supabase.auth.getUser()).data.user?.id
      };

      // In a real implementation, this would call a backend service
      // For now, we'll simulate report generation
      await new Promise(resolve => setTimeout(resolve, 2000));

      toast({
        title: "Success",
        description: "Medical report generated successfully! Check your downloads folder.",
      });

      // Reset form and close
      setReportType('');
      setStartDate(undefined);
      setEndDate(undefined);
      setIncludeInjuries(true);
      setIncludeFitness(true);
      setIncludeCheckIns(true);
      onClose();

    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Error",
        description: "Failed to generate medical report",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Generate Medical Report
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="reportType">Report Type *</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger>
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="injury_summary">Injury Summary Report</SelectItem>
                <SelectItem value="fitness_analysis">Fitness Analysis Report</SelectItem>
                <SelectItem value="health_overview">Overall Health Overview</SelectItem>
                <SelectItem value="compliance">Medical Compliance Report</SelectItem>
                <SelectItem value="custom">Custom Report</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : <span>Pick start date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>End Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : <span>Pick end date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-4">
            <Label>Include in Report:</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="injuries"
                  checked={includeInjuries}
                  onCheckedChange={(checked) => setIncludeInjuries(checked === true)}
                />
                <Label htmlFor="injuries" className="text-sm">
                  Injury Data & Treatment History
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="fitness"
                  checked={includeFitness}
                  onCheckedChange={(checked) => setIncludeFitness(checked === true)}
                />
                <Label htmlFor="fitness" className="text-sm">
                  Fitness Assessments & Scores
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="checkins"
                  checked={includeCheckIns}
                  onCheckedChange={(checked) => setIncludeCheckIns(checked === true)}
                />
                <Label htmlFor="checkins" className="text-sm">
                  Daily Health Check-ins
                </Label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleGenerateReport} disabled={loading}>
              {loading ? (
                <>Generating...</>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Generate Report
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MedicalReportGenerator;