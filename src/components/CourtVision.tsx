import React from 'react';
import { Users, Trophy, User, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function CourtVision() {
  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Status Bar Placeholder */}
      <div className="h-6 bg-black flex items-center justify-between px-4 text-white text-sm">
        <span>11:05</span>
        <div className="flex items-center gap-1">
          <div className="flex gap-1">
            <div className="w-1 h-1 bg-white rounded-full"></div>
            <div className="w-1 h-1 bg-white rounded-full"></div>
            <div className="w-1 h-1 bg-white rounded-full"></div>
            <div className="w-1 h-1 bg-white rounded-full"></div>
          </div>
          <span>📶</span>
          <span>🔋</span>
        </div>
      </div>

      {/* Header */}
      <div className="bg-panthers-red h-16 flex items-center justify-center sticky top-0 z-50">
        <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
          <div className="text-panthers-red font-bold text-lg">🐾</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-6 space-y-6">
        {/* Welcome Section */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            Welcome to Court Vision
          </h1>
          <p className="text-muted-foreground text-lg">
            Your Central Hub for Panthers Basketball
          </p>
        </div>

        {/* Stats Cards */}
        <div className="space-y-4">
          <Card className="card-enhanced">
            <CardContent className="p-6 text-center">
              <div className="flex justify-center mb-3">
                <Users className="w-8 h-8 text-panthers-red" />
              </div>
              <div className="text-3xl font-bold text-foreground mb-1">1</div>
              <div className="text-muted-foreground font-medium">Active Players</div>
            </CardContent>
          </Card>

          <Card className="card-enhanced">
            <CardContent className="p-6 text-center">
              <div className="flex justify-center mb-3">
                <Trophy className="w-8 h-8 text-panthers-red" />
              </div>
              <div className="text-3xl font-bold text-foreground mb-1">1</div>
              <div className="text-muted-foreground font-medium">Teams</div>
            </CardContent>
          </Card>

          <Card className="card-enhanced">
            <CardContent className="p-6 text-center">
              <div className="flex justify-center mb-3">
                <Calendar className="w-8 h-8 text-panthers-red" />
              </div>
              <div className="text-3xl font-bold text-foreground mb-1">3</div>
              <div className="text-muted-foreground font-medium">Upcoming Events</div>
            </CardContent>
          </Card>
        </div>

        {/* Next Event Block */}
        <Card className="gradient-gold border-0">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Next Event</h3>
            <div className="space-y-2">
              <h4 className="text-xl font-bold text-foreground">Away Game vs Hawks</h4>
              <p className="text-foreground/80">Tuesday, August 5 at 1:26 AM</p>
              <p className="text-sm text-foreground/70">Hawks Arena - vs Hawks</p>
            </div>
            <Button className="w-full mt-4 bg-panthers-red hover:bg-panthers-red/90 text-white">
              View Schedule
            </Button>
          </CardContent>
        </Card>

        {/* Important Updates */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-foreground">Important Updates</h3>
          <Card className="card-enhanced">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-3">
                <h4 className="font-semibold text-foreground">Welcome to the New Season!</h4>
                <span className="bg-secondary text-secondary-foreground px-2 py-1 rounded text-xs">
                  general
                </span>
              </div>
              <p className="text-muted-foreground text-sm mb-3">
                Get ready for an exciting new season with the Panthers. Check out our updated roster and upcoming schedule.
              </p>
              <p className="text-xs text-muted-foreground">July 29, 2025</p>
            </CardContent>
          </Card>
          <Button variant="outline" className="w-full">
            View All Updates
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4 pb-6">
          <h3 className="text-xl font-semibold text-foreground">Quick Actions</h3>
          <div className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full h-14 flex items-center justify-center gap-3 hover:bg-accent"
            >
              <User className="w-5 h-5 text-panthers-red" />
              <span className="font-medium">Manage Players</span>
            </Button>
            <Button 
              variant="outline" 
              className="w-full h-14 flex items-center justify-center gap-3 hover:bg-accent"
            >
              <Calendar className="w-5 h-5 text-panthers-red" />
              <span className="font-medium">View Schedule</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}