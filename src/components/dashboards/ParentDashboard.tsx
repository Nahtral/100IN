
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Heart, 
  Calendar, 
  DollarSign, 
  MessageCircle, 
  User,
  TrendingUp,
  Award,
  Clock,
  MapPin
} from "lucide-react";

const ParentDashboard = () => {
  return (
    <div className="space-y-6">
      {/* Child Overview */}
      <Card className="border-pink-200 bg-gradient-to-r from-pink-50 to-rose-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-pink-600" />
            Emma Johnson - U16 Team
          </CardTitle>
          <CardDescription>
            Your child's basketball journey
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-pink-600">18.5</p>
              <p className="text-sm text-gray-600">Points Per Game</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">95%</p>
              <p className="text-sm text-gray-600">Attendance</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">A</p>
              <p className="text-sm text-gray-600">Coach Rating</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">2</p>
              <p className="text-sm text-gray-600">Awards This Year</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Emma's Progress
            </CardTitle>
            <CardDescription>
              Recent improvements and achievements
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Shooting Accuracy</span>
                <span className="text-lg font-bold text-green-600">+15%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{width: '78%'}}></div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Team Leadership</span>
                <span className="text-lg font-bold text-blue-600">Excellent</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{width: '90%'}}></div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Physical Fitness</span>
                <span className="text-lg font-bold text-purple-600">+8%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-purple-500 h-2 rounded-full" style={{width: '85%'}}></div>
              </div>
            </div>
            <Button className="w-full bg-gradient-to-r from-pink-500 to-pink-600">
              View Detailed Report
            </Button>
          </CardContent>
        </Card>

        {/* Communication */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-blue-600" />
              Messages & Updates
            </CardTitle>
            <CardDescription>
              Communications from coaches and staff
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { 
                from: "Coach Martinez", 
                subject: "Great game today!", 
                time: "2 hours ago", 
                type: "praise",
                preview: "Emma showed excellent leadership during today's match..."
              },
              { 
                from: "Team Manager", 
                subject: "Tournament Schedule", 
                time: "1 day ago", 
                type: "info",
                preview: "Important updates about next weekend's tournament..."
              },
              { 
                from: "Medical Staff", 
                subject: "Health Check Complete", 
                time: "3 days ago", 
                type: "medical",
                preview: "Emma's quarterly health assessment results..."
              }
            ].map((message, index) => (
              <div key={index} className="p-3 rounded-lg border border-gray-100 hover:border-pink-200 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{message.from}</p>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        message.type === 'praise' ? 'text-green-600 border-green-200' :
                        message.type === 'medical' ? 'text-red-600 border-red-200' :
                        'text-blue-600 border-blue-200'
                      }`}
                    >
                      {message.type}
                    </Badge>
                  </div>
                  <span className="text-xs text-gray-500">{message.time}</span>
                </div>
                <p className="font-medium text-sm mb-1">{message.subject}</p>
                <p className="text-sm text-gray-600 truncate">{message.preview}</p>
              </div>
            ))}
            <Button className="w-full bg-gradient-to-r from-blue-500 to-blue-600">
              View All Messages
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Schedule & Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              Emma's Schedule
            </CardTitle>
            <CardDescription>
              Upcoming practices and games
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { 
                date: "Tomorrow", 
                time: "6:00 PM", 
                event: "Team Practice", 
                location: "Panthers Court A", 
                transport: "Drop-off required"
              },
              { 
                date: "Saturday", 
                time: "10:00 AM", 
                event: "vs Eagles Basketball", 
                location: "Eagles Sports Center", 
                transport: "Team bus provided"
              },
              { 
                date: "Monday", 
                time: "5:30 PM", 
                event: "Fitness Training", 
                location: "Panthers Gym", 
                transport: "Drop-off required"
              }
            ].map((item, index) => (
              <div key={index} className="flex gap-4 p-3 rounded-lg border border-gray-100">
                <div className="text-center min-w-[70px]">
                  <p className="text-sm font-medium text-gray-600">{item.date}</p>
                  <p className="text-xs text-gray-500">{item.time}</p>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{item.event}</p>
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <MapPin className="h-3 w-3" />
                    <span>{item.location}</span>
                  </div>
                  <p className="text-xs text-purple-600 mt-1">{item.transport}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Payments & Fees
            </CardTitle>
            <CardDescription>
              Financial overview and upcoming payments
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-3 rounded-lg bg-green-50 border border-green-200">
                <p className="text-lg font-bold text-green-600">$0</p>
                <p className="text-sm text-gray-600">Outstanding</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-blue-50 border border-blue-200">
                <p className="text-lg font-bold text-blue-600">$285</p>
                <p className="text-sm text-gray-600">Paid This Month</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center p-2 rounded border border-gray-100">
                <span className="text-sm">Monthly Training Fee</span>
                <Badge variant="outline" className="text-green-600 border-green-200">Paid</Badge>
              </div>
              <div className="flex justify-between items-center p-2 rounded border border-gray-100">
                <span className="text-sm">Equipment Fee</span>
                <Badge variant="outline" className="text-green-600 border-green-200">Paid</Badge>
              </div>
              <div className="flex justify-between items-center p-2 rounded border border-orange-100 bg-orange-50">
                <span className="text-sm">Tournament Fee</span>
                <Badge variant="outline" className="text-orange-600 border-orange-300">Due Mar 15</Badge>
              </div>
            </div>
            
            <Button className="w-full bg-gradient-to-r from-green-500 to-green-600">
              Make Payment
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ParentDashboard;
