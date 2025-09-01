import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Trophy, Users, TrendingUp, Clock, MapPin, Loader2, Edit, Check, Phone, Eye, ArrowRight, Mail, Flame, User as UserIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, type LadderMembership, type Match, type User, type Ladder } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import LocationPicker from '@/components/LocationPicker';
import { ProfilePictureUpload } from '@/components/ProfilePictureUpload';

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [memberships, setMemberships] = useState<Array<LadderMembership & { ladder: Ladder }>>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<Array<Match & { 
    player1: User; 
    player2: User; 
    player1_rank?: number;
    player2_rank?: number;
  }>>([]);
  const [scoreEntryOpen, setScoreEntryOpen] = useState<string | null>(null);
  const [scoreData, setScoreData] = useState({ score: '', winner: '' });
  const [submittingScore, setSubmittingScore] = useState(false);
  const [userData, setUserData] = useState<User | null>(null);
  const [showLocationSetup, setShowLocationSetup] = useState(false);
  const [locationSetupOpen, setLocationSetupOpen] = useState(false);
  const [tempLocationData, setTempLocationData] = useState({
    latitude: null as number | null,
    longitude: null as number | null,
    locationText: ''
  });
  const [matchStats, setMatchStats] = useState({ wins: 0, losses: 0, total: 0, winRate: 0 });
  const [profilePictureOpen, setProfilePictureOpen] = useState(false);
  const { toast } = useToast();

  // Get match schedule message based on user's ladder
  const getMatchScheduleMessage = () => {
    return 'New matches every Sunday';
  };

  // Handle temporary location change (for dashboard)
  const handleTempLocationChange = (lat: number | null, lng: number | null, radius: number, locationText?: string) => {
    setTempLocationData({
      latitude: lat,
      longitude: lng,
      locationText: locationText || ''
    });
  };

  // Handle profile picture update
  const handleProfilePictureUpdate = (url: string) => {
    if (userData) {
      setUserData({ ...userData, profile_picture_url: url });
    }
  };

  // Handle location update (save to database)
  const handleLocationUpdate = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({
          preferred_latitude: tempLocationData.latitude,
          preferred_longitude: tempLocationData.longitude,
          travel_radius_km: 20,
          location_text: tempLocationData.locationText
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Location updated!",
        description: "Your preferred location has been saved.",
      });

      setShowLocationSetup(false);
      setLocationSetupOpen(false);
      
      // Refresh user data
      fetchDashboardData();
    } catch (error) {
      console.error('Error updating location:', error);
      toast({
        title: "Error updating location",
        description: "Please try again.",
        variant: "destructive"
      });
    }
  };

  // Redirect to sign in if not authenticated (only after auth loading is complete)
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/signin');
    }
  }, [user, authLoading, navigate]);

  const fetchDashboardData = async () => {
    if (!user) return;
    
    try {
      // Fetch user's ladder memberships
      const { data: membershipsData, error: membershipsError } = await supabase
        .from('ladder_memberships')
        .select(`
          *,
          ladder:ladders(*)
        `)
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (membershipsError) throw membershipsError;
      setMemberships(membershipsData || []);

      // Fetch user data to check location information
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (userError) throw userError;
      setUserData(userData);

      // Check if user needs location setup
        setShowLocationSetup((!userData.preferred_latitude || !userData.preferred_longitude) && !userData.location_text);

        // Fetch completed matches for win/loss statistics
        const { data: completedMatchesData, error: completedMatchesError } = await supabase
          .from('matches')
          .select(`
            *,
            player1:users!matches_player1_id_fkey(*),
            player2:users!matches_player2_id_fkey(*)
          `)
          .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
          .eq('status', 'completed');

        if (completedMatchesError) throw completedMatchesError;

        // Calculate win/loss statistics
        let wins = 0;
        let losses = 0;
        
        (completedMatchesData || []).forEach(match => {
          const isPlayer1 = match.player1_id === user.id;
          const playerName = isPlayer1 ? match.player1.name : match.player2.name;
          
          // Check if this player won the match
          if (match.player1_winner_submitted === playerName || match.player2_winner_submitted === playerName) {
            wins++;
          } else {
            losses++;
          }
        });

        const total = wins + losses;
        const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

        setMatchStats({ wins, losses, total, winRate });

              // Fetch upcoming matches for the user
        const { data: matchesData, error: matchesError } = await supabase
          .from('matches')
          .select(`
            *,
            player1:users!matches_player1_id_fkey(*),
            player2:users!matches_player2_id_fkey(*)
          `)
          .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
          .eq('status', 'scheduled')
          .order('week', { ascending: true });

      if (matchesError) throw matchesError;

      // Add player ranks to matches (using first ladder membership for each player)
      const matchesWithRanks = await Promise.all(
        (matchesData || []).map(async (match) => {
          const [player1Rank, player2Rank] = await Promise.all([
            supabase
              .from('ladder_memberships')
              .select('current_rank')
              .eq('user_id', match.player1_id)
              .eq('is_active', true)
              .limit(1)
              .single(),
            supabase
              .from('ladder_memberships')
              .select('current_rank')
              .eq('user_id', match.player2_id)
              .eq('is_active', true)
              .limit(1)
              .single()
          ]);

          return {
            ...match,
            player1_rank: player1Rank.data?.current_rank || 0,
            player2_rank: player2Rank.data?.current_rank || 0
          };
        })
      );

      setUpcomingMatches(matchesWithRanks);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error loading dashboard",
        description: "Please refresh the page and try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchDashboardData();
  }, [user, toast]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge className="bg-accent/10 text-accent-foreground">Scheduled</Badge>;
      case 'completed':
        return <Badge className="bg-success/10 text-success">Completed</Badge>;
      case 'cancelled':
        return <Badge className="bg-destructive/10 text-destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const handleScoreSubmit = async (matchId: string) => {
    if (!scoreData.score || !scoreData.winner) {
      toast({
        title: "Please enter the score and select the winner",
        variant: "destructive"
      });
      return;
    }

    setSubmittingScore(true);

    try {
      const match = upcomingMatches.find(m => m.id === matchId);
      if (!match) throw new Error('Match not found');

      const isPlayer1 = match.player1_id === user?.id;
      const updateData = isPlayer1 
        ? {
            player1_score_string: scoreData.score,
            player1_winner_submitted: scoreData.winner,
            player1_score_submitted_by: user?.id,
            player1_score_submitted_at: new Date().toISOString()
          }
        : {
            player2_score_string: scoreData.score,
            player2_winner_submitted: scoreData.winner,
            player2_score_submitted_by: user?.id,
            player2_score_submitted_at: new Date().toISOString()
          };

      const { error } = await supabase
        .from('matches')
        .update(updateData)
        .eq('id', matchId);

      if (error) throw error;

      toast({
        title: "Score submitted successfully!",
        description: "Your score has been recorded.",
      });

      // Refresh matches data
      fetchDashboardData();
      setScoreEntryOpen(null);
      setScoreData({ score: '', winner: '' });
    } catch (error: any) {
      console.error('Error submitting score:', error);
      toast({
        title: "Error submitting score",
        description: error.message || "Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmittingScore(false);
    }
  };

  const handleScoreConfirmation = async (matchId: string) => {
    setSubmittingScore(true);

    try {
      const match = upcomingMatches.find(m => m.id === matchId);
      if (!match) throw new Error('Match not found');

      const isPlayer1 = match.player1_id === user?.id;
      const otherPlayerSubmittedScore = isPlayer1 
        ? match.player2_score_string 
        : match.player1_score_string;
      const otherPlayerSubmittedWinner = isPlayer1 
        ? match.player2_winner_submitted 
        : match.player1_winner_submitted;

      const updateData = isPlayer1 
        ? {
            player1_score_string: otherPlayerSubmittedScore,
            player1_winner_submitted: otherPlayerSubmittedWinner,
            player1_score_submitted_by: user?.id,
            player1_score_submitted_at: new Date().toISOString()
          }
        : {
            player2_score_string: otherPlayerSubmittedScore,
            player2_winner_submitted: otherPlayerSubmittedWinner,
            player2_score_submitted_by: user?.id,
            player2_score_submitted_at: new Date().toISOString()
          };

      const { error } = await supabase
        .from('matches')
        .update(updateData)
        .eq('id', matchId);

      if (error) throw error;

      toast({
        title: "Score confirmed!",
        description: "You have confirmed the score submitted by your opponent.",
      });

      // Refresh matches data
      fetchDashboardData();
    } catch (error: any) {
      console.error('Error confirming score:', error);
      toast({
        title: "Error confirming score",
        description: error.message || "Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmittingScore(false);
    }
  };

  const getScoreSubmissionStatus = (match: Match & { player1: User; player2: User; player1_rank?: number; player2_rank?: number }) => {
    const hasPlayer1Score = match.player1_score_submitted_by;
    const hasPlayer2Score = match.player2_score_submitted_by;
    
    if (!hasPlayer1Score && !hasPlayer2Score) {
      return { status: 'none', message: 'No scores submitted yet' };
    } else if (hasPlayer1Score && hasPlayer2Score) {
      // Both players submitted - check if they match
      const scoresMatch = match.player1_score_string === match.player2_score_string && 
                         match.player1_winner_submitted === match.player2_winner_submitted;
      
      return { 
        status: 'both', 
        message: scoresMatch ? 'Both players submitted matching scores' : 'Both players submitted scores (may differ)',
        score: match.player1_score_string,
        winner: match.player1_winner_submitted,
        scoresMatch,
        player1Score: match.player1_score_string,
        player1Winner: match.player1_winner_submitted,
        player2Score: match.player2_score_string,
        player2Winner: match.player2_winner_submitted
      };
    } else if (hasPlayer1Score) {
      return { 
        status: 'player1', 
        message: `${match.player1.name} submitted: ${match.player1_score_string} (Winner: ${match.player1_winner_submitted})`,
        score: match.player1_score_string,
        winner: match.player1_winner_submitted,
        submittedBy: match.player1.name
      };
    } else {
      return { 
        status: 'player2', 
        message: `${match.player2.name} submitted: ${match.player2_score_string} (Winner: ${match.player2_winner_submitted})`,
        score: match.player2_score_string,
        winner: match.player2_winner_submitted,
        submittedBy: match.player2.name
      };
    }
  };

  const getOpponentContactInfo = (match: Match & { player1: User; player2: User; player1_rank?: number; player2_rank?: number }) => {
    const isPlayer1 = match.player1_id === user?.id;
    const opponent = isPlayer1 ? match.player2 : match.player1;
    
    // If opponent has a phone number, use it; otherwise use email
    const contactInfo = opponent.phone_number || opponent.email;
    const contactType = opponent.phone_number ? 'Phone' : 'Email';
    
    return {
      name: opponent.name,
      contactInfo,
      contactType
    };
  };

  // Don't render anything if auth is still loading or if not authenticated (will redirect)
  if (authLoading || !user) {
    return null;
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gradient">Welcome, {user?.user_metadata?.name || 'Player'}!</h1>
          <p className="text-muted-foreground mt-2">Your pickleball ladder dashboard</p>
        </div>



        {/* 1. Profile & Stats Section - First Priority */}
        <Card className="card-premium mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserIcon className="h-6 w-6 mr-2 text-primary" />
              Your Profile & Statistics
            </CardTitle>
            <CardDescription>
              Your profile information, ladder positions, and match performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Profile Section */}
              <div className="lg:col-span-1">
                <div className="text-center mb-6">
                  <div className="relative inline-block">
                    <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mx-auto mb-4 overflow-hidden">
                      {userData?.profile_picture_url ? (
                        <img 
                          src={userData.profile_picture_url} 
                          alt="Profile" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <UserIcon className="h-12 w-12 text-muted-foreground" />
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute bottom-0 right-0 rounded-full w-8 h-8 p-0"
                      onClick={() => setProfilePictureOpen(true)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                  <h3 className="text-xl font-semibold">{userData?.name || user?.user_metadata?.name}</h3>
                  <p className="text-sm text-muted-foreground">{userData?.email}</p>
                  
                  {/* Location Button */}
                  <div className="mt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setLocationSetupOpen(true)}
                      className="w-full"
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      {userData?.location_text || (userData?.preferred_latitude && userData?.preferred_longitude) 
                        ? 'Change Location' 
                        : 'Add Location'}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Ladder Rankings */}
              <div className="lg:col-span-1">
                <h3 className="font-semibold mb-4 flex items-center">
                  <Trophy className="h-4 w-4 mr-2 text-primary" />
                  Ladder Positions
                </h3>
                {memberships.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">You're not in any ladders yet</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Contact an administrator to join a ladder
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {memberships.map((membership) => (
                      <div key={membership.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                            #{membership.current_rank || 'N/A'}
                          </div>
                          <div>
                            <p className="font-semibold">{membership.ladder.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Pickleball Ladder
                            </p>
                            {/* Streak */}
                            {membership.winning_streak > 0 && (
                              <div className="flex items-center space-x-1 mt-1">
                                <Flame className="h-3 w-3 text-orange-500" />
                                <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                                  {membership.winning_streak} win streak
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate('/ladders')}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </div>
                    ))}
                    
                    {/* Join Another Ladder Button */}
                    <div className="mt-4">
                      <Button
                        variant="outline"
                        onClick={() => navigate('/join-additional')}
                        className="w-full"
                      >
                        <ArrowRight className="h-4 w-4 mr-2" />
                        Join Another Ladder
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Match Statistics */}
              <div className="lg:col-span-1">
                <h3 className="font-semibold mb-4 flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2 text-blue-600" />
                  Match Performance
                </h3>
                {matchStats.total > 0 ? (
                  <div className="space-y-4">
                    {/* Win/Loss Counts */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{matchStats.wins}</div>
                        <div className="text-sm text-blue-600 font-medium">Wins</div>
                      </div>
                      <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">{matchStats.losses}</div>
                        <div className="text-sm text-red-600 font-medium">Losses</div>
                      </div>
                    </div>

                    {/* Win/Loss Ratio Bar */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Win/Loss Ratio</span>
                        <span className="text-sm text-muted-foreground">
                          {matchStats.wins}:{matchStats.losses}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${matchStats.winRate}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 text-center">
                        {matchStats.total} total matches
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No completed matches yet</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Complete some matches to see your statistics
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. Upcoming Matches */}
        <Card className="card-premium mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
            <CardTitle className="flex items-center">
              <Calendar className="h-6 w-6 mr-2 text-accent" />
              Upcoming Matches
            </CardTitle>
            <CardDescription>
              Your scheduled matches
            </CardDescription>
              </div>
              <Button 
                variant="outline" 
                onClick={() => navigate('/rules')}
                className="flex items-center"
              >
                <Trophy className="h-4 w-4 mr-2" />
                View Rules
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingMatches.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No upcoming matches</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {getMatchScheduleMessage()}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingMatches.map((match) => {
                  const scoreStatus = getScoreSubmissionStatus(match);
                  const hasUserSubmitted = (match.player1_id === user?.id && match.player1_score_submitted_by) ||
                                         (match.player2_id === user?.id && match.player2_score_submitted_by);
                  
                  return (
                    <div key={match.id} className="p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">Week {match.week}</Badge>
                          {getStatusBadge(match.status)}
                        </div>

                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="text-center flex-1">
                          <div className="flex items-center justify-center space-x-2">
                            <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                              #{match.player1_rank}
                            </span>
                            <span className={`font-semibold ${match.player1_id === user?.id ? 'text-primary' : ''}`}>
                              {match.player1.name}
                            </span>
                          </div>
                        </div>
                        
                        <div className="mx-4 text-muted-foreground font-bold">VS</div>
                        
                        <div className="text-center flex-1">
                          <div className="flex items-center justify-center space-x-2">
                            <span className={`font-semibold ${match.player2_id === user?.id ? 'text-primary' : ''}`}>
                              {match.player2.name}
                            </span>
                            <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                              #{match.player2_rank}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Contact Information */}
                      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                              Contact {getOpponentContactInfo(match).name}
                            </p>
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                              {getOpponentContactInfo(match).contactType}: {getOpponentContactInfo(match).contactInfo}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Score Status */}
                      <div className="mt-3 p-3 bg-background/50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm text-muted-foreground">
                              {scoreStatus.message}
                            </p>
                            {scoreStatus.status === 'both' && scoreStatus.scoresMatch && (
                              <p className="text-sm font-medium mt-1 text-blue-600 dark:text-blue-400">
                                ✅ Score: {scoreStatus.score} | Winner: {scoreStatus.winner}
                              </p>
                            )}
                            {scoreStatus.status === 'both' && !scoreStatus.scoresMatch && (
                              <div className="mt-2 space-y-1">
                                <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
                                  ⚠️ Scores differ - Admin review needed
                                </p>
                                <div className="text-xs space-y-1">
                                  <p><strong>{match.player1.name}:</strong> {scoreStatus.player1Score} (Winner: {scoreStatus.player1Winner})</p>
                                  <p><strong>{match.player2.name}:</strong> {scoreStatus.player2Score} (Winner: {scoreStatus.player2Winner})</p>
                                </div>
                              </div>
                            )}
                            {(scoreStatus.status === 'player1' || scoreStatus.status === 'player2') && (
                              <p className="text-sm font-medium mt-1">
                                Score: {scoreStatus.score} | Winner: {scoreStatus.winner}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {!hasUserSubmitted && scoreStatus.status === 'none' && (
                              <Dialog open={scoreEntryOpen === match.id} onOpenChange={(open) => {
                                setScoreEntryOpen(open ? match.id : null);
                                if (!open) setScoreData({ score: '', winner: '' });
                              }}>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="outline">
                                    <Edit className="h-4 w-4 mr-1" />
                                    Enter Score
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Enter Match Score</DialogTitle>
                                    <DialogDescription>
                                      Enter the final score for your match against {match.player1_id === user?.id ? match.player2.name : match.player1.name}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div className="space-y-2">
                                      <Label htmlFor="score">Match Score</Label>
                                      <Input
                                        id="score"
                                        type="text"
                                        placeholder="e.g., 6-4, 7-5, 6-2 or 7-6(5), 6-2 or retired"
                                        value={scoreData.score}
                                        onChange={(e) => setScoreData(prev => ({ ...prev, score: e.target.value }))}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="winner">Winner</Label>
                                      <select
                                        id="winner"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={scoreData.winner}
                                        onChange={(e) => setScoreData(prev => ({ ...prev, winner: e.target.value }))}
                                      >
                                        <option value="">Select winner</option>
                                        <option value={match.player1.name}>{match.player1.name}</option>
                                        <option value={match.player2.name}>{match.player2.name}</option>
                                      </select>
                                    </div>
                                    <Button 
                                      onClick={() => handleScoreSubmit(match.id)}
                                      disabled={submittingScore}
                                      className="w-full"
                                    >
                                      {submittingScore ? (
                                        <>
                                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                          Submitting...
                                        </>
                                      ) : (
                                        <>
                                          <Check className="mr-2 h-4 w-4" />
                                          Submit Score
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            )}

                            {!hasUserSubmitted && (scoreStatus.status === 'player1' || scoreStatus.status === 'player2') && (
                              <div className="flex flex-col space-y-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleScoreConfirmation(match.id)}
                                  disabled={submittingScore}
                                >
                                  {submittingScore ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Check className="h-4 w-4 mr-1" />
                                  )}
                                  Confirm Score
                                </Button>
                                <Dialog open={scoreEntryOpen === match.id} onOpenChange={(open) => {
                                  setScoreEntryOpen(open ? match.id : null);
                                  if (!open) setScoreData({ score: '', winner: '' });
                                }}>
                                  <DialogTrigger asChild>
                                    <Button size="sm" variant="outline">
                                      <Edit className="h-4 w-4 mr-1" />
                                      Enter Different Score
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Enter Different Score</DialogTitle>
                                      <DialogDescription>
                                        Your opponent submitted: {scoreStatus.score} (Winner: {scoreStatus.winner}). 
                                        If this is incorrect, enter the correct score below.
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <div className="space-y-2">
                                        <Label htmlFor="score">Match Score</Label>
                                        <Input
                                          id="score"
                                          type="text"
                                          placeholder="e.g., 6-4, 7-5, 6-2 or 7-6(5), 6-2 or retired"
                                          value={scoreData.score}
                                          onChange={(e) => setScoreData(prev => ({ ...prev, score: e.target.value }))}
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label htmlFor="winner">Winner</Label>
                                        <select
                                          id="winner"
                                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                          value={scoreData.winner}
                                          onChange={(e) => setScoreData(prev => ({ ...prev, winner: e.target.value }))}
                                        >
                                          <option value="">Select winner</option>
                                          <option value={match.player1.name}>{match.player1.name}</option>
                                          <option value={match.player2.name}>{match.player2.name}</option>
                                        </select>
                                      </div>
                                      <Button 
                                        onClick={() => handleScoreSubmit(match.id)}
                                        disabled={submittingScore}
                                        className="w-full"
                                      >
                                        {submittingScore ? (
                                          <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Submitting...
                                          </>
                                        ) : (
                                          <>
                                            <Check className="mr-2 h-4 w-4" />
                                            Submit Different Score
                                          </>
                                        )}
                                      </Button>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            )}
                            
                            {hasUserSubmitted && (
                              <Badge className="bg-success/10 text-success">
                                <Check className="h-4 w-4 mr-1" />
                                Score Submitted
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Location Reminder Card - Show if user doesn't have location set */}
        {(!userData?.location_text && (!userData?.preferred_latitude || !userData?.preferred_longitude)) && (
          <Card className="card-premium mb-8 border-orange-200 dark:border-orange-800">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3 p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <MapPin className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                <div className="flex-1">
                  <h3 className="font-semibold text-orange-900 dark:text-orange-100">
                    Add Your Location
                  </h3>
                  <p className="text-sm text-orange-700 dark:text-orange-300 mb-3">
                    Setting your location helps us match you with nearby players for better game coordination.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setLocationSetupOpen(true)}
                    className="border-orange-300 text-orange-700 hover:bg-orange-100 dark:border-orange-600 dark:text-orange-300 dark:hover:bg-orange-900/30"
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    Add Location
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 2. Contact Information for Match Conflicts */}
        <Card className="card-premium mb-8">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                  Having trouble scheduling a match?
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Contact us at <strong>vancouverpickleballsmash@gmail.com</strong> if you need help resolving scheduling conflicts with your opponent.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location Setup Dialog - Available from profile section */}
        <Dialog open={locationSetupOpen} onOpenChange={(open) => {
          setLocationSetupOpen(open);
          if (open) {
            setTempLocationData({
              latitude: userData?.preferred_latitude || null,
              longitude: userData?.preferred_longitude || null,
              locationText: userData?.location_text || ''
            });
          }
        }}>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
              <DialogTitle>Update Your Preferred Location</DialogTitle>
                      <DialogDescription>
                Choose either your current location or select a general location to help match you with nearby players.
                      </DialogDescription>
                    </DialogHeader>
                    <LocationPicker
                      latitude={userData?.preferred_latitude}
                      longitude={userData?.preferred_longitude}
              locationText={userData?.location_text}
              onLocationChange={handleTempLocationChange}
            />
            <div className="flex justify-end space-x-2 pt-4">
                    <Button 
                      variant="outline" 
                onClick={() => setLocationSetupOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleLocationUpdate}
                disabled={!tempLocationData.latitude && !tempLocationData.longitude && !tempLocationData.locationText}
              >
                Save Location
                    </Button>
                  </div>
          </DialogContent>
        </Dialog>



        {/* 4. How It Works Section - Other Stuff */}
        <section className="py-20 bg-muted/30 mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4 text-gradient">How It Works</h2>
                          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Join Vancouver's premier pickleball ladder system designed for players of all skill levels.
            </p>
            </div>
            
            {/* Ladder Overview */}
            <div className="flex justify-center mb-16">
              <Card className="card-premium text-center">
                <CardHeader>
                  <div className="mx-auto mb-4 p-4 bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center">
                    <Trophy className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Pickleball Ladder</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    For players of all levels (2.5-4.0 skill level) looking to improve their game.
                  </CardDescription>
                </CardContent>
              </Card>

            </div>

            {/* Weekly Match System */}
            <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
              <div>
                <h3 className="text-2xl font-bold mb-4">Weekly Match System</h3>
                <p className="text-lg text-muted-foreground mb-6">
                  Every week, you'll receive 1-2 match assignments against players near your ranking. 
                  Win to climb the ladder, lose and you'll have a chance to bounce back next week.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                    <span>Players coordinate and schedule their own matches</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                    <span>Flexible scheduling with your opponent</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                    <span>Fair ranking system based on match results</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                    <span>Track your progress and see your improvement</span>
                  </li>
                </ul>
              </div>
              <Card className="card-premium">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Calendar className="h-16 w-16 text-primary mx-auto mb-4" />
                    <h4 className="text-xl font-semibold mb-2">Season Timeline</h4>
                    <p className="text-muted-foreground mb-4">
                      Current season starts <span className="font-semibold text-primary">September 1st</span> and ends <span className="font-semibold text-primary">October 1st, 2025</span>
                    </p>
                    <Badge className="bg-accent/10 text-accent-foreground">
                      Events & Prizes Coming Soon
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Call to Action */}
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-4">Need Help?</h3>
              <p className="text-lg text-muted-foreground mb-8">
                Questions about the ladder system or need assistance? We're here to help!
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                <Button variant="outline" className="group">
                  <Mail className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                  vancouverpickleballsmash@gmail.com
                </Button>
              </div>
              
              <p className="text-muted-foreground">
                Questions? Email us anytime - we typically respond within 24 hours.
              </p>
            </div>
          </div>
        </section>

        {/* Profile Picture Upload Dialog */}
        <ProfilePictureUpload
          open={profilePictureOpen}
          onOpenChange={setProfilePictureOpen}
          currentPictureUrl={userData?.profile_picture_url}
          onPictureUpdate={handleProfilePictureUpdate}
        />
      </div>
    </div>
  );
};

export default Dashboard; 