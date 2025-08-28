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

  // Redirect to sign in if not authenticated (only after auth loading is complete)
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/signin');
    }
  }, [user, authLoading, navigate]);

  // Fetch ladders and memberships
  useEffect(() => {
    if (!user) return; // Don't fetch data if user is not authenticated
    
    const fetchLadderData = async () => {
      try {
        // Fetch all ladders
        const { data: laddersData, error: laddersError } = await supabase
          .from('ladders')
          .select('*')
          .eq('sport', 'pickleball')
          .order('name');

        if (laddersError) throw laddersError;

        setLadders(laddersData || []);
        
        // Fetch ladder memberships with user and ladder data
        const { data: membershipsData, error: membershipsError } = await supabase
          .from('ladder_memberships')
          .select(`
            *,
            user:users(*),
            ladder:ladders(*)
          `)
          .eq('is_active', true)
          .order('current_rank', { ascending: true });

        if (membershipsError) throw membershipsError;

        setLadderMemberships(membershipsData || []);

        // Find the ladders that the current user is in
        const userMemberships = membershipsData?.filter(membership => membership.user_id === user.id) || [];
        
        // Set the user's first ladder as selected, or first ladder if user is not in any ladder
        if (laddersData && laddersData.length > 0 && !selectedLadder) {
          if (userMemberships.length > 0) {
            setSelectedLadder(userMemberships[0].ladder_id);
          } else {
            setSelectedLadder(laddersData[0].id);
          }
        }

        // Fetch announcements
        const { data: announcementsData, error: announcementsError } = await supabase
          .from('announcements')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (announcementsError) throw announcementsError;

        setAnnouncements(announcementsData || []);
      } catch (error) {
        console.error('Error fetching ladder data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLadderData();
  }, [selectedLadder, user]);

  // Show loading spinner while auth is loading or user is being redirected
  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Hardcoded fake women names
  const getFakeWomenNames = () => {
    return [
      'Sarah Johnson',
      'Emily Williams', 
      'Jessica Brown',
      'Amanda Jones',
      'Melissa Garcia'
    ];
  };

  // Get players for selected ladder
  const getPlayersForLadder = (ladderId: string) => {
    const realPlayers = ladderMemberships
      .filter(membership => membership.ladder_id === ladderId)
      .map(membership => ({
        rank: membership.current_rank || 0,
        name: membership.user.name,
        user: membership.user, // Include the full user object for profile picture
        record: "0-0", // TODO: Calculate from matches
        streak: membership.winning_streak,
        trend: membership.trend,
        isReal: true
      }))
      .sort((a, b) => a.rank - b.rank);

    // Check if this is the women's ladder
    const selectedLadderData = ladders.find(l => l.id === ladderId);
    if (selectedLadderData?.type === 'women') {
      const fakeNames = getFakeWomenNames();
      const fakePlayers = fakeNames.map((name, index) => ({
        rank: realPlayers.length + index + 1,
        name: name,
        user: null, // No user object for fake players
        record: "0-0",
        streak: 0,
        trend: 'none' as const,
        isReal: false
      }));
      
      return [...realPlayers, ...fakePlayers];
    }

    return realPlayers;
  };

  // Get ladder stats
  const getLadderStats = (ladderId: string) => {
    const players = getPlayersForLadder(ladderId);
    return {
      activePlayers: players.length,
      matchesPlayed: 0, // TODO: Calculate from matches
      completionRate: 0 // TODO: Calculate from matches
    };
  };

  // Get announcements for a specific ladder
  const getAnnouncementsForLadder = (ladderId: string) => {
    return announcements.filter(announcement => 
      announcement.ladder_id === ladderId || !announcement.ladder_id // Include global announcements
    );
  };

  // Calculate player stats from completed matches
  const calculatePlayerStats = async (userId: string) => {
    try {
      console.log('Calculating stats for user:', userId);
      
      // Fetch all completed matches for this player
      const { data: matches, error } = await supabase
        .from('matches')
        .select(`
          *,
          player1:users!matches_player1_id_fkey(*),
          player2:users!matches_player2_id_fkey(*)
        `)
        .eq('status', 'completed')
        .or(`player1_id.eq.${userId},player2_id.eq.${userId}`);

      if (error) throw error;

      console.log('Found matches for user:', matches);

      let wins = 0;
      let losses = 0;

      matches?.forEach((match: Match & { player1: User; player2: User }) => {
        const isPlayer1 = match.player1_id === userId;
        const playerName = isPlayer1 ? match.player1.name : match.player2.name;
        
        console.log('Processing match:', {
          matchId: match.id,
          player1Id: match.player1_id,
          player2Id: match.player2_id,
          targetUserId: userId,
          player1Name: match.player1.name,
          player2Name: match.player2.name,
          isPlayer1,
          playerName,
          winnerSubmitted: match.player1_winner_submitted
        });
        
        // Check if this player won the match (same logic as Dashboard)
        if (match.player1_winner_submitted === playerName || match.player2_winner_submitted === playerName) {
          wins++;
          console.log('User won');
        } else {
          losses++;
          console.log('User lost');
        }
      });

      const total = wins + losses;
      const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

      console.log('Final stats:', { wins, losses, total, winRate });

      return { wins, losses, total, winRate };
    } catch (error) {
      console.error('Error calculating player stats:', error);
      return { wins: 0, losses: 0, total: 0, winRate: 0 };
    }
  };

  // Handle player click to show stats
  const handlePlayerClick = async (player: any) => {
    if (!player.user || !player.isReal) return; // Don't show stats for fake players
    
    console.log('Clicked player:', {
      playerName: player.name,
      userId: player.user.id,
      isReal: player.isReal,
      currentLadder: selectedLadder
    });
    
    // Find the membership for this player in the current ladder
    const membership = ladderMemberships.find(m => m.user_id === player.user.id && m.ladder_id === selectedLadder);
    if (!membership) return;

    const stats = await calculatePlayerStats(player.user.id);
    
    setSelectedPlayer({
      user: player.user,
      membership,
      stats
    });
    setPlayerStatsOpen(true);
  };

  const getStreakIcon = (streakType: string) => {
    switch (streakType) {
      case 'win':
        return <TrendingUp className="h-4 w-4 text-success" />;
      case 'loss':
        return <TrendingDown className="h-4 w-4 text-destructive" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStreakColor = (streakType: string) => {
    switch (streakType) {
      case 'win':
        return 'bg-success/10 text-success border-success/20';
      case 'loss':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) {
      return <Crown className="h-5 w-5 text-tennis-gold" />;
    } else if (rank <= 3) {
      return <Trophy className="h-5 w-5 text-accent" />;
    }
    return null;
  };

  const PlayerRow = ({ player, ladderType }: { player: any; ladderType: string }) => {
    const isCurrentUser = player.user && player.user.id === user?.id;
    
    return (
      <Card 
        className={`card-premium ${player.rank === 1 ? 'ring-2 ring-tennis-gold/50' : ''} ${player.isReal ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''} ${
          isCurrentUser ? 'ring-2 ring-primary/30 bg-primary/5 border-primary/20' : ''
        }`}
        onClick={() => player.isReal && handlePlayerClick(player)}
      >
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Profile Picture with Rank Badge */}
            <div className="relative">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                {player.user && player.user.profile_picture_url ? (
                  <img 
                    src={player.user.profile_picture_url} 
                    alt={`${player.name}'s profile`} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="h-6 w-6 sm:h-7 sm:w-7 text-muted-foreground" />
                )}
              </div>
              
              {/* Crown for 1st place */}
              {player.rank === 1 && (
                <div className="absolute -top-1 -right-1 w-6 h-6 sm:w-7 sm:h-7 bg-tennis-gold rounded-full flex items-center justify-center shadow-lg">
                  <Crown className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                </div>
              )}
              
              {/* Rank Badge for other positions */}
              {player.rank > 1 && (
                <div className={`absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold shadow-lg ${
                  player.rank <= 3 
                    ? 'bg-accent text-accent-foreground' 
                    : 'bg-secondary text-secondary-foreground'
                }`}>
                  {player.rank}
                </div>
              )}
            </div>
            
            {/* Player Info */}
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-base sm:text-lg">
                  {player.name}
                </h3>
                {isCurrentUser && (
                  <Badge className="bg-primary text-primary-foreground text-xs font-medium">
                    You
                  </Badge>
                )}
                {getRankIcon(player.rank)}
              </div>
            </div>
          </div>

          {/* Streak and Trend - Only show for real players */}
          {player.isReal && (
            <div className="flex items-center space-x-3">
              {/* Streak */}
              {player.streak > 0 && (
                <div className="flex items-center space-x-1 bg-orange-100 dark:bg-orange-900/20 px-3 py-2 rounded-full">
                  <Flame className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  <span className="text-base font-bold text-orange-700 dark:text-orange-300">
                    {player.streak}
                  </span>
                </div>
              )}
              
              {/* Trend */}
              {player.trend === 'up' && (
                <div className="flex items-center justify-center bg-green-100 dark:bg-green-900/20 w-8 h-8 rounded-full">
                  <ArrowUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
              )}
              {player.trend === 'down' && (
                <div className="flex items-center justify-center bg-red-100 dark:bg-red-900/20 w-8 h-8 rounded-full">
                  <ArrowDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
    );
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12 mt-8">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 md:mb-8 text-gradient">Ladder Rankings</h1>
        </div>

        {/* Ladder Selection */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="mb-8">
            <Tabs value={selectedLadder} onValueChange={setSelectedLadder} className="w-full transition-all duration-300 ease-in-out">
              <TabsList className="flex w-full h-auto mb-8 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 p-2 rounded-xl overflow-x-auto shadow-lg relative">
                {ladders.map((ladder) => (
                  <TabsTrigger 
                    key={ladder.id} 
                    value={ladder.id} 
                    className="flex-1 min-w-0 text-sm sm:text-base font-semibold py-3 px-3 sm:px-4 md:px-5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=inactive]:text-gray-600 dark:data-[state=inactive]:text-gray-300 data-[state=inactive]:hover:bg-gray-100 dark:data-[state=inactive]:hover:bg-gray-700 whitespace-nowrap rounded-lg transition-all duration-300 ease-in-out relative z-10"
                  >
                    {ladder.name}
                  </TabsTrigger>
                ))}
              </TabsList>

            {ladders.map((ladder) => {
              const players = getPlayersForLadder(ladder.id);
              const ladderAnnouncements = getAnnouncementsForLadder(ladder.id);
              return (
                <TabsContent key={ladder.id} value={ladder.id} className="transition-all duration-500 ease-in-out">
                  <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
                    {/* Announcements Section - Hidden for now */}
                    {/* {ladderAnnouncements.length > 0 && (
                      <Card className="card-premium">
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <Megaphone className="h-5 w-5 mr-2 text-blue-600" />
                            Announcements
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {ladderAnnouncements.map((announcement) => (
                              <div key={announcement.id} className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                                      {announcement.title}
                                    </h4>
                                    <p className="text-blue-700 dark:text-blue-300 text-sm">
                                      {announcement.message}
                                    </p>
                                  </div>
                                  <Badge variant="outline" className="text-xs">
                                    {announcement.ladder_id ? ladder.name : 'Global'}
                                  </Badge>
                                </div>
                                <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                                  {new Date(announcement.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )} */}

                    {/* Rankings Section */}
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4 sm:mb-6">
                      <div className="flex items-center space-x-4">
                        <h2 className="text-xl sm:text-2xl font-bold">{ladder.name} Rankings</h2>
                        <Badge className="bg-primary/10 text-primary">
                          {players.length} Players
                        </Badge>
                      </div>
                      

                    </div>
                    
                    {players.length === 0 ? (
                      <Card className="card-premium">
                        <CardContent className="py-12 text-center">
                          <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-lg font-semibold mb-2">No Players Yet</h3>
                          <p className="text-muted-foreground">
                            Be the first to join this ladder!
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                      players.map((player) => (
                        <PlayerRow key={player.rank} player={player} ladderType={ladder.name} />
                      ))
                    )}
                    </div>
                  </div>
                </TabsContent>
              );
            })}
            </Tabs>
          </div>
        )}

        {/* Player Stats Dialog */}
        <Dialog open={playerStatsOpen} onOpenChange={setPlayerStatsOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Player Statistics</DialogTitle>
            </DialogHeader>
            
            {selectedPlayer && (
              <div className="space-y-6">
                {/* Player Info */}
                <div className="text-center">
                  <div className="relative inline-block mb-4">
                    <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto overflow-hidden">
                      {selectedPlayer.user.profile_picture_url ? (
                        <img 
                          src={selectedPlayer.user.profile_picture_url} 
                          alt={`${selectedPlayer.user.name}'s profile`} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="h-10 w-10 text-muted-foreground" />
                      )}
                    </div>
                    
                    {/* Rank Badge */}
                    {selectedPlayer.membership.current_rank === 1 ? (
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-tennis-gold rounded-full flex items-center justify-center shadow-lg">
                        <Crown className="h-3 w-3 text-white" />
                      </div>
                    ) : (
                      <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shadow-lg ${
                        selectedPlayer.membership.current_rank <= 3 
                          ? 'bg-accent text-accent-foreground' 
                          : 'bg-secondary text-secondary-foreground'
                      }`}>
                        {selectedPlayer.membership.current_rank}
                      </div>
                    )}
                  </div>
                  
                  <h3 className="text-xl font-semibold">{selectedPlayer.user.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedPlayer.membership.ladder.name}</p>
                  
                  {/* Streak */}
                  {selectedPlayer.membership.winning_streak > 0 && (
                    <div className="flex items-center justify-center space-x-1 mt-2">
                      <Flame className="h-4 w-4 text-orange-500" />
                      <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                        {selectedPlayer.membership.winning_streak} win streak
                      </span>
                    </div>
                  )}
                </div>

                {/* Match Statistics */}
                <div>
                  <h4 className="font-semibold mb-4 text-center">Match Performance</h4>
                  {selectedPlayer.stats.total > 0 ? (
                    <div className="space-y-4">
                      {/* Win/Loss Counts */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">{selectedPlayer.stats.wins}</div>
                          <div className="text-sm text-green-600 font-medium">Wins</div>
                        </div>
                        <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                          <div className="text-2xl font-bold text-red-600">{selectedPlayer.stats.losses}</div>
                          <div className="text-sm text-red-600 font-medium">Losses</div>
                        </div>
                      </div>

                      {/* Win/Loss Ratio Bar */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Win/Loss Ratio</span>
                          <span className="text-sm text-muted-foreground">
                            {selectedPlayer.stats.wins}:{selectedPlayer.stats.losses}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${selectedPlayer.stats.winRate}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 text-center">
                          {selectedPlayer.stats.total} total matches
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No completed matches yet</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Complete some matches to see statistics
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
};

export default Ladders;