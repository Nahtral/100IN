
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Heart, 
  Activity, 
  AlertTriangle, 
  Users, 
  Calendar,
  FileText,
  Thermometer,
  Shield,
  Clock
} from "lucide-react";

const MedicalDashboard = () => {
  return (
    <div className="space-y-6">
      {/* Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Players</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">342</div>
            <p className="text-xs text-muted-foreground">
              All cleared to play
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-yellow-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Injuries</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">
              Under treatment
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Health Checks</CardTitle>
            <Heart className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">15</div>
            <p className="text-xs text-muted-foreground">
              Due this month
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vaccinations</CardTitle>
            <Shield className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">98%</div>
            <p className="text-xs text-muted-foreground">
              Up to date
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Injury Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Active Injury Cases
            </CardTitle>
            <CardDescription>
              Players currently under medical care
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { 
                player: "Marcus Johnson", 
                injury: "Ankle Sprain", 
                severity: "Minor", 
                treatment: "Physio + Rest",
                returnDate: "Mar 15, 2024"
              },
              { 
                player: "Sofia Garcia", 
                injury: "Knee Strain", 
                severity: "Moderate", 
                treatment: "MRI Scheduled",
                returnDate: "TBD"
              },
              { 
                player: "David Lee", 
                injury: "Wrist Pain", 
                severity: "Minor", 
                treatment: "Ice + Monitoring",
                returnDate: "Mar 8, 2024"
              }
            ].map((case_item, index) => (
              <div key={index} className="p-3 rounded-lg border border-gray-100">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium">{case_item.player}</p>
                    <p className="text-sm text-gray-600">{case_item.injury}</p>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`${
                      case_item.severity === 'Minor' ? 'text-yellow-600 border-yellow-200' :
                      case_item.severity === 'Moderate' ? 'text-orange-600 border-orange-200' :
                      'text-red-600 border-red-200'
                    }`}
                  >
                    {case_item.severity}
                  </Badge>
                </div>
                <div className="text-sm space-y-1">
                  <p><span className="font-medium">Treatment:</span> {case_item.treatment}</p>
                  <p><span className="font-medium">Expected Return:</span> {case_item.returnDate}</p>
                </div>
              </div>
            ))}
            <Button className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600">
              View All Cases
            </Button>
          </CardContent>
        </Card>

        {/* Health Monitoring */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              Health Monitoring
            </CardTitle>
            <CardDescription>
              Vital statistics and fitness tracking
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Average Heart Rate</span>
                <span className="text-lg font-bold text-green-600">72 BPM</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{width: '85%'}}></div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Team Fitness Level</span>
                <span className="text-lg font-bold text-blue-600">87%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{width: '87%'}}></div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Hydration Compliance</span>
                <span className="text-lg font-bold text-purple-600">94%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-purple-500 h-2 rounded-full" style={{width: '94%'}}></div>
              </div>
            </div>
            <Button className="w-full bg-gradient-to-r from-blue-500 to-blue-600">
              Generate Health Report
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Medical Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-green-600" />
            Medical Schedule
          </CardTitle>
          <CardDescription>
            Upcoming checkups, treatments, and clearances
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { 
                time: "9:00 AM", 
                patient: "Team U16", 
                type: "Health Screening", 
                status: "scheduled",
                location: "Medical Room A"
              },
              { 
                time: "11:00 AM", 
                patient: "Marcus Johnson", 
                type: "Ankle Follow-up", 
                status: "confirmed",
                location: "Physio Room"
              },
              { 
                time: "2:00 PM", 
                patient: "Sofia Garcia", 
                type: "MRI Appointment", 
                status: "external",
                location: "City Medical Center"
              },
              { 
                time: "4:00 PM", 
                patient: "Emma Wilson", 
                type: "Return to Play Assessment", 
                status: "scheduled",
                location: "Medical Room B"
              },
              { 
                time: "5:30 PM", 
                patient: "Team U14", 
                type: "Nutrition Workshop", 
                status: "group",
                location: "Conference Room"
              }
            ].map((appointment, index) => (
              <div key={index} className="flex items-center gap-4 p-4 rounded-lg border border-gray-100">
                <div className="text-center min-w-[60px]">
                  <p className="font-medium text-sm">{appointment.time}</p>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium">{appointment.patient}</p>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        appointment.status === 'confirmed' ? 'text-green-600 border-green-200' :
                        appointment.status === 'external' ? 'text-blue-600 border-blue-200' :
                        appointment.status === 'group' ? 'text-purple-600 border-purple-200' :
                        'text-gray-600 border-gray-200'
                      }`}
                    >
                      {appointment.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{appointment.type}</p>
                  <p className="text-xs text-gray-500 mt-1">{appointment.location}</p>
                </div>
                <div className="flex items-center gap-2">
                  {appointment.type.includes('Health') && <Heart className="h-4 w-4 text-green-500" />}
                  {appointment.type.includes('Follow-up') && <Activity className="h-4 w-4 text-blue-500" />}
                  {appointment.type.includes('MRI') && <FileText className="h-4 w-4 text-purple-500" />}
                  {appointment.type.includes('Assessment') && <Shield className="h-4 w-4 text-orange-500" />}
                  {appointment.type.includes('Nutrition') && <Thermometer className="h-4 w-4 text-red-500" />}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MedicalDashboard;
