import { useState, useEffect } from 'react';
import { Calendar, Clock, Search, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase, type Match, type User } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const Matches = () => {
  const { user } = useAuth();
  const [searchPlayer, setSearchPlayer] = useState('');
  const [matches, setMatches] = useState<Array<Match & { 
    player1: User; 
    player2: User; 
    player1_rank?: number;
    player2_rank?: number;
  }>>([]);
  const [loading, setLoading] = useState(true);

  // Fetch matches data
  useEffect(() => {
    const fetchMatches = async () => {
      try {
        // Fetch matches with player data
        const { data: matchesData, error: matchesError } = await supabase
          .from('matches')
          .select(`
            *,
            player1:users!matches_player1_id_fkey(*),
            player2:users!matches_player2_id_fkey(*)
          `)
          .order('week', { ascending: false })
          .order('created_at', { ascending: false });

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

        setMatches(matchesWithRanks);
      } catch (error) {
        console.error('Error fetching matches:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, []);

  const filteredMatches = matches.filter(match => {
    const playerFilter = searchPlayer === '' || 
      match.player1.name.toLowerCase().includes(searchPlayer.toLowerCase()) ||
      match.player2.name.toLowerCase().includes(searchPlayer.toLowerCase());
    
    return playerFilter;
  });

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

  const MatchCard = ({ match }: { match: any }) => (
    <Card className="card-premium">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">Week {match.week}</CardTitle>
            <div className="flex items-center text-muted-foreground text-sm mt-1">
              <Calendar className="h-4 w-4 mr-1" />
              {match.played_at ? new Date(match.played_at).toLocaleDateString() : 'TBD'}
            </div>
          </div>
          <div className="text-right">
            {getStatusBadge(match.status)}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Players */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-center flex-1">
            <div className="flex items-center justify-center space-x-2">
              <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                #{match.player1_rank}
              </span>
              <span className="font-semibold">{match.player1.name}</span>
            </div>
          </div>
          
          <div className="mx-4 text-muted-foreground font-bold">VS</div>
          
          <div className="text-center flex-1">
            <div className="flex items-center justify-center space-x-2">
              <span className="font-semibold">{match.player2.name}</span>
              <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                #{match.player2_rank}
              </span>
            </div>
          </div>
        </div>

        {/* Match Details */}
        {match.status === 'scheduled' && (
          <div className="flex items-center justify-center text-sm text-muted-foreground">
            <Clock className="h-4 w-4 mr-1" />
            Match scheduled - players to arrange time
          </div>
        )}

        {match.status === 'completed' && match.player1_score !== null && match.player2_score !== null && (
          <div className="text-center">
            <div className="text-sm font-semibold text-success mb-1">
              Match Completed
            </div>
            <div className="text-sm text-muted-foreground">
              Score: {match.player1_score} - {match.player2_score}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gradient">Match Schedule</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            View upcoming matches and recent results from both ladders
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="card-premium">
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold text-primary">{matches.length}</div>
              <div className="text-sm text-muted-foreground">Total Matches</div>
            </CardContent>
          </Card>
          <Card className="card-premium">
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold text-accent">{matches.filter(m => m.status === 'completed').length}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </CardContent>
          </Card>
          <Card className="card-premium">
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold text-success">{matches.filter(m => m.status === 'scheduled').length}</div>
              <div className="text-sm text-muted-foreground">Scheduled</div>
            </CardContent>
          </Card>
          <Card className="card-premium">
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold text-muted-foreground">
                {matches.length > 0 ? Math.round((matches.filter(m => m.status === 'completed').length / matches.length) * 100) : 0}%
              </div>
              <div className="text-sm text-muted-foreground">Completion Rate</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="card-premium mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by player name..."
                    value={searchPlayer}
                    onChange={(e) => setSearchPlayer(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Matches List */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {filteredMatches.length > 0 ? (
              filteredMatches.map(match => (
                <MatchCard key={match.id} match={match} />
              ))
            ) : (
              <Card className="card-premium">
                <CardContent className="pt-6 text-center py-12">
                  <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No matches found</h3>
                  <p className="text-muted-foreground">
                    {matches.length === 0 ? "No matches have been created yet." : "Try adjusting your search criteria or filters"}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Call to Action */}
        <div className="text-center mt-16 p-8 pickleball-court-bg rounded-2xl">
          <h3 className="text-2xl font-bold mb-4">Ready to Play?</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Join a ladder and get matched with players at your level every week
          </p>
          <Button className="btn-hero" onClick={() => window.location.href = '/join'}>
            Join a Ladder
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Matches;