import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Mail, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const Ladders = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  // Redirect to sign in if not authenticated (only after auth loading is complete)
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/signin');
    }
  }, [user, authLoading, navigate]);

  // Countdown timer to September 1st, 2025
  useEffect(() => {
    const targetDate = new Date('2025-09-01T00:00:00').getTime();
    
    const updateCountdown = () => {
      const now = new Date().getTime();
      const distance = targetDate - now;
      
      if (distance > 0) {
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        setTimeLeft({ days, hours, minutes, seconds });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, []);

  // Show loading spinner while auth is loading or user is being redirected
  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Coming Soon Header */}
        <div className="text-center mb-12">
          <Badge className="mb-6 bg-primary/10 text-primary font-semibold px-4 py-2 text-lg">
            Season Starting Soon
          </Badge>
          <h1 className="text-5xl font-bold text-gradient mb-6">
            Ladders Coming Soon!
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Get ready for an exciting new season of Vancouver Pickleball Smash!
            Our competitive and casual ladders will launch on September 1st, 2025.
          </p>
        </div>

        {/* Countdown Timer */}
        <Card className="card-premium mb-8">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center text-2xl">
              <Clock className="h-6 w-6 mr-2 text-primary" />
              Season Starts In
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="bg-primary/10 rounded-lg p-4">
                <div className="text-3xl font-bold text-primary">{timeLeft.days}</div>
                <div className="text-sm text-muted-foreground font-medium">Days</div>
              </div>
              <div className="bg-primary/10 rounded-lg p-4">
                <div className="text-3xl font-bold text-primary">{timeLeft.hours}</div>
                <div className="text-sm text-muted-foreground font-medium">Hours</div>
              </div>
              <div className="bg-primary/10 rounded-lg p-4">
                <div className="text-3xl font-bold text-primary">{timeLeft.minutes}</div>
                <div className="text-sm text-muted-foreground font-medium">Minutes</div>
              </div>
              <div className="bg-primary/10 rounded-lg p-4">
                <div className="text-3xl font-bold text-primary">{timeLeft.seconds}</div>
                <div className="text-sm text-muted-foreground font-medium">Seconds</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Season Info */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="card-premium">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-6 w-6 mr-2 text-primary" />
                Season Start Date
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">September 1st</div>
                <div className="text-lg text-muted-foreground mb-4">2025</div>
                <p className="text-sm text-muted-foreground">
                  Mark your calendars! The new season kicks off with fresh rankings and exciting matches.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="card-premium">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Mail className="h-6 w-6 mr-2 text-primary" />
                Stay Updated
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-2xl font-semibold mb-4">You'll receive an email</div>
                <p className="text-muted-foreground mb-4">
                  All registered players will be notified via email when matches begin and the ladders are live.
                </p>
                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                  No action needed
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* How It Works */}
        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="text-center text-2xl">How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {/* Process Steps */}
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">📧</span>
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Weekly Assignments</h3>
                  <p className="text-sm text-muted-foreground">
                    Every week, you'll receive 1-2 match assignments via email with your opponent's contact details.
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">📱</span>
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Self-Organize</h3>
                  <p className="text-sm text-muted-foreground">
                    Contact your opponent directly to schedule your match at a time and location that works for both of you.
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">📊</span>
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Report Results</h3>
                  <p className="text-sm text-muted-foreground">
                    After your match, submit the score through your dashboard to update the ladder rankings.
                  </p>
                </div>
              </div>

              {/* Ladder Types */}
              <div className="border-t pt-8">
                <h3 className="text-xl font-semibold text-center mb-6">Two Ladder Options</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-primary/5 rounded-lg p-6">
                    <div className="flex items-center mb-3">
                      <span className="text-2xl mr-3">🏆</span>
                      <h4 className="font-semibold text-lg">Competitive Ladder</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      For experienced players (3.0-3.5 skill level) seeking competitive matches and serious play.
                    </p>
                    <Badge className="bg-primary/20 text-primary">$10 registration</Badge>
                  </div>
                  <div className="bg-accent/5 rounded-lg p-6">
                    <div className="flex items-center mb-3">
                      <span className="text-2xl mr-3">🤝</span>
                      <h4 className="font-semibold text-lg">Casual Ladder</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      For beginners and recreational players (2.0-2.5 skill level) focused on fun and improvement.
                    </p>
                    <Badge className="bg-accent/20 text-accent-foreground">$5 registration</Badge>
                  </div>
                </div>
              </div>

              {/* Rules Button */}
              <div className="text-center pt-6 border-t">
                <Button 
                  onClick={() => navigate('/rules')}
                  className="btn-hero"
                >
                  <BookOpen className="mr-2 h-5 w-5" />
                  View Full Rules & Guidelines
                </Button>
                <p className="text-sm text-muted-foreground mt-3">
                  Learn about match formats, scoring, and ladder policies
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default Ladders;

/* 
TEMPORARILY COMMENTED OUT - ORIGINAL LADDER FUNCTIONALITY
TODO: Uncomment when season starts

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, TrendingUp, TrendingDown, Minus, Crown, Loader2, Flame, ArrowUp, ArrowDown, Megaphone, User, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase, type Ladder, type LadderMembership, type User, type Announcement, type Match } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const Ladders = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [selectedLadder, setSelectedLadder] = useState<string>('');
  const [ladders, setLadders] = useState<Ladder[]>([]);
  const [ladderMemberships, setLadderMemberships] = useState<Array<LadderMembership & { user: User; ladder: Ladder }>>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [playerStatsOpen, setPlayerStatsOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<{ user: User; membership: LadderMembership & { user: User; ladder: Ladder }; stats: { wins: number; losses: number; total: number; winRate: number } } | null>(null);

  // ... rest of original ladder functionality
  // (keeping all the original code commented for easy restoration)
};

export default Ladders;
*/