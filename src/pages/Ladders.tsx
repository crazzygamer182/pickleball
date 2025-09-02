import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, TrendingUp, TrendingDown, Minus, Crown, Loader2, Flame, ArrowUp, ArrowDown, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, type PickleballLadder, type PickleballLadderMembership, type User as UserType } from '@/lib/supabase';

const Ladders = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [ladderMemberships, setLadderMemberships] = useState<Array<PickleballLadderMembership & { user: UserType; ladder: PickleballLadder }>>([]);
  const [loading, setLoading] = useState(true);

  // Fake player names to fill out the ladder
  const fakePlayerNames = [
    'Alex Johnson', 'Sarah Chen', 'Mike Rodriguez', 'Emily Davis', 'Chris Thompson',
    'Jessica Wilson', 'David Lee', 'Amanda Taylor', 'Ryan Brown', 'Nicole Garcia',
    'Kevin Martinez', 'Lisa Anderson', 'Jason White', 'Rachel Kim', 'Tyler Johnson',
    'Megan Clark', 'Brandon Hall', 'Stephanie Moore', 'Jordan Smith', 'Ashley Wong'
  ];

  // Redirect to sign in if not authenticated (only after auth loading is complete)
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/signin');
    }
  }, [user, authLoading, navigate]);

  // Fetch competitive ladder data
  useEffect(() => {
    const fetchLadderData = async () => {
      if (!user) return;

      try {
        setLoading(true);
        
        // First get the pickleball ladder ID (competitive type in database)
        const { data: pickleballLadder, error: ladderError } = await supabase
          .from('pickleball_ladders')
          .select('id')
          .eq('type', 'competitive')
          .single();

        if (ladderError || !pickleballLadder) {
          console.error('Error fetching pickleball ladder:', ladderError);
          return;
        }

        // Then fetch memberships for that specific ladder
        const { data: memberships, error } = await supabase
          .from('pickleball_ladder_memberships')
          .select(`
            *,
            user:users(*),
            ladder:pickleball_ladders(*)
          `)
          .eq('is_active', true)
          .eq('ladder_id', pickleballLadder.id)
          .order('current_rank', { ascending: true });

        if (error) {
          console.error('Error fetching ladder data:', error);
          return;
        }

        setLadderMemberships(memberships || []);
      } catch (error) {
        console.error('Error fetching ladder data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchLadderData();
    }
  }, [user]);

  // Show loading spinner while auth is loading or user is being redirected
  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-6 w-6 text-yellow-500" />;
    if (rank <= 3) return <Trophy className="h-6 w-6 text-amber-500" />;
    return null;
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  // Generate fake players to fill out the ladder
  const generateFakePlayers = (startRank: number, count: number) => {
    return Array.from({ length: count }, (_, index) => ({
      id: `fake-${startRank + index}`,
      user_id: `fake-user-${startRank + index}`,
      ladder_id: 'fake-ladder',
      join_date: new Date().toISOString(),
      current_rank: startRank + index,
      is_active: true,
      winning_streak: 0,
      trend: 'none' as const,
      user: {
        id: `fake-user-${startRank + index}`,
        name: fakePlayerNames[(startRank + index - 1) % fakePlayerNames.length],
        email: `fake${startRank + index}@example.com`,
        created_at: new Date().toISOString(),
      },
      ladder: {
        id: 'fake-ladder',
        name: 'Pickleball Doubles Ladder',
        type: 'competitive' as const,
        sport: 'pickleball',
        fee: 10,
        created_at: new Date().toISOString(),
      }
    }));
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gradient mb-4">
            🏆 Ladder Rankings
          </h1>
          <p className="text-lg text-muted-foreground">
            Current doubles ladder rankings (2.5-4.0 skill level)
          </p>
        </div>

        {/* Ladder Rankings */}
        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <Trophy className="h-6 w-6 mr-2 text-primary" />
                Current Doubles Team Rankings
              </span>
              <Badge className="bg-primary/10 text-primary">
                {ladderMemberships.length + 10} Teams
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Loading ladder...</span>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Real players */}
                {ladderMemberships.map((membership, index) => {
                  const isCurrentUser = membership.user_id === user?.id;
                  return (
                    <div
                      key={membership.id}
                      className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                        isCurrentUser
                          ? 'bg-primary/5 border-primary/20'
                          : 'bg-muted/30 border-border hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2 min-w-[60px]">
                          <span className="text-2xl font-bold text-muted-foreground">
                            #{membership.current_rank || index + 1}
                          </span>
                          {getRankIcon(membership.current_rank || index + 1)}
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            {membership.user.profile_picture_url ? (
                              <img
                                src={membership.user.profile_picture_url}
                                alt={membership.user.name}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <User className="h-5 w-5 text-primary" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">
                              {membership.user.name}
                              {isCurrentUser && (
                                <Badge className="ml-2 bg-primary/20 text-primary">You</Badge>
                              )}
                            </h3>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        {membership.winning_streak > 0 && (
                          <div className="flex items-center space-x-1">
                            <Flame className="h-4 w-4 text-orange-500" />
                            <span className="text-sm font-medium text-orange-600">
                              {membership.winning_streak} win streak
                            </span>
                          </div>
                        )}
                        
                        {membership.trend !== 'none' && (
                          <div className="flex items-center space-x-1">
                            {getTrendIcon(membership.trend)}
                            <span className="text-sm text-muted-foreground capitalize">
                              {membership.trend}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                
                {/* Fake players */}
                {generateFakePlayers(ladderMemberships.length + 1, 10).map((fakePlayer, index) => (
                  <div
                    key={fakePlayer.id}
                    className="flex items-center justify-between p-4 rounded-lg border transition-colors bg-muted/30 border-border hover:bg-muted/50"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2 min-w-[60px]">
                        <span className="text-2xl font-bold text-muted-foreground">
                          #{fakePlayer.current_rank}
                        </span>
                        {getRankIcon(fakePlayer.current_rank)}
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">
                            {fakePlayer.user.name}
                          </h3>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      {/* Fake players look identical to real ones */}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Ladders;