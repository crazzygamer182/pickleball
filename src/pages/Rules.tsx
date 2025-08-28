import { ArrowLeft, Calendar, Users, Trophy, Phone, Mail, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const Rules = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-4xl font-bold text-gradient mb-2">Pickleball Ladder Rules</h1>
          <p className="text-muted-foreground">Everything you need to know about playing in our pickleball ladders</p>
        </div>

        {/* Match Coordination */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-6 w-6 mr-2 text-primary" />
              Match Coordination
            </CardTitle>
            <CardDescription>
              How to schedule and coordinate your matches
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Important: Coordinate with Your Opponent
              </h3>
              <p className="text-blue-700 dark:text-blue-300 text-sm">
                Once matches are scheduled, it's your responsibility to contact your opponent and arrange a time and location that works for both players.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center">
                  <Phone className="h-4 w-4 mr-2 text-green-600" />
                  Contact Information
                </h4>
                <ul className="text-sm space-y-2 text-muted-foreground">
                  <li>• Use the contact information provided in your dashboard</li>
                  <li>• Reach out within 48 hours of match assignment</li>
                  <li>• Be flexible with scheduling</li>
                  <li>• Confirm match details in advance</li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-orange-600" />
                  Match Deadlines
                </h4>
                <ul className="text-sm space-y-2 text-muted-foreground">
                  <li>• Report scores within 24 hours of match completion</li>
                  <li>• Contact admin if you can't complete your match</li>
                  <li>• Both players must agree on any postponements</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Match Format Rules */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Trophy className="h-6 w-6 mr-2 text-primary" />
              Match Format & Scoring
            </CardTitle>
            <CardDescription>
              Official match format and scoring rules for all ladders
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Official Match Format */}
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center mb-3">
                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 mr-2">
                  Official Format
                </Badge>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                  Best of 3 Games
                </h3>
              </div>
              <div className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
                <p><strong>Format:</strong> Best of 3 games (first to win 2 games)</p>
                <p><strong>Game Scoring:</strong> Each game to 11 points (win by 2)</p>
                <p><strong>Serving:</strong> Each player serves 2 consecutive points, then switch</p>
                <p><strong>Side Changes:</strong> Switch sides at the end of each game</p>
                <p><strong>Third Game:</strong> If needed, switch sides when first player reaches 6 points</p>
                <p><strong>Note:</strong> This format applies to all ladders (casual and competitive)</p>
              </div>
            </div>

            {/* General Pickleball Rules */}
            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
              <h4 className="font-semibold mb-3 text-gray-900 dark:text-gray-100">
                Key Pickleball Rules
              </h4>
              <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-700 dark:text-gray-300">
                <div className="space-y-2">
                  <p><strong>Double Bounce Rule:</strong> Ball must bounce once on each side before volleys</p>
                  <p><strong>Non-Volley Zone:</strong> No volleying within 7 feet of net (the kitchen)</p>
                  <p><strong>Service:</strong> Underhand, below waist, diagonally cross-court</p>
                  <p><strong>Service Position:</strong> Behind baseline, within service court boundaries</p>
                </div>
                <div className="space-y-2">
                  <p><strong>Faults:</strong> Out of bounds, into net, kitchen violation</p>
                  <p><strong>Let Serves:</strong> Re-serve if ball hits net and lands in proper court</p>
                  <p><strong>Line Calls:</strong> Lines are considered in</p>
                  <p><strong>Retirement:</strong> If a player retires, opponent wins the match</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ladder Rules */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-6 w-6 mr-2 text-primary" />
              Ladder Rules & Movement
            </CardTitle>
            <CardDescription>
              How the ladder system works
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-semibold">Ranking Movement</h4>
                <ul className="text-sm space-y-2 text-muted-foreground">
                  <li>• Winner moves up in ranking</li>
                  <li>• Loser moves down in ranking</li>
                  <li>• Rankings update when scores are submitted</li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-semibold">Match Requirements</h4>
                <ul className="text-sm space-y-2 text-muted-foreground">
                  <li>• Both players must be present and ready to play</li>
                  <li>• Warm-up time: 5-10 minutes maximum</li>
                  <li>• Bring your own pickleballs (outdoor balls preferred)</li>
                  <li>• Wear appropriate court shoes and athletic attire</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sportsmanship */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Sportsmanship & Conduct</CardTitle>
            <CardDescription>
              Expected behavior on and off the court
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                  Code of Conduct
                </h4>
                <ul className="text-sm space-y-1 text-yellow-700 dark:text-yellow-300">
                  <li>• Treat opponents with respect and courtesy</li>
                  <li>• Call lines fairly and honestly (lines are in)</li>
                  <li>• Accept line calls in good faith</li>
                  <li>• No coaching during matches</li>
                  <li>• Keep noise levels appropriate</li>
                  <li>• Wait for your turn on court - respect others playing</li>
                  <li>• Clean up after your match</li>
                </ul>
              </div>
              
              <div className="text-sm text-muted-foreground">
                <p><strong>Disputes:</strong> If there's a disagreement about a call, replay the point. For serious disputes, contact the ladder administrator.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Need Help?</CardTitle>
            <CardDescription>
              Contact us if you have questions or need assistance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-3 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  Email us at vancouverpickleballsmash@gmail.com
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  We're here to help with any questions about rules, scheduling, or ladder operations.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Rules; 