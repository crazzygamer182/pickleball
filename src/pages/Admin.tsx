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


  const [matchData, setMatchData] = useState({
    player1: '',
    player2: '',
    week: ''
  });

  const [isUpdating, setIsUpdating] = useState(false);
  const [isCreatingMatch, setIsCreatingMatch] = useState(false);
  const [isEditingLadder, setIsEditingLadder] = useState(false);
  const [selectedLadderForEdit, setSelectedLadderForEdit] = useState<string>('');
  const [ladderPlayers, setLadderPlayers] = useState<Array<{id: string; name: string; rank: number; profile_picture_url?: string}>>([]);
  const [ladders, setLadders] = useState<Ladder[]>([]);
  const [ladderMemberships, setLadderMemberships] = useState<Array<LadderMembership & { user: User; ladder: Ladder }>>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<Array<Match & { 
    player1: User; 
    player2: User; 
    player1_rank?: number;
    player2_rank?: number;
  }>>([]);
  const [completedMatches, setCompletedMatches] = useState<Array<Match & { 
    player1: User; 
    player2: User; 
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [disputeResolutionForm, setDisputeResolutionForm] = useState({
    matchId: '',
    finalScore: '',
    finalWinner: ''
  });
  const [resolvingDispute, setResolvingDispute] = useState(false);
  const [selectedFirstPlayer, setSelectedFirstPlayer] = useState<User | null>(null);
  const [playerMatchCounts, setPlayerMatchCounts] = useState<Array<{user: User; matchCount: number}>>([]);
  const [deletingMatch, setDeletingMatch] = useState<string | null>(null);
  const [completingMatch, setCompletingMatch] = useState<string | null>(null);
  const [player1PreviousOpponents, setPlayer1PreviousOpponents] = useState<Set<string>>(new Set());

  const [sendingMatchEmail, setSendingMatchEmail] = useState<string | null>(null);
  const [sendingAllMatchEmails, setSendingAllMatchEmails] = useState(false);
  const [sendingCancellationEmail, setSendingCancellationEmail] = useState<string | null>(null);
  const [autoSendEmails, setAutoSendEmails] = useState(true);
  const { toast } = useToast();

  // Fetch ladders and memberships
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch ladders
        const { data: laddersData, error: laddersError } = await supabase
          .from('ladders')
          .select('*')
          .eq('sport', 'pickleball')
          .order('name');

        if (laddersError) throw laddersError;
        setLadders(laddersData || []);

        // Fetch ladder memberships with user data
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

        // Fetch upcoming matches with player data
        const { data: matchesData, error: matchesError } = await supabase
          .from('matches')
          .select(`
            *,
            player1:users!matches_player1_id_fkey(*),
            player2:users!matches_player2_id_fkey(*)
          `)
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

        // Fetch completed matches
        const { data: completedMatchesData, error: completedMatchesError } = await supabase
          .from('matches')
          .select(`
            *,
            player1:users!matches_player1_id_fkey(*),
            player2:users!matches_player2_id_fkey(*)
          `)
          .eq('status', 'completed')
          .order('played_at', { ascending: false });

        if (completedMatchesError) throw completedMatchesError;
        setCompletedMatches(completedMatchesData || []);

        // Fetch all matches to calculate player match counts
        const { data: allMatchesData, error: allMatchesError } = await supabase
          .from('matches')
          .select('*')
          .eq('status', 'scheduled');

        if (allMatchesError) throw allMatchesError;

        // Calculate match counts for each player
        const matchCounts = new Map<string, number>();
        (allMatchesData || []).forEach(match => {
          // Count matches where player is either player1 or player2
          matchCounts.set(match.player1_id, (matchCounts.get(match.player1_id) || 0) + 1);
          matchCounts.set(match.player2_id, (matchCounts.get(match.player2_id) || 0) + 1);
        });

        // Fetch all users to get complete player list
        const { data: allUsersData, error: allUsersError } = await supabase
          .from('users')
          .select('*');

        if (allUsersError) throw allUsersError;

        // Create array of all players with their match counts
        const playersWithMatchCounts = (allUsersData || []).map(user => ({
          user: user,
          matchCount: matchCounts.get(user.id) || 0
        })).sort((a, b) => b.matchCount - a.matchCount); // Sort by match count descending

        setPlayerMatchCounts(playersWithMatchCounts);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: "Error loading data",
          description: "Please refresh the page and try again.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  // Get players for a specific ladder
  const getPlayersForLadder = (ladderId: string) => {
    return ladderMemberships
      .filter(membership => membership.ladder_id === ladderId)
      .map(membership => ({
        id: membership.user_id,
        name: membership.user.name,
        rank: membership.current_rank || 0,
        profile_picture_url: membership.user.profile_picture_url
      }))
      .sort((a, b) => a.rank - b.rank);
  };

  // Get all players with distance information if first player is selected
  const getPlayersWithDistance = () => {
    if (!selectedFirstPlayer) {
      return ladderMemberships.map(membership => ({
        id: membership.user_id,
        name: membership.user.name,
        rank: membership.current_rank || 0,
        distance: null,
        hasPlayedBefore: false
      }));
    }

    return ladderMemberships
      .filter(membership => membership.user_id !== selectedFirstPlayer.id) // Exclude the first player
      .map(membership => {
        const user = membership.user;
        let distance = null;
        
        // Check if both players have coordinates for distance calculation
        const player1HasCoords = selectedFirstPlayer.preferred_latitude && selectedFirstPlayer.preferred_longitude;
        const player2HasCoords = user.preferred_latitude && user.preferred_longitude;
        
        if (player1HasCoords && player2HasCoords) {
          distance = calculateDistance(
            selectedFirstPlayer.preferred_latitude,
            selectedFirstPlayer.preferred_longitude,
            user.preferred_latitude,
            user.preferred_longitude
          );
        }
        
        const hasPlayedBefore = player1PreviousOpponents.has(membership.user_id);
        
        return {
          id: membership.user_id,
          name: membership.user.name,
          rank: membership.current_rank || 0,
          distance,
          hasPlayedBefore
        };
      })
      .sort((a, b) => {
        // Sort by distance if available, then by rank
        if (a.distance !== null && b.distance !== null) {
          return a.distance - b.distance;
        }
        if (a.distance !== null) return -1;
        if (b.distance !== null) return 1;
        return a.rank - b.rank;
      });
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
        player2Winner: match.player2_winner_submitted,
        player1Submitted: match.player1.name,
        player2Submitted: match.player2.name
      };
    } else if (hasPlayer1Score) {
      return { 
        status: 'player1', 
        message: `${match.player1.name} submitted: ${match.player1_score_string} (Winner: ${match.player1_winner_submitted})`,
        score: match.player1_score_string,
        winner: match.player1_winner_submitted,
        player1Submitted: match.player1.name
      };
    } else {
      return { 
        status: 'player2', 
        message: `${match.player2.name} submitted: ${match.player2_score_string} (Winner: ${match.player2_winner_submitted})`,
        score: match.player2_score_string,
        winner: match.player2_winner_submitted,
        player2Submitted: match.player2.name
      };
    }
  };



  const updateRankings = () => {
    setIsUpdating(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsUpdating(false);
      toast({
        title: "Rankings Updated",
        description: "All ladder rankings have been recalculated successfully",
      });
    }, 2000);
  };

  const handleLadderSelect = (ladderId: string) => {
    setSelectedLadderForEdit(ladderId);
    const players = getPlayersForLadder(ladderId);
    setLadderPlayers(players);
  };

  const movePlayer = (playerId: string, direction: 'up' | 'down') => {
    setLadderPlayers(prev => {
      const newPlayers = [...prev];
      const currentIndex = newPlayers.findIndex(p => p.id === playerId);
      
      if (direction === 'up' && currentIndex > 0) {
        // Swap with player above
        [newPlayers[currentIndex], newPlayers[currentIndex - 1]] = [newPlayers[currentIndex - 1], newPlayers[currentIndex]];
        // Update ranks
        newPlayers[currentIndex].rank = currentIndex + 1;
        newPlayers[currentIndex - 1].rank = currentIndex;
      } else if (direction === 'down' && currentIndex < newPlayers.length - 1) {
        // Swap with player below
        [newPlayers[currentIndex], newPlayers[currentIndex + 1]] = [newPlayers[currentIndex + 1], newPlayers[currentIndex]];
        // Update ranks
        newPlayers[currentIndex].rank = currentIndex + 1;
        newPlayers[currentIndex + 1].rank = currentIndex + 2;
      }
      
      return newPlayers;
    });
  };

  const saveLadderChanges = async () => {
    if (!selectedLadderForEdit || ladderPlayers.length === 0) return;

    setIsEditingLadder(true);

    try {
      // Update all player ranks in the database
      const updatePromises = ladderPlayers.map((player, index) => 
        supabase
          .from('ladder_memberships')
          .update({ current_rank: index + 1 })
          .eq('user_id', player.id)
          .eq('ladder_id', selectedLadderForEdit)
      );

      await Promise.all(updatePromises);

      toast({
        title: "Ladder Updated",
        description: "Player rankings have been updated successfully",
      });

      // Refresh the data
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

      setSelectedLadderForEdit('');
      setLadderPlayers([]);
    } catch (error: any) {
      console.error('Error updating ladder:', error);
      toast({
        title: "Error updating ladder",
        description: error.message || "Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsEditingLadder(false);
    }
  };



  const handleMatchInputChange = (field: string, value: string) => {
    setMatchData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Reset player2 when player1 changes
    if (field === 'player1') {
      setMatchData(prev => ({
        ...prev,
        player2: ''
      }));
      
      // Fetch previous opponents for the selected player
      if (value) {
        fetchPreviousOpponents(value);
      } else {
        setPlayer1PreviousOpponents(new Set());
      }
    }
  };

  const fetchPreviousOpponents = async (playerId: string) => {
    try {
      // Fetch all completed matches where this player participated
      const { data: matchesData, error } = await supabase
        .from('matches')
        .select('player1_id, player2_id')
        .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`)
        .eq('status', 'completed');

      if (error) throw error;

      // Extract opponent IDs
      const opponentIds = new Set<string>();
      (matchesData || []).forEach(match => {
        if (match.player1_id === playerId) {
          opponentIds.add(match.player2_id);
        } else {
          opponentIds.add(match.player1_id);
        }
      });

      setPlayer1PreviousOpponents(opponentIds);
    } catch (error) {
      console.error('Error fetching previous opponents:', error);
      setPlayer1PreviousOpponents(new Set());
    }
  };

  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!matchData.player1 || !matchData.player2 || !matchData.week) {
      toast({
        title: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    if (matchData.player1 === matchData.player2) {
      toast({
        title: "Invalid match",
        description: "Players cannot play against themselves",
        variant: "destructive"
      });
      return;
    }

    setIsCreatingMatch(true);

    try {
      // Try to create match with explicit field selection
      const matchDataToInsert = {
          player1_id: matchData.player1,
          player2_id: matchData.player2,
        week: parseInt(matchData.week)
      };

      console.log('Attempting to insert match data:', matchDataToInsert);

      // Try the standard insert approach
      const { data, error } = await supabase
        .from('matches')
        .insert(matchDataToInsert)
        .select('id, player1_id, player2_id, week, status');

      if (error) {
        console.error('Supabase error details:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        console.error('Error hint:', error.hint);
        throw error;
      }

             console.log('Match created successfully:', data);

       // Send match notification emails if toggle is enabled
       if (autoSendEmails) {
         try {
           const player1 = ladderMemberships.find(m => m.user_id === matchData.player1)?.user;
           const player2 = ladderMemberships.find(m => m.user_id === matchData.player2)?.user;
           
           if (player1 && player2) {
             await sendMatchNotificationEmail(
               player1.email,
               player1.name,
               player1.phone_number,
               player2.email,
               player2.name,
               player2.phone_number,
               parseInt(matchData.week)
             );
             
             toast({
               title: "Match Created & Emails Sent",
               description: `Match scheduled for Week ${matchData.week}. Notification emails sent to ${player1.name} and ${player2.name}.`,
             });
           } else {
             toast({
               title: "Match Created",
               description: `Match scheduled for Week ${matchData.week}`,
             });
           }
         } catch (emailError) {
           console.error('Error sending match notification emails:', emailError);
           toast({
             title: "Match Created",
             description: `Match scheduled for Week ${matchData.week}. Note: Failed to send notification emails.`,
           });
         }
       } else {
         toast({
           title: "Match Created",
           description: `Match scheduled for Week ${matchData.week}`,
         });
       }

      // Reset form
      setMatchData({
        player1: '',
        player2: '',
        week: ''
      });

      // Refresh matches data
      const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .select(`
          *,
          player1:users!matches_player1_id_fkey(*),
          player2:users!matches_player2_id_fkey(*)
        `)
        .eq('status', 'scheduled')
        .order('week', { ascending: true });

      if (matchesError) throw matchesError;

      // Add player ranks to matches
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

      // Refresh player match counts
      const { data: allMatchesData, error: allMatchesError } = await supabase
        .from('matches')
        .select('*')
        .eq('status', 'scheduled');

      if (allMatchesError) throw allMatchesError;

      const matchCounts = new Map<string, number>();
      (allMatchesData || []).forEach(match => {
        matchCounts.set(match.player1_id, (matchCounts.get(match.player1_id) || 0) + 1);
        matchCounts.set(match.player2_id, (matchCounts.get(match.player2_id) || 0) + 1);
      });

      const playersWithMatchCounts = (await supabase.from('users').select('*')).data?.map(user => ({
        user: user,
        matchCount: matchCounts.get(user.id) || 0
      })).sort((a, b) => b.matchCount - a.matchCount) || [];

      setPlayerMatchCounts(playersWithMatchCounts);
    } catch (error: any) {
      console.error('Error creating match:', error);
      toast({
        title: "Error creating match",
        description: error.message || "Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCreatingMatch(false);
    }
  };





  const resolveScoreDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!disputeResolutionForm.finalScore || !disputeResolutionForm.finalWinner) {
      toast({
        title: "Please enter both score and winner",
        variant: "destructive"
      });
      return;
    }

    setResolvingDispute(true);

    try {
      const { error } = await supabase
        .from('matches')
        .update({
          player1_score: disputeResolutionForm.finalScore,
          player2_score: disputeResolutionForm.finalWinner,
          status: 'completed',
          played_at: new Date().toISOString()
        })
        .eq('id', disputeResolutionForm.matchId);

      if (error) throw error;

      toast({
        title: "Score dispute resolved",
        description: "The final score has been set and match marked as completed.",
      });

      // Reset form
      setDisputeResolutionForm({
        matchId: '',
        finalScore: '',
        finalWinner: ''
      });

              // Refresh matches data
        const { data: matchesData, error: matchesError } = await supabase
          .from('matches')
          .select(`
            *,
            player1:users!matches_player1_id_fkey(*),
            player2:users!matches_player2_id_fkey(*)
          `)
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
    } catch (error: any) {
      console.error('Error resolving score dispute:', error);
      toast({
        title: "Error resolving score dispute",
        description: error.message || "Please try again.",
        variant: "destructive"
      });
    } finally {
      setResolvingDispute(false);
    }
  };

  const deleteMatch = async (matchId: string) => {
    setDeletingMatch(matchId);

    try {
      const { error } = await supabase
        .from('matches')
        .delete()
        .eq('id', matchId);

      if (error) throw error;

      toast({
        title: "Match Deleted",
        description: "The match has been successfully deleted.",
      });

      // Refresh matches data
      const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .select(`
          *,
          player1:users!matches_player1_id_fkey(*),
          player2:users!matches_player2_id_fkey(*)
        `)
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
    } catch (error: any) {
      console.error('Error deleting match:', error);
      toast({
        title: "Error deleting match",
        description: error.message || "Please try again.",
        variant: "destructive"
      });
    } finally {
      setDeletingMatch(null);
    }
  };

  const completeMatch = async (matchId: string) => {
    setCompletingMatch(matchId);

    try {
      // First get the match details to determine winner and loser
      const { data: matchData, error: matchFetchError } = await supabase
        .from('matches')
        .select(`
          *,
          player1:users!matches_player1_id_fkey(*),
          player2:users!matches_player2_id_fkey(*)
        `)
        .eq('id', matchId)
        .single();

      if (matchFetchError) throw matchFetchError;

      // Determine winner based on submitted scores
      // NOTE: Historically the `*_winner_submitted` columns have stored the winner's
      // *name* rather than their user id.  However, the ladder logic below expects
      // user ids in order to update streaks/trends and rankings.  To make the code
      // resilient, we map whatever value is stored (name **or** id) back to the
      // corresponding user id before continuing.

      // Helper that converts a submitted value (name or id) to a user id.
      const mapToUserId = (submitted?: string | null): string | null => {
        if (!submitted) return null;
        // Already a user id?
        if (submitted === matchData.player1_id || submitted === matchData.player2_id) {
          return submitted;
        }
        // Otherwise treat as name.
        if (submitted === matchData.player1.name) return matchData.player1_id;
        if (submitted === matchData.player2.name) return matchData.player2_id;
        return null; // Unknown value – shouldn't happen
      };

      let winnerId!: string;
      let loserId!: string;

      // Prefer player-1's submission if they provided one, else fall back to player-2's.
      const player1WinnerId = mapToUserId(matchData.player1_winner_submitted);
      const player2WinnerId = mapToUserId(matchData.player2_winner_submitted);

      if (player1WinnerId) {
        winnerId = player1WinnerId;
      } else if (player2WinnerId) {
        winnerId = player2WinnerId;
      }

      if (!winnerId) {
        throw new Error('Cannot complete match: No scores submitted');
      }

      // Identify loserId as the other participant.
      loserId = winnerId === matchData.player1_id ? matchData.player2_id : matchData.player1_id;

      // Type guard for later DB calls
      winnerId = winnerId as string;
      loserId = loserId as string;

      console.log('Winner determination:', {
        player1_id: matchData.player1_id,
        player2_id: matchData.player2_id,
        player1_winner_submitted: matchData.player1_winner_submitted,
        player2_winner_submitted: matchData.player2_winner_submitted,
        winnerId,
        loserId,
        player1Name: matchData.player1.name,
        player2Name: matchData.player2.name
      });

      // If both players submitted different winners, still proceed with player 1's submission
      if (matchData.player1_winner_submitted && matchData.player2_winner_submitted && 
          matchData.player1_winner_submitted !== matchData.player2_winner_submitted) {
        console.warn('Score dispute detected - using player 1\'s submission');
      }

      // Get all active ladder memberships for both players
      const { data: membershipData, error: membershipError } = await supabase
        .from('ladder_memberships')
        .select('*, ladder:ladders(*)')
        .in('user_id', [winnerId, loserId])
        .eq('is_active', true);

      if (membershipError) throw membershipError;

      // Group memberships by ladder
      type LadderMembership = typeof membershipData[0];
      const ladderMemberships = membershipData.reduce((acc, membership) => {
        if (!acc[membership.ladder_id]) {
          acc[membership.ladder_id] = [];
        }
        acc[membership.ladder_id].push(membership);
        return acc;
      }, {} as Record<string, LadderMembership[]>);

      // Find ladder where both players are members
      const commonLadderEntries = Object.entries(ladderMemberships)
        .filter(([_, memberships]: [string, LadderMembership[]]) => {
          const hasWinner = memberships.some(m => m.user_id === winnerId);
          const hasLoser = memberships.some(m => m.user_id === loserId);
          return hasWinner && hasLoser;
        });

      if (commonLadderEntries.length === 0) {
        throw new Error('Could not find a common ladder where both players are active members');
      }

      // For each common ladder, update both players' streaks and trends
      for (const [ladderId, memberships] of commonLadderEntries as [string, LadderMembership[]][]) {
        const winnerMembership = (memberships as LadderMembership[]).find(m => m.user_id === winnerId);
        const loserMembership = (memberships as LadderMembership[]).find(m => m.user_id === loserId);

        if (!winnerMembership || !loserMembership) {
          console.error(`Missing membership in ladder ${ladderId} for one of the players`);
          continue;
        }

        console.log('Updating streaks:', {
          winnerName: matchData.player1_id === winnerId ? matchData.player1.name : matchData.player2.name,
          loserName: matchData.player1_id === loserId ? matchData.player1.name : matchData.player2.name,
          winnerCurrentStreak: winnerMembership.winning_streak,
          loserCurrentStreak: loserMembership.winning_streak,
          ladderId,
          ladderName: memberships[0].ladder.name
        });

        // Update winner's streak and trend
        const { error: winnerUpdateError } = await supabase
          .from('ladder_memberships')
          .update({
            winning_streak: winnerMembership.winning_streak + 1,
            trend: 'up'
          })
          .eq('id', winnerMembership.id);

        if (winnerUpdateError) {
          console.error(`Error updating winner's streak in ladder ${ladderId}:`, winnerUpdateError);
          continue;
        }

        // Reset loser's streak and update trend
        const { error: loserUpdateError } = await supabase
          .from('ladder_memberships')
          .update({
            winning_streak: 0,
            trend: 'down'
          })
          .eq('id', loserMembership.id);

        if (loserUpdateError) {
          console.error(`Error updating loser's streak in ladder ${ladderId}:`, loserUpdateError);
          continue;
        }

        // If loser has a better rank (lower number), swap their ranks
        if (loserMembership.current_rank < winnerMembership.current_rank) {
          console.log('Swapping ranks:', {
            winner: {
              name: matchData.player1_id === winnerId ? matchData.player1.name : matchData.player2.name,
              oldRank: winnerMembership.current_rank,
              newRank: loserMembership.current_rank
            },
            loser: {
              name: matchData.player1_id === loserId ? matchData.player1.name : matchData.player2.name,
              oldRank: loserMembership.current_rank,
              newRank: winnerMembership.current_rank
            }
          });

          // Update winner's rank
          const { error: winnerRankError } = await supabase
            .from('ladder_memberships')
            .update({
              current_rank: loserMembership.current_rank
            })
            .eq('id', winnerMembership.id);

          if (winnerRankError) {
            console.error(`Error updating winner's rank in ladder ${ladderId}:`, winnerRankError);
            continue;
          }

          // Update loser's rank
          const { error: loserRankError } = await supabase
            .from('ladder_memberships')
            .update({
              current_rank: winnerMembership.current_rank
            })
            .eq('id', loserMembership.id);

          if (loserRankError) {
            console.error(`Error updating loser's rank in ladder ${ladderId}:`, loserRankError);
            continue;
          }
        }
      }

      // Mark match as completed
      const { error } = await supabase
        .from('matches')
        .update({
          status: 'completed',
          played_at: new Date().toISOString()
        })
        .eq('id', matchId);

      if (error) throw error;

      const winnerName = winnerId === matchData.player1_id ? matchData.player1.name : matchData.player2.name;
      const loserName = loserId === matchData.player1_id ? matchData.player1.name : matchData.player2.name;
      const ladderNames = commonLadderEntries.map(([_, memberships]) => memberships[0].ladder.name).join(' and ');
      
      // Build success message
      let successMessage = `The match has been marked as completed. ${winnerName}'s winning streak has been increased in the ${ladderNames} ladder${commonLadderEntries.length > 1 ? 's' : ''}.`;
      
      // Add rank swap info if it happened in any ladder
      const rankSwaps = commonLadderEntries.filter(([_, memberships]: [string, LadderMembership[]]) => {
        const winner = memberships.find(m => m.user_id === winnerId);
        const loser = memberships.find(m => m.user_id === loserId);
        return winner && loser && loser.current_rank < winner.current_rank;
      });
      
      if (rankSwaps.length > 0) {
        const swapLadderNames = rankSwaps.map(([_, memberships]) => memberships[0].ladder.name).join(' and ');
        successMessage += ` ${winnerName} has taken ${loserName}'s position in the ${swapLadderNames} ladder${rankSwaps.length > 1 ? 's' : ''}.`;
      }
      
      toast({
        title: "Match Completed",
        description: successMessage,
      });

      // Refresh matches data
      const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .select(`
          *,
          player1:users!matches_player1_id_fkey(*),
          player2:users!matches_player2_id_fkey(*)
        `)
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
    } catch (error: any) {
      console.error('Error completing match:', error);
      toast({
        title: "Error completing match",
        description: error.message || "Please try again.",
        variant: "destructive"
      });
    } finally {
      setCompletingMatch(null);
    }
  };



  const handleSendMatchNotificationEmail = async (match: Match & { player1: User; player2: User; player1_rank?: number; player2_rank?: number }) => {
    setSendingMatchEmail(match.id);
    try {
      await sendMatchNotificationEmail(
        match.player1.email,
        match.player1.name,
        match.player1.phone_number,
        match.player2.email,
        match.player2.name,
        match.player2.phone_number,
        match.week
      );

      toast({
        title: "Match Notification Sent",
        description: `Emails sent to ${match.player1.name} and ${match.player2.name} for Week ${match.week}`,
      });

    } catch (error) {
      console.error('Error sending match notification emails:', error);
      toast({
        title: "Error",
        description: "Failed to send match notification emails. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSendingMatchEmail(null);
    }
  };

  const handleSendAllMatchNotificationEmails = async () => {
    if (upcomingMatches.length === 0) {
      toast({
        title: "No Matches",
        description: "There are no upcoming matches to send emails for.",
        variant: "destructive",
      });
      return;
    }

    setSendingAllMatchEmails(true);
    try {
      const emailPromises = upcomingMatches.map(match => 
        sendMatchNotificationEmail(
          match.player1.email,
          match.player1.name,
          match.player1.phone_number,
          match.player2.email,
          match.player2.name,
          match.player2.phone_number,
          match.week
        )
      );

      await Promise.all(emailPromises);

      toast({
        title: "All Match Notifications Sent",
        description: `Successfully sent emails for ${upcomingMatches.length} matches (${upcomingMatches.length * 2} players notified)`,
      });

    } catch (error) {
      console.error('Error sending all match notification emails:', error);
      toast({
        title: "Error",
        description: "Failed to send some match notification emails. Please check the console for details.",
        variant: "destructive",
      });
    } finally {
      setSendingAllMatchEmails(false);
    }
  };

  const handleSendMatchCancellationEmail = async (match: Match & { player1: User; player2: User; player1_rank?: number; player2_rank?: number }) => {
    setSendingCancellationEmail(match.id);
    try {
      await sendMatchCancellationEmail(
        match.player1.email,
        match.player1.name,
        match.player2.email,
        match.player2.name,
        match.week
      );

      toast({
        title: "Cancellation Email Sent",
        description: `Successfully sent cancellation emails to ${match.player1.name} and ${match.player2.name} for Week ${match.week}`,
      });

    } catch (error) {
      console.error('Error sending match cancellation email:', error);
      toast({
        title: "Error",
        description: "Failed to send cancellation emails. Please check the console for details.",
        variant: "destructive",
      });
    } finally {
      setSendingCancellationEmail(null);
    }
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gradient">Admin Dashboard</h1>
              <p className="text-muted-foreground mt-2">Manage matches, scores, and ladder rankings</p>
            </div>
            <Badge className="bg-primary/10 text-primary">Administrator</Badge>
          </div>
        </div>



        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Statistics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="card-premium">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Current Players</p>
                      <p className="text-3xl font-bold text-primary">{ladderMemberships.length}</p>
                    </div>
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card className="card-premium">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Scheduled Matches</p>
                      <p className="text-3xl font-bold text-blue-600">{upcomingMatches.length}</p>
                    </div>
                    <Calendar className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="card-premium">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Completed Matches</p>
                      <p className="text-3xl font-bold text-blue-600">{completedMatches.length}</p>
                    </div>
                    <Trophy className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid lg:grid-cols-1 gap-8">
              {/* Create Match Form */}
              <Card className="card-premium">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Plus className="h-6 w-6 mr-2 text-primary" />
                    Create Match
                  </CardTitle>
                  <CardDescription>
                    Schedule a new match between two players
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateMatch} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="match-player1">Player 1</Label>
                        <Select value={matchData.player1} onValueChange={(value) => {
                          handleMatchInputChange('player1', value);
                          const selectedUser = ladderMemberships.find(m => m.user_id === value)?.user;
                          setSelectedFirstPlayer(selectedUser || null);
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select player" />
                          </SelectTrigger>
                          <SelectContent>
                            {ladderMemberships.map((membership) => {
                              const matchCount = playerMatchCounts.find(p => p.user.id === membership.user_id)?.matchCount || 0;
                              return (
                                <SelectItem key={membership.user_id} value={membership.user_id}>
                                  <div className="flex items-center justify-between w-full">
                                    <span>
                                      {membership.user.name} (Rank {membership.current_rank || 'N/A'})
                                      {membership.user.preferred_latitude && membership.user.preferred_longitude && (
                                        <span className="text-xs text-muted-foreground ml-2">📍</span>
                                      )}
                                    </span>
                                    <Badge variant="outline" className="ml-2">
                                      {matchCount} match{matchCount !== 1 ? 'es' : ''}
                                    </Badge>
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        {selectedFirstPlayer && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {selectedFirstPlayer.preferred_latitude && selectedFirstPlayer.preferred_longitude ? (
                              <span className="text-blue-600 dark:text-blue-400">📍 Coordinates available - distances will be shown for Player 2</span>
                            ) : selectedFirstPlayer.location_text ? (
                              <span className="text-blue-600 dark:text-blue-400">📍 Location set: {selectedFirstPlayer.location_text} - distances won't be available</span>
                            ) : (
                              <span className="text-orange-600 dark:text-orange-400">⚠️ No location set - distances won't be available</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="match-player2">Player 2</Label>
                        <Select value={matchData.player2} onValueChange={(value) => handleMatchInputChange('player2', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select player" />
                          </SelectTrigger>
                          <SelectContent>
                            {getPlayersWithDistance().map((player) => {
                              const matchCount = playerMatchCounts.find(p => p.user.id === player.id)?.matchCount || 0;
                              return (
                                <SelectItem key={player.id} value={player.id}>
                                  <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center space-x-2">
                                      <span>{player.name} (Rank {player.rank})</span>
                                      {player.hasPlayedBefore && (
                                        <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300">
                                          Played Before
                                        </Badge>
                                      )}
                                      <Badge variant="outline" className="text-xs">
                                        {matchCount} match{matchCount !== 1 ? 'es' : ''}
                                      </Badge>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {player.distance !== null ? (
                                        <span className="text-blue-600 dark:text-blue-400">
                                          {player.distance}km away
                                        </span>
                                      ) : selectedFirstPlayer ? (
                                        <span>
                                          {(() => {
                                            const user = ladderMemberships.find(m => m.user_id === player.id)?.user;
                                            if (user?.location_text) {
                                              return user.location_text;
                                            }
                                            return "No coordinates";
                                          })()}
                                        </span>
                                      ) : null}
                                    </div>
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="match-week">Week</Label>
                      <Input
                        id="match-week"
                        type="number"
                        placeholder="e.g., 1, 2, 3..."
                        value={matchData.week}
                        onChange={(e) => handleMatchInputChange('week', e.target.value)}
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="auto-send-emails"
                        checked={autoSendEmails}
                        onChange={(e) => setAutoSendEmails(e.target.checked)}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <Label htmlFor="auto-send-emails" className="text-sm">
                        Automatically send match notification emails to players
                      </Label>
                    </div>

                    <Button type="submit" className="btn-hero w-full" disabled={isCreatingMatch}>
                      {isCreatingMatch ? (
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
                  </form>
                </CardContent>
              </Card>


            </div>



            {/* Ladder Management */}
            <div className="space-y-6 mt-8">
              {/* Edit Ladder */}
              <Card className="card-premium">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Edit className="h-6 w-6 mr-2 text-accent" />
                    Edit Ladder Rankings
                  </CardTitle>
                  <CardDescription>
                    Manually reorder players in a ladder based on match results
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Ladder Selection */}
                    <div className="space-y-2">
                      <Label htmlFor="ladder-select">Select Ladder</Label>
                      <Select value={selectedLadderForEdit} onValueChange={handleLadderSelect}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a ladder to edit" />
                        </SelectTrigger>
                        <SelectContent>
                          {ladders.map((ladder) => (
                            <SelectItem key={ladder.id} value={ladder.id}>
                              {ladder.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Player List */}
                    {selectedLadderForEdit && ladderPlayers.length > 0 && (
                      <div className="space-y-2">
                        <Label>Current Rankings</Label>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {ladderPlayers.map((player, index) => (
                            <div key={player.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                              <div className="flex items-center space-x-3">
                                {/* Profile Picture with Rank Badge */}
                                <div className="relative">
                                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                                    {player.profile_picture_url ? (
                                      <img 
                                        src={player.profile_picture_url} 
                                        alt={`${player.name}'s profile`} 
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <UserIcon className="h-4 w-4 text-muted-foreground" />
                                    )}
                                  </div>
                                  
                                  {/* Crown for 1st place */}
                                  {player.rank === 1 && (
                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-pickleball-gold rounded-full flex items-center justify-center shadow-lg">
                                      <Crown className="h-2 w-2 text-white" />
                                    </div>
                                  )}
                                  
                                  {/* Rank Badge for other positions */}
                                  {player.rank > 1 && (
                                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold shadow-lg ${
                                      player.rank <= 3 
                                        ? 'bg-accent text-accent-foreground' 
                                        : 'bg-secondary text-secondary-foreground'
                                    }`}>
                                  {player.rank}
                                    </div>
                                  )}
                                </div>
                                <span className="font-medium">{player.name}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => movePlayer(player.id, 'up')}
                                  disabled={index === 0}
                                >
                                  <ChevronUp className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => movePlayer(player.id, 'down')}
                                  disabled={index === ladderPlayers.length - 1}
                                >
                                  <ChevronDown className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Save Button */}
                    {selectedLadderForEdit && ladderPlayers.length > 0 && (
                      <Button 
                        onClick={saveLadderChanges}
                        disabled={isEditingLadder}
                        className="btn-accent w-full"
                      >
                        {isEditingLadder ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving Changes...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Save Ladder Changes
                          </>
                        )}
                      </Button>
                    )}

                    {selectedLadderForEdit && ladderPlayers.length === 0 && (
                      <div className="text-center py-4 text-muted-foreground">
                        No players found in this ladder
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>






            </div>
          </>
        )}

        {/* Upcoming Matches with Score Submissions */}
        <Card className="card-premium mt-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Upcoming Matches & Score Submissions</CardTitle>
                <CardDescription>
                  Monitor score submissions from players
                </CardDescription>
              </div>
              {upcomingMatches.length > 0 && (
                <Button
                  onClick={handleSendAllMatchNotificationEmails}
                  disabled={sendingAllMatchEmails}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {sendingAllMatchEmails ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Sending Emails...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Send All Match Emails
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {upcomingMatches.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No upcoming matches scheduled</p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingMatches.map((match) => {
                  const scoreStatus = getScoreSubmissionStatus(match);
                  
                  return (
                    <div key={match.id} className="p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">Week {match.week}</Badge>
                        </div>
                                                 <div className="flex items-center space-x-2">
                           <Button
                             size="sm"
                             variant="default"
                             onClick={() => completeMatch(match.id)}
                             disabled={completingMatch === match.id}
                             className="bg-blue-600 hover:bg-blue-700 text-white"
                           >
                             {completingMatch === match.id ? (
                               <Loader2 className="h-4 w-4 animate-spin" />
                             ) : (
                               <Check className="h-4 w-4" />
                             )}
                           </Button>
                           <Button
                             size="sm"
                             variant="outline"
                             onClick={() => handleSendMatchNotificationEmail(match)}
                             disabled={sendingMatchEmail === match.id}
                             className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:hover:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
                           >
                             {sendingMatchEmail === match.id ? (
                               <Loader2 className="h-4 w-4 animate-spin" />
                             ) : (
                               <Mail className="h-4 w-4" />
                             )}
                           </Button>
                           <Button
                             size="sm"
                             variant="outline"
                             onClick={() => handleSendMatchCancellationEmail(match)}
                             disabled={sendingCancellationEmail === match.id}
                             className="bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/20 dark:hover:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800"
                           >
                             {sendingCancellationEmail === match.id ? (
                               <Loader2 className="h-4 w-4 animate-spin" />
                             ) : (
                               <XCircle className="h-4 w-4" />
                             )}
                           </Button>
                                                       <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteMatch(match.id)}
                              disabled={deletingMatch === match.id}
                              className="bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700"
                            >
                              {deletingMatch === match.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <X className="h-4 w-4" />
                              )}
                            </Button>
                         </div>
                      </div>
                      
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-center flex-1">
                          <div className="flex items-center justify-center space-x-2">
                            <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                              #{match.player1_rank}
                            </span>
                            <span className="font-semibold">
                              {match.player1.name}
                            </span>
                          </div>
                        </div>
                        
                        <div className="mx-4 text-muted-foreground font-bold">VS</div>
                        
                        <div className="text-center flex-1">
                          <div className="flex items-center justify-center space-x-2">
                            <span className="font-semibold">
                              {match.player2.name}
                            </span>
                            <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                              #{match.player2_rank}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Score Submission Status */}
                      <div className="p-3 bg-background/50 rounded-lg">
                        <div className="space-y-2">
                          <p className="text-sm font-medium">
                            {scoreStatus.message}
                          </p>
                          
                          {scoreStatus.status === 'none' && (
                            <p className="text-xs text-muted-foreground">
                              Waiting for players to submit scores
                            </p>
                          )}
                          
                          {scoreStatus.status === 'player1' && (
                            <div className="space-y-1">
                              <p className="text-sm">
                                Score: <span className="font-semibold">{scoreStatus.score} | Winner: {scoreStatus.winner}</span>
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Submitted by: {scoreStatus.player1Submitted}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Waiting for {match.player2.name} to submit
                              </p>
                            </div>
                          )}
                          
                          {scoreStatus.status === 'player2' && (
                            <div className="space-y-1">
                              <p className="text-sm">
                                Score: <span className="font-semibold">{scoreStatus.score} | Winner: {scoreStatus.winner}</span>
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Submitted by: {scoreStatus.player2Submitted}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Waiting for {match.player1.name} to submit
                              </p>
                            </div>
                          )}
                          
                          {scoreStatus.status === 'both' && scoreStatus.scoresMatch && (
                            <div className="space-y-1">
                              <p className="text-sm">
                                Final Score: <span className="font-semibold">{scoreStatus.score} | Winner: {scoreStatus.winner}</span>
                              </p>
                              <div className="text-xs text-muted-foreground space-y-1">
                                <p>Submitted by {scoreStatus.player1Submitted}: {scoreStatus.score} | Winner: {scoreStatus.winner}</p>
                                <p>Submitted by {scoreStatus.player2Submitted}: {scoreStatus.score} | Winner: {scoreStatus.winner}</p>
                              </div>
                              <Badge className="bg-success/10 text-success text-xs">
                                Scores Match ✓
                              </Badge>
                            </div>
                          )}
                          
                          {scoreStatus.status === 'both' && !scoreStatus.scoresMatch && (
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
                                ⚠️ Scores differ - Admin review needed
                              </p>
                              <div className="text-xs space-y-1 bg-orange-50 dark:bg-orange-950/20 p-2 rounded border border-orange-200 dark:border-orange-800">
                                <p><strong>{match.player1.name}:</strong> {scoreStatus.player1Score} (Winner: {scoreStatus.player1Winner})</p>
                                <p><strong>{match.player2.name}:</strong> {scoreStatus.player2Score} (Winner: {scoreStatus.player2Winner})</p>
                        </div>
                              <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100 text-xs">
                                Scores Differ - Review Required
                              </Badge>
                              
                              {/* Dispute Resolution Form */}
                              <form onSubmit={resolveScoreDispute} className="space-y-3 pt-2 border-t border-orange-200 dark:border-orange-800">
                                <p className="text-xs font-medium text-orange-800 dark:text-orange-200">
                                  Set Final Score:
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <Label htmlFor="final-score" className="text-xs">Final Score</Label>
                                    <Input
                                      id="final-score"
                                      type="text"
                                      placeholder="e.g., 6-4, 7-5"
                                      value={disputeResolutionForm.matchId === match.id ? disputeResolutionForm.finalScore : ''}
                                      onChange={(e) => setDisputeResolutionForm({
                                        ...disputeResolutionForm,
                                        matchId: match.id,
                                        finalScore: e.target.value
                                      })}
                                      className="h-8 text-xs"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label htmlFor="final-winner" className="text-xs">Winner</Label>
                                    <select
                                      id="final-winner"
                                      className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                      value={disputeResolutionForm.matchId === match.id ? disputeResolutionForm.finalWinner : ''}
                                      onChange={(e) => setDisputeResolutionForm({
                                        ...disputeResolutionForm,
                                        matchId: match.id,
                                        finalWinner: e.target.value
                                      })}
                                    >
                                      <option value="">Select winner</option>
                                      <option value={match.player1.name}>{match.player1.name}</option>
                                      <option value={match.player2.name}>{match.player2.name}</option>
                                    </select>
                                  </div>
                                </div>
                                <Button 
                                  type="submit"
                                  size="sm"
                                  disabled={resolvingDispute || !disputeResolutionForm.finalScore || !disputeResolutionForm.finalWinner || disputeResolutionForm.matchId !== match.id}
                                  className="w-full h-8 text-xs"
                                >
                                  {resolvingDispute ? (
                                    <>
                                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                      Resolving...
                                    </>
                                  ) : (
                                    <>
                                      <Check className="mr-1 h-3 w-3" />
                                      Set Final Score
                                    </>
                                  )}
                                </Button>
                              </form>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Player Match Counts */}
        <Card className="card-premium mt-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-6 w-6 mr-2 text-blue-600" />
              Player Match Counts
            </CardTitle>
            <CardDescription>
              Number of scheduled matches each player is currently assigned to
            </CardDescription>
          </CardHeader>
          <CardContent>
            {playerMatchCounts.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No players found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {playerMatchCounts.map((playerData, index) => {
                  const membership = ladderMemberships.find(m => m.user_id === playerData.user.id);
                  const rank = membership?.current_rank || 0;
                  
                  return (
                    <div key={playerData.user.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {/* Profile Picture with Rank Badge */}
                        <div className="relative">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                            {playerData.user.profile_picture_url ? (
                              <img 
                                src={playerData.user.profile_picture_url} 
                                alt={`${playerData.user.name}'s profile`} 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <UserIcon className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          
                          {/* Crown for 1st place */}
                          {rank === 1 && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-pickleball-gold rounded-full flex items-center justify-center shadow-lg">
                              <Crown className="h-2.5 w-2.5 text-white" />
                            </div>
                          )}
                          
                          {/* Rank Badge for other positions */}
                          {rank > 1 && (
                            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shadow-lg ${
                              rank <= 3 
                                ? 'bg-accent text-accent-foreground' 
                                : 'bg-secondary text-secondary-foreground'
                            }`}>
                              {rank}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold">{playerData.user.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {membership ? membership.ladder.name : 'No ladder'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">
                          {playerData.matchCount}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {playerData.matchCount === 1 ? 'match' : 'matches'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default Admin;