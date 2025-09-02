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
import { supabase, type PickleballLadderMembership, type PickleballMatch, type PickleballMatchWithPlayers, type User, type PickleballLadder, getTeamForUser, getPartnerForUser, getOpposingTeam } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import LocationPicker from '@/components/LocationPicker';
import { ProfilePictureUpload } from '@/components/ProfilePictureUpload';

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [memberships, setMemberships] = useState<Array<PickleballLadderMembership & { ladder: PickleballLadder }>>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<PickleballMatchWithPlayers[]>([]);
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
    return 'New doubles matches every Sunday';
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
        .from('pickleball_ladder_memberships')
        .select(`
          *,
          ladder:pickleball_ladders(*)
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
          .from('pickleball_matches')
          .select(`
            *,
            team1_player1:users!pickleball_matches_team1_player1_id_fkey(*),
            team1_player2:users!pickleball_matches_team1_player2_id_fkey(*),
            team2_player1:users!pickleball_matches_team2_player1_id_fkey(*),
            team2_player2:users!pickleball_matches_team2_player2_id_fkey(*)
          `)
          .or(`team1_player1_id.eq.${user.id},team1_player2_id.eq.${user.id},team2_player1_id.eq.${user.id},team2_player2_id.eq.${user.id}`)
          .eq('status', 'completed');

        if (completedMatchesError) throw completedMatchesError;

        // Calculate win/loss statistics for doubles matches
        let wins = 0;
        let losses = 0;
        
        (completedMatchesData || []).forEach(match => {
          // Determine which team the user was on
          const userTeam = getTeamForUser(match as PickleballMatchWithPlayers, user.id);
          
          if (userTeam && match.team1_winner_submitted && match.team2_winner_submitted) {
            // Both teams have submitted winner - check if they agree
            if (match.team1_winner_submitted === match.team2_winner_submitted) {
              // Teams agree on winner
              const winner = match.team1_winner_submitted;
              if (winner === userTeam) {
                wins++;
              } else {
                losses++;
              }
            }
            // If teams disagree, don't count this match in statistics yet
          }
        });

        const total = wins + losses;
        const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

        setMatchStats({ wins, losses, total, winRate });

              // Fetch upcoming matches for the user
        const { data: matchesData, error: matchesError } = await supabase
          .from('pickleball_matches')
          .select(`
            *,
            team1_player1:users!pickleball_matches_team1_player1_id_fkey(*),
            team1_player2:users!pickleball_matches_team1_player2_id_fkey(*),
            team2_player1:users!pickleball_matches_team2_player1_id_fkey(*),
            team2_player2:users!pickleball_matches_team2_player2_id_fkey(*)
          `)
          .or(`team1_player1_id.eq.${user.id},team1_player2_id.eq.${user.id},team2_player1_id.eq.${user.id},team2_player2_id.eq.${user.id}`)
          .eq('status', 'scheduled')
          .order('week', { ascending: true });

      if (matchesError) throw matchesError;

      // For doubles, we'll just set the matches directly without individual ranks
      // Individual player ranks are less important in doubles - team dynamics matter more
      setUpcomingMatches(matchesData || []);
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

      // Determine which team the user is on
      const userTeam = getTeamForUser(match, user?.id || '');
      if (!userTeam) throw new Error('User not found in this match');

      const updateData = userTeam === 'team1' 
        ? {
            team1_score: scoreData.score,
            team1_winner_submitted: scoreData.winner,
            team1_score_submitted_by: user?.id,
            team1_score_submitted_at: new Date().toISOString()
          }
        : {
            team2_score: scoreData.score,
            team2_winner_submitted: scoreData.winner,
            team2_score_submitted_by: user?.id,
            team2_score_submitted_at: new Date().toISOString()
          };

      const { error } = await supabase
        .from('pickleball_matches')
        .update(updateData)
        .eq('id', matchId);

      if (error) throw error;

      toast({
        title: "Score submitted successfully!",
        description: "Your team's score has been recorded.",
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

      // Determine which team the user is on
      const userTeam = getTeamForUser(match, user?.id || '');
      if (!userTeam) throw new Error('User not found in this match');

      const otherTeamSubmittedScore = userTeam === 'team1' 
        ? match.team2_score 
        : match.team1_score;
      const otherTeamSubmittedWinner = userTeam === 'team1' 
        ? match.team2_winner_submitted 
        : match.team1_winner_submitted;

      const updateData = userTeam === 'team1' 
        ? {
            team1_score: otherTeamSubmittedScore,
            team1_winner_submitted: otherTeamSubmittedWinner,
            team1_score_submitted_by: user?.id,
            team1_score_submitted_at: new Date().toISOString()
          }
        : {
            team2_score: otherTeamSubmittedScore,
            team2_winner_submitted: otherTeamSubmittedWinner,
            team2_score_submitted_by: user?.id,
            team2_score_submitted_at: new Date().toISOString()
          };

      const { error } = await supabase
        .from('pickleball_matches')
        .update(updateData)
        .eq('id', matchId);

      if (error) throw error;

      toast({
        title: "Score confirmed!",
        description: "You have confirmed the score submitted by the opposing team.",
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

  const getScoreSubmissionStatus = (match: PickleballMatchWithPlayers) => {
    const hasTeam1Score = match.team1_score_submitted_by;
    const hasTeam2Score = match.team2_score_submitted_by;
    
    if (!hasTeam1Score && !hasTeam2Score) {
      return { status: 'none', message: 'No scores submitted yet' };
    } else if (hasTeam1Score && hasTeam2Score) {
      // Both teams submitted - check if they match
      const scoresMatch = match.team1_score === match.team2_score && 
                         match.team1_winner_submitted === match.team2_winner_submitted;
      
      return { 
        status: 'both', 
        message: scoresMatch ? 'Both teams submitted matching scores' : 'Both teams submitted scores (may differ)',
        score: match.team1_score,
        winner: match.team1_winner_submitted,
        scoresMatch,
        team1Score: match.team1_score,
        team1Winner: match.team1_winner_submitted,
        team2Score: match.team2_score,
        team2Winner: match.team2_winner_submitted
      };
    } else if (hasTeam1Score) {
      return { 
        status: 'team1', 
        message: `Team 1 submitted: ${match.team1_score} (Winner: ${match.team1_winner_submitted})`,
        score: match.team1_score,
        winner: match.team1_winner_submitted,
        submittedBy: 'Team 1'
      };
    } else {
      return { 
        status: 'team2', 
        message: `Team 2 submitted: ${match.team2_score} (Winner: ${match.team2_winner_submitted})`,
        score: match.team2_score,
        winner: match.team2_winner_submitted,
        submittedBy: 'Team 2'
      };
    }
  };

  // Helper function to get opposing team contact info for doubles
  const getOpposingTeamContacts = (match: PickleballMatchWithPlayers) => {
    const opposingTeam = getOpposingTeam(match, user?.id || '');
    return opposingTeam.map(player => ({
      name: player.name,
      phone: player.phone_number,
      email: player.email,
      contactInfo: player.phone_number || player.email,
      contactType: player.phone_number ? 'Phone' : 'Email'
    }));
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
                            {/* Score and Streak */}
                            <div className="flex items-center space-x-4 mt-1">
                              <div className="flex items-center space-x-1">
                                <Trophy className="h-3 w-3 text-primary" />
                                <span className="text-xs font-semibold text-primary">
                                  {membership.score || 100} points
                                </span>
                              </div>
                              {membership.winning_streak > 0 && (
                                <div className="flex items-center space-x-1">
                                  <Flame className="h-3 w-3 text-orange-500" />
                                  <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                                    {membership.winning_streak} win streak
                                  </span>
                                </div>
                              )}
                            </div>
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
                  const userTeam = getTeamForUser(match, user?.id || '');
                  const partner = getPartnerForUser(match, user?.id || '');
                  const opposingTeamContacts = getOpposingTeamContacts(match);
                  const hasUserTeamSubmitted = (userTeam === 'team1' && match.team1_score_submitted_by) ||
                                             (userTeam === 'team2' && match.team2_score_submitted_by);
                  
                  return (
                    <Card key={match.id} className="card-premium">
                      <CardContent className="p-6">
                        {/* Header with Week and Status */}
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center space-x-3">
                            <Badge variant="outline" className="font-semibold">Week {match.week}</Badge>
                            <div className="h-4 w-px bg-border"></div>
                            {scoreStatus.status === 'both' && scoreStatus.scoresMatch ? (
                              <Badge className="bg-success/10 text-success">Match Complete</Badge>
                            ) : scoreStatus.status === 'both' && !scoreStatus.scoresMatch ? (
                              <Badge variant="destructive">Score Dispute</Badge>
                            ) : (scoreStatus.status === 'team1' || scoreStatus.status === 'team2') ? (
                              <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400">
                                Awaiting Confirmation
                              </Badge>
                            ) : (
                              getStatusBadge(match.status)
                            )}
                          </div>
                          
                          {/* Score Display */}
                          {(scoreStatus.status === 'both' && scoreStatus.scoresMatch) && (
                            <div className="text-right">
                              <div className="text-xl font-bold text-primary">{scoreStatus.score}</div>
                              <div className="text-sm text-muted-foreground">
                                {scoreStatus.winner === 'team1' ? 'Your Team Won' : 'Opponents Won'}
                              </div>
                            </div>
                          )}
                          {(scoreStatus.status === 'team1' || scoreStatus.status === 'team2') && (
                            <div className="text-right">
                              <div className="text-lg font-semibold">{scoreStatus.score}</div>
                              <div className="text-xs text-orange-600">Needs confirmation</div>
                            </div>
                          )}
                        </div>

                        {/* Teams Display */}
                        <div className="grid grid-cols-3 gap-6 mb-6">
                          {/* Your Team */}
                          <div className="text-center">
                            <h4 className="text-sm font-semibold text-primary mb-3">Your Team</h4>
                            <div className="space-y-2">
                              <div className="font-medium">{userData?.name}</div>
                              <div className="text-muted-foreground">{partner?.name}</div>
                            </div>
                          </div>
                          
                          {/* VS Divider */}
                          <div className="flex items-center justify-center">
                            <div className="text-center">
                              <Badge variant="outline" className="text-lg font-bold px-4 py-2">VS</Badge>
                            </div>
                          </div>
                          
                          {/* Opposing Team */}
                          <div className="text-center">
                            <h4 className="text-sm font-semibold text-muted-foreground mb-3">Opponents</h4>
                            <div className="space-y-2">
                              {opposingTeamContacts.map((player, index) => (
                                <div key={index} className="text-muted-foreground">{player.name}</div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Contact Information */}
                        <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 mb-6 border border-blue-200 dark:border-blue-800">
                          <div className="flex items-center mb-3">
                            <Phone className="h-4 w-4 text-blue-600 dark:text-blue-400 mr-2" />
                            <h5 className="font-semibold text-blue-900 dark:text-blue-100">Contact Information</h5>
                          </div>
                          <div className="grid sm:grid-cols-2 gap-4 text-sm">
                            {/* Partner Contact */}
                            {partner && (
                              <div>
                                <div className="font-medium text-blue-900 dark:text-blue-100">{partner.name} (Partner)</div>
                                <div className="text-blue-700 dark:text-blue-300">
                                  {partner.phone_number ? `📱 ${partner.phone_number}` : `✉️ ${partner.email}`}
                                </div>
                              </div>
                            )}
                            {/* Opposing Team Contacts */}
                            {opposingTeamContacts.map((player, index) => (
                              <div key={index}>
                                <div className="font-medium text-blue-900 dark:text-blue-100">{player.name}</div>
                                <div className="text-blue-700 dark:text-blue-300">
                                  {player.contactType === 'Phone' ? '📱' : '✉️'} {player.contactInfo}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-center space-x-3">
                          {!hasUserTeamSubmitted && scoreStatus.status === 'none' && (
                            <Dialog open={scoreEntryOpen === match.id} onOpenChange={(open) => {
                              setScoreEntryOpen(open ? match.id : null);
                              if (!open) setScoreData({ score: '', winner: '' });
                            }}>
                              <DialogTrigger asChild>
                                <Button className="btn-hero">
                                  <Edit className="h-4 w-4 mr-2" />
                                  Enter Match Score
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Enter Match Score</DialogTitle>
                                  <DialogDescription>
                                    Enter the final score for your doubles match
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="score">Match Score</Label>
                                    <Input
                                      id="score"
                                      type="text"
                                      placeholder="e.g., 11-9, 11-7, 11-3"
                                      value={scoreData.score}
                                      onChange={(e) => setScoreData(prev => ({ ...prev, score: e.target.value }))}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="winner">Winner</Label>
                                    <select
                                      id="winner"
                                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                      value={scoreData.winner}
                                      onChange={(e) => setScoreData(prev => ({ ...prev, winner: e.target.value }))}
                                    >
                                      <option value="">Select winner</option>
                                      <option value="team1">Your Team</option>
                                      <option value="team2">Opposing Team</option>
                                    </select>
                                  </div>
                                  <Button 
                                    onClick={() => handleScoreSubmit(match.id)}
                                    disabled={submittingScore}
                                    className="w-full btn-hero"
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

                          {!hasUserTeamSubmitted && (scoreStatus.status === 'team1' || scoreStatus.status === 'team2') && (
                            <Button 
                              onClick={() => handleScoreConfirmation(match.id)}
                              disabled={submittingScore}
                              className="btn-hero"
                            >
                              {submittingScore ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Confirming...
                                </>
                              ) : (
                                <>
                                  <Check className="mr-2 h-4 w-4" />
                                  Confirm Score
                                </>
                              )}
                            </Button>
                          )}
                          
                          {hasUserTeamSubmitted && (
                            <Badge className="bg-success/10 text-success px-4 py-2">
                              <Check className="h-4 w-4 mr-2" />
                              Score Submitted
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
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
                  Contact us at <strong>vancouverpickleballsmash@gmail.com</strong> if you need help resolving scheduling conflicts with your opponents.
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
                    <span>Flexible scheduling with your opponents (doubles format)</span>
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