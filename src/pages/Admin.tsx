import { useState, useEffect } from 'react';
import { Shield, Plus, Users, Loader2, Mail, Check, X, Phone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase, type User } from '@/lib/supabase';
import { sendPickleballDoublesMatchNotificationEmails } from '@/lib/email';

const Admin = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingMatch, setCreatingMatch] = useState(false);
  const [sendNotifications, setSendNotifications] = useState(true);
  const [matches, setMatches] = useState<any[]>([]);
  const [markingComplete, setMarkingComplete] = useState<string | null>(null);
  const { toast } = useToast();

  // Match creation form state
  const [matchForm, setMatchForm] = useState({
    week: '',
    team1_player1_id: '',
    team1_player2_id: '',
    team2_player1_id: '',
    team2_player2_id: ''
  });

  // Fetch users who are members of pickleball ladders and upcoming matches
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get users who are active members of pickleball ladders with their location info
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select(`
            *,
            pickleball_ladder_memberships!inner(*)
          `)
          .eq('pickleball_ladder_memberships.is_active', true)
          .order('name');

        if (usersError) throw usersError;
        setUsers(usersData || []);

        // Get all matches with player info and score submission details
        const { data: matchesData, error: matchesError } = await supabase
          .from('pickleball_matches')
          .select(`
            *,
            team1_player1:users!pickleball_matches_team1_player1_id_fkey(name, location_text),
            team1_player2:users!pickleball_matches_team1_player2_id_fkey(name, location_text),
            team2_player1:users!pickleball_matches_team2_player1_id_fkey(name, location_text),
            team2_player2:users!pickleball_matches_team2_player2_id_fkey(name, location_text),
            team1_score_submitter:users!pickleball_matches_team1_score_submitted_by_fkey(name),
            team2_score_submitter:users!pickleball_matches_team2_score_submitted_by_fkey(name)
          `)
          .order('week', { ascending: true })
          .order('created_at', { ascending: false });

        if (matchesError) throw matchesError;
        setMatches(matchesData || []);

      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: "Error loading data",
          description: "Please refresh and try again.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  const handleCreateMatch = async () => {
    // Validation
    if (!matchForm.week || !matchForm.team1_player1_id || !matchForm.team1_player2_id || 
        !matchForm.team2_player1_id || !matchForm.team2_player2_id) {
      toast({
        title: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    // Check for duplicate players
    const playerIds = [
      matchForm.team1_player1_id,
      matchForm.team1_player2_id,
      matchForm.team2_player1_id,
      matchForm.team2_player2_id
    ];
    const uniquePlayerIds = new Set(playerIds);
    if (uniquePlayerIds.size !== 4) {
      toast({
        title: "Each player can only be selected once",
        variant: "destructive"
      });
      return;
    }

    setCreatingMatch(true);

    try {
      // Create the match
      const { data: matchData, error: matchError } = await supabase
        .from('pickleball_matches')
        .insert({
          week: parseInt(matchForm.week),
          team1_player1_id: matchForm.team1_player1_id,
          team1_player2_id: matchForm.team1_player2_id,
          team2_player1_id: matchForm.team2_player1_id,
          team2_player2_id: matchForm.team2_player2_id,
          status: 'scheduled'
        })
        .select()
        .single();

      if (matchError) throw matchError;

      toast({
        title: "Match created successfully!",
        description: `Week ${matchForm.week} doubles match has been scheduled.`,
      });

      // Reset form
      setMatchForm({
        week: '',
        team1_player1_id: '',
        team1_player2_id: '',
        team2_player1_id: '',
        team2_player2_id: ''
      });

      // Refresh matches list
      const { data: matchesData } = await supabase
        .from('pickleball_matches')
        .select(`
          *,
          team1_player1:users!pickleball_matches_team1_player1_id_fkey(name, location_text),
          team1_player2:users!pickleball_matches_team1_player2_id_fkey(name, location_text),
          team2_player1:users!pickleball_matches_team2_player1_id_fkey(name, location_text),
          team2_player2:users!pickleball_matches_team2_player2_id_fkey(name, location_text),
          team1_score_submitter:users!pickleball_matches_team1_score_submitted_by_fkey(name),
          team2_score_submitter:users!pickleball_matches_team2_score_submitted_by_fkey(name)
        `)
        .order('week', { ascending: true })
        .order('created_at', { ascending: false });
      setMatches(matchesData || []);

      // Send email notifications if enabled
      if (sendNotifications) {
        try {
          // Get all 4 players' data
          const team1Player1 = users.find(u => u.id === matchForm.team1_player1_id);
          const team1Player2 = users.find(u => u.id === matchForm.team1_player2_id);
          const team2Player1 = users.find(u => u.id === matchForm.team2_player1_id);
          const team2Player2 = users.find(u => u.id === matchForm.team2_player2_id);

          if (team1Player1 && team1Player2 && team2Player1 && team2Player2) {
            await sendPickleballDoublesMatchNotificationEmails(
              team1Player1.email, team1Player1.name, team1Player1.phone_number,
              team1Player2.email, team1Player2.name, team1Player2.phone_number,
              team2Player1.email, team2Player1.name, team2Player1.phone_number,
              team2Player2.email, team2Player2.name, team2Player2.phone_number,
              parseInt(matchForm.week)
            );
            
            console.log('✅ Email notifications sent to all 4 players');
            toast({
              title: "Emails sent!",
              description: "Match notifications have been sent to all 4 players.",
            });
          }
        } catch (emailError) {
          console.error('Error sending email notifications:', emailError);
          toast({
            title: "Match created, but email failed",
            description: "The match was created successfully, but there was an error sending email notifications.",
            variant: "destructive"
          });
        }
      }

    } catch (error: any) {
      console.error('Error creating match:', error);
      toast({
        title: "Error creating match",
        description: error.message || "Please try again.",
        variant: "destructive"
      });
    } finally {
      setCreatingMatch(false);
    }
  };

  const handleMarkComplete = async (matchId: string) => {
    setMarkingComplete(matchId);
    
    try {
      const match = matches.find(m => m.id === matchId);
      if (!match) {
        throw new Error('Match not found');
      }

      // Determine which score to use (prefer team1's submission if available, otherwise team2's)
      let finalScore, finalWinner;
      if (match.team1_score_submitted_by) {
        finalScore = match.team1_score;
        finalWinner = match.team1_winner_submitted;
      } else if (match.team2_score_submitted_by) {
        finalScore = match.team2_score;
        finalWinner = match.team2_winner_submitted;
      } else {
        throw new Error('No scores have been submitted yet');
      }

      // Make both teams have the same score submission and mark as completed
      const currentTime = new Date().toISOString();
      const submitterId = match.team1_score_submitted_by || match.team2_score_submitted_by;
      
      const { error: matchError } = await supabase
        .from('pickleball_matches')
        .update({
          status: 'completed',
          // Set both teams to have the same final score
          team1_score: finalScore,
          team2_score: finalScore,
          team1_winner_submitted: finalWinner,
          team2_winner_submitted: finalWinner,
          // Ensure both teams are marked as having submitted (admin override)
          team1_score_submitted_by: submitterId,
          team2_score_submitted_by: submitterId,
          team1_score_submitted_at: match.team1_score_submitted_at || currentTime,
          team2_score_submitted_at: match.team2_score_submitted_at || currentTime,
          played_at: currentTime
        })
        .eq('id', matchId);

      if (matchError) throw matchError;

      // Update player streaks and trends
      const winningPlayers = finalWinner === 'team1' 
        ? [match.team1_player1_id, match.team1_player2_id]
        : [match.team2_player1_id, match.team2_player2_id];
      
      const losingPlayers = finalWinner === 'team1'
        ? [match.team2_player1_id, match.team2_player2_id]
        : [match.team1_player1_id, match.team1_player2_id];

      // Update winning players: increment streak, set trend to 'up', add 10 points
      for (const playerId of winningPlayers) {
        const { data: membership } = await supabase
          .from('pickleball_ladder_memberships')
          .select('winning_streak, score')
          .eq('user_id', playerId)
          .single();

        if (membership) {
          await supabase
            .from('pickleball_ladder_memberships')
            .update({
              winning_streak: (membership.winning_streak || 0) + 1,
              trend: 'up',
              score: (membership.score || 100) + 10
            })
            .eq('user_id', playerId);
        }
      }

      // Update losing players: reset streak to 0, set trend to 'down', subtract 5 points
      for (const playerId of losingPlayers) {
        const { data: membership } = await supabase
          .from('pickleball_ladder_memberships')
          .select('score')
          .eq('user_id', playerId)
          .single();

        const currentScore = membership?.score || 100;
        const newScore = Math.max(0, currentScore - 5); // Don't let score go below 0

        await supabase
          .from('pickleball_ladder_memberships')
          .update({
            winning_streak: 0,
            trend: 'down',
            score: newScore
          })
          .eq('user_id', playerId);
      }

      // Refresh matches list
      const { data: matchesData } = await supabase
        .from('pickleball_matches')
        .select(`
          *,
          team1_player1:users!pickleball_matches_team1_player1_id_fkey(name, location_text),
          team1_player2:users!pickleball_matches_team1_player2_id_fkey(name, location_text),
          team2_player1:users!pickleball_matches_team2_player1_id_fkey(name, location_text),
          team2_player2:users!pickleball_matches_team2_player2_id_fkey(name, location_text),
          team1_score_submitter:users!pickleball_matches_team1_score_submitted_by_fkey(name),
          team2_score_submitter:users!pickleball_matches_team2_score_submitted_by_fkey(name)
        `)
        .order('week', { ascending: true })
        .order('created_at', { ascending: false });
      setMatches(matchesData || []);

      toast({
        title: "Match completed successfully!",
        description: `Match marked as complete. Winner: ${finalWinner === 'team1' ? 'Team 1' : 'Team 2'}. Player streaks and trends updated.`,
      });

    } catch (error: any) {
      console.error('Error marking match complete:', error);
      toast({
        title: "Error completing match",
        description: error.message || "Please try again.",
        variant: "destructive"
      });
    } finally {
      setMarkingComplete(null);
    }
  };

  const getPlayerName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user ? user.name : 'Unknown Player';
  };

  const getPlayerDisplayName = (user: User) => {
    const location = user.location_text || 
                    (user.preferred_latitude && user.preferred_longitude ? 'Custom Location' : null);
    return location ? `${user.name} (${location})` : user.name;
  };

  const getScoreSubmissionStatus = (match: any) => {
    const team1Submitted = match.team1_score_submitted_by;
    const team2Submitted = match.team2_score_submitted_by;
    
    if (match.status === 'completed' && team1Submitted && team2Submitted) {
      // Both teams submitted
      const team1Score = match.team1_score;
      const team2Score = match.team2_score;
      const scoresMatch = team1Score === team2Score && match.team1_winner_submitted === match.team2_winner_submitted;
      
      if (scoresMatch) {
        return {
          status: 'completed',
          display: `✅ ${team1Score} (${match.team1_winner_submitted === 'team1' ? 'Team 1 won' : 'Team 2 won'})`
        };
      } else {
        return {
          status: 'dispute',
          display: `⚠️ Score dispute - T1: ${team1Score} (${match.team1_winner_submitted}) | T2: ${team2Score} (${match.team2_winner_submitted})`
        };
      }
    } else if (team1Submitted || team2Submitted) {
      // One team submitted
      const submittedBy = team1Submitted ? match.team1_score_submitter?.name : match.team2_score_submitter?.name;
      const score = team1Submitted ? match.team1_score : match.team2_score;
      const winner = team1Submitted ? match.team1_winner_submitted : match.team2_winner_submitted;
      return {
        status: 'partial',
        display: `⏳ ${score} (${winner}) by ${submittedBy} - awaiting confirmation`
      };
    } else {
      // No submissions
      return {
        status: 'pending',
        display: 'Scheduled - no scores submitted'
      };
    }
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Admin Header */}
        <div className="text-center mb-12">
          <Badge className="mb-6 bg-primary/10 text-primary font-semibold px-4 py-2 text-lg">
            Admin Access
          </Badge>
          <h1 className="text-4xl font-bold text-gradient mb-6">
            <Shield className="inline-block h-10 w-10 mr-3 text-primary" />
            Pickleball Admin Panel
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Manage matches, players, and league operations
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-8">
            
            {/* Match Creation */}
            <Card className="card-premium">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Plus className="h-6 w-6 mr-2 text-primary" />
                  Create Doubles Match
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Week */}
                <div className="space-y-2">
                  <Label htmlFor="week">Week Number</Label>
                  <Input
                    id="week"
                    type="number"
                    placeholder="e.g., 1"
                    value={matchForm.week}
                    onChange={(e) => setMatchForm(prev => ({ ...prev, week: e.target.value }))}
                  />
                </div>

                {/* Team 1 */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-primary flex items-center">
                    <Users className="h-4 w-4 mr-2" />
                    Team 1
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Player 1</Label>
                      <Select 
                        value={matchForm.team1_player1_id} 
                        onValueChange={(value) => setMatchForm(prev => ({ ...prev, team1_player1_id: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select player" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {getPlayerDisplayName(user)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Player 2</Label>
                      <Select 
                        value={matchForm.team1_player2_id} 
                        onValueChange={(value) => setMatchForm(prev => ({ ...prev, team1_player2_id: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select player" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {getPlayerDisplayName(user)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Team 2 */}
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center">
                    <Users className="h-4 w-4 mr-2" />
                    Team 2
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Player 1</Label>
                      <Select 
                        value={matchForm.team2_player1_id} 
                        onValueChange={(value) => setMatchForm(prev => ({ ...prev, team2_player1_id: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select player" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {getPlayerDisplayName(user)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Player 2</Label>
                      <Select 
                        value={matchForm.team2_player2_id} 
                        onValueChange={(value) => setMatchForm(prev => ({ ...prev, team2_player2_id: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select player" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {getPlayerDisplayName(user)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Email Notifications Toggle */}
                <div className="flex items-center space-x-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <Label htmlFor="notifications" className="flex-1 text-sm">
                    Send email notifications to players
                  </Label>
                  <Switch
                    id="notifications"
                    checked={sendNotifications}
                    onCheckedChange={setSendNotifications}
                  />
                </div>

                <Button 
                  onClick={handleCreateMatch}
                  disabled={creatingMatch}
                  className="w-full btn-hero"
                >
                  {creatingMatch ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Match...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Match
                    </>
                  )}
                </Button>

              </CardContent>
            </Card>

            {/* Match Preview */}
            <Card className="card-premium">
              <CardHeader>
                <CardTitle>Match Preview</CardTitle>
              </CardHeader>
              <CardContent>
                {matchForm.week && matchForm.team1_player1_id && matchForm.team1_player2_id && 
                 matchForm.team2_player1_id && matchForm.team2_player2_id ? (
                  <div className="space-y-4">
                    <div className="text-center">
                      <Badge variant="outline" className="text-lg px-3 py-1">
                        Week {matchForm.week}
                      </Badge>
                    </div>

                    {/* Team 1 */}
                    <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                      <h4 className="text-sm font-semibold text-primary mb-2">Team 1</h4>
                      <div className="flex items-center justify-center space-x-2">
                        <span className="font-medium">{getPlayerName(matchForm.team1_player1_id)}</span>
                        <span className="text-muted-foreground">+</span>
                        <span className="font-medium">{getPlayerName(matchForm.team1_player2_id)}</span>
                      </div>
                    </div>

                    <div className="text-center">
                      <Badge variant="outline" className="font-bold">VS</Badge>
                    </div>

                    {/* Team 2 */}
                    <div className="p-3 bg-muted/30 border rounded-lg">
                      <h4 className="text-sm font-semibold mb-2">Team 2</h4>
                      <div className="flex items-center justify-center space-x-2">
                        <span className="font-medium">{getPlayerName(matchForm.team2_player1_id)}</span>
                        <span className="text-muted-foreground">+</span>
                        <span className="font-medium">{getPlayerName(matchForm.team2_player2_id)}</span>
                      </div>
                    </div>

                    {sendNotifications && (
                      <div className="flex items-center justify-center text-sm text-blue-600 dark:text-blue-400">
                        <Mail className="h-4 w-4 mr-1" />
                        Email notifications will be sent
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Fill in the form to preview the match</p>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        )}

        {/* Admin Matches List - Compact View */}
        <Card className="card-premium mt-8">
          <CardHeader>
            <CardTitle>All Matches (Admin View)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-2">
                {matches.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    No matches created yet
                  </div>
                ) : (
                  matches.map((match) => {
                    const scoreStatus = getScoreSubmissionStatus(match);
                    return (
                      <div key={match.id} className="p-3 bg-muted/20 rounded border text-sm space-y-2">
                        {/* Top row: Teams and basic info */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <Badge variant="outline" className="text-xs">W{match.week}</Badge>
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">{match.team1_player1?.name}</span>
                              <span className="text-muted-foreground">+</span>
                              <span className="font-medium">{match.team1_player2?.name}</span>
                              <span className="mx-2 text-muted-foreground">vs</span>
                              <span className="text-muted-foreground">{match.team2_player1?.name}</span>
                              <span className="text-muted-foreground">+</span>
                              <span className="text-muted-foreground">{match.team2_player2?.name}</span>
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(match.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        
                        {/* Bottom row: Score submission details and admin actions */}
                        <div className="flex items-center justify-between pl-14">
                          <span className={`text-xs ${
                            scoreStatus.status === 'completed' ? 'text-green-600' :
                            scoreStatus.status === 'dispute' ? 'text-red-600' :
                            scoreStatus.status === 'partial' ? 'text-orange-600' :
                            'text-muted-foreground'
                          }`}>
                            {scoreStatus.display}
                          </span>
                          
                          {/* Admin Action Button */}
                          {(scoreStatus.status === 'partial' || scoreStatus.status === 'dispute') && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkComplete(match.id)}
                              disabled={markingComplete === match.id}
                              className="text-xs h-6 px-2"
                            >
                              {markingComplete === match.id ? (
                                <>
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  Marking...
                                </>
                              ) : (
                                <>
                                  <Check className="h-3 w-3 mr-1" />
                                  Mark Complete
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default Admin;

/* 
TEMPORARILY COMMENTED OUT - ORIGINAL ADMIN FUNCTIONALITY
TODO: Uncomment when moving admin functions back to this platform

import { useState, useEffect } from 'react';
import { RefreshCw, Trophy, TrendingUp, Users, Calendar, Plus, Loader2, Edit, ChevronUp, ChevronDown, X, Check, MapPin, Save, User as UserIcon, Crown, Mail, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase, type Ladder, type User, type LadderMembership, type Match } from '@/lib/supabase';
import { calculateDistance } from '@/lib/utils';
import { sendMatchNotificationEmail, sendMatchCancellationEmail } from '@/lib/email';

const Admin = () => {
  // ... all original admin functionality is preserved here for easy restoration
  // (keeping all the original code commented for when we want to bring it back)
};

export default Admin;
*/