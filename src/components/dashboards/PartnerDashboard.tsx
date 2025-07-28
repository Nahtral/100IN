
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Handshake, 
  TrendingUp, 
  Eye, 
  DollarSign, 
  Users,
  Calendar,
  Award,
  BarChart3,
  Star
} from "lucide-react";

const PartnerDashboard = () => {
  return (
    <div className="space-y-6">
      {/* Partnership Overview */}
      <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Handshake className="h-5 w-5 text-purple-600" />
            SportsTech Solutions - Gold Partner
          </CardTitle>
          <CardDescription>
            Premium partnership with the Panthers Basketball Club
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">$25,000</p>
              <p className="text-sm text-gray-600">Annual Investment</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">2.3M</p>
              <p className="text-sm text-gray-600">Brand Impressions</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">847</p>
              <p className="text-sm text-gray-600">Community Reach</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">95%</p>
              <p className="text-sm text-gray-600">Satisfaction Score</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Brand Exposure Analytics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-600" />
              Brand Exposure Analytics
            </CardTitle>
            <CardDescription>
              Your visibility and engagement metrics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Logo Visibility</span>
                <span className="text-lg font-bold text-blue-600">450K</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{width: '92%'}}></div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Social Media Mentions</span>
                <span className="text-lg font-bold text-green-600">1.2K</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{width: '78%'}}></div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Event Attendance</span>
                <span className="text-lg font-bold text-purple-600">15K</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-purple-500 h-2 rounded-full" style={{width: '85%'}}></div>
              </div>
            </div>
            <Button className="w-full bg-gradient-to-r from-blue-500 to-blue-600">
              View Detailed Analytics
            </Button>
          </CardContent>
        </Card>

        {/* Partnership Benefits */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-gold-600" />
              Partnership Benefits
            </CardTitle>
            <CardDescription>
              Active sponsorship opportunities
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { benefit: "Logo on Team Jerseys", status: "active", reach: "All games" },
              { benefit: "Stadium Banner Display", status: "active", reach: "Home games" },
              { benefit: "Social Media Features", status: "active", reach: "Weekly posts" },
              { benefit: "Newsletter Inclusion", status: "active", reach: "2,500 subscribers" },
              { benefit: "Event Naming Rights", status: "upcoming", reach: "Tournament 2024" }
            ].map((benefit, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
                <div>
                  <p className="font-medium text-sm">{benefit.benefit}</p>
                  <p className="text-xs text-gray-600">{benefit.reach}</p>
                </div>
                <Badge 
                  variant={benefit.status === 'active' ? 'default' : 'secondary'}
                  className={benefit.status === 'active' ? 'bg-green-500' : ''}
                >
                  {benefit.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ROI & Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              ROI Performance
            </CardTitle>
            <CardDescription>
              Return on investment metrics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center p-4 rounded-lg bg-green-50 border border-green-200">
              <p className="text-3xl font-bold text-green-600">247%</p>
              <p className="text-sm text-gray-600">Estimated ROI</p>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Brand Awareness Lift</span>
                <span className="font-medium">+34%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Customer Acquisition</span>
                <span className="font-medium">+156 leads</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Community Engagement</span>
                <span className="font-medium">+89%</span>
              </div>
            </div>

            <Button className="w-full bg-gradient-to-r from-green-500 to-green-600">
              Download ROI Report
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              Upcoming Opportunities
            </CardTitle>
            <CardDescription>
              Events and sponsorship chances
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { 
                event: "Regional Championship", 
                date: "March 25, 2024", 
                type: "Tournament", 
                exposure: "High",
                cost: "$5,000"
              },
              { 
                event: "Youth Basketball Camp", 
                date: "April 10-12", 
                type: "Community", 
                exposure: "Medium",
                cost: "$2,500"
              },
              { 
                event: "Annual Awards Dinner", 
                date: "May 15, 2024", 
                type: "Gala", 
                exposure: "Premium",
                cost: "$8,000"
              }
            ].map((opportunity, index) => (
              <div key={index} className="p-3 rounded-lg border border-gray-100 hover:border-purple-200 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-sm">{opportunity.event}</p>
                    <p className="text-xs text-gray-600">{opportunity.date}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-xs">
                      {opportunity.type}
                    </Badge>
                    <Star className={`h-3 w-3 ${
                      opportunity.exposure === 'Premium' ? 'text-yellow-500' :
                      opportunity.exposure === 'High' ? 'text-orange-500' :
                      'text-gray-400'
                    }`} />
                  </div>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>Investment: {opportunity.cost}</span>
                  <span className="text-purple-600 font-medium">{opportunity.exposure} Exposure</span>
                </div>
              </div>
            ))}
            <Button className="w-full bg-gradient-to-r from-purple-500 to-purple-600">
              View All Opportunities
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PartnerDashboard;
