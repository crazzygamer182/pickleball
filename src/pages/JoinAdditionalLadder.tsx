import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Users, Star, ArrowRight, Loader2, CreditCard, CheckCircle, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase, type Ladder, type LadderMembership } from '@/lib/supabase';
import { sendAdminJoinNotification } from '@/lib/email';
import { useAuth } from '@/contexts/AuthContext';
import { Elements } from '@stripe/react-stripe-js';
import { stripePromise } from '@/lib/stripe';
import PaymentForm from '@/components/PaymentForm';

const JoinAdditionalLadder = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [ladders, setLadders] = useState<Ladder[]>([]);
  const [userMemberships, setUserMemberships] = useState<LadderMembership[]>([]);
  const [selectedLadder, setSelectedLadder] = useState<Ladder | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<'select' | 'payment' | 'complete'>('select');
  const [paymentIntentId, setPaymentIntentId] = useState<string>('');
  const { toast } = useToast();

  // Redirect to sign in if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/signin');
    }
  }, [user, authLoading, navigate]);

  // Fetch available ladders and user memberships
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        // Fetch all ladders
        const { data: laddersData, error: laddersError } = await supabase
          .from('ladders')
          .select('*')
          .eq('sport', 'pickleball')
          .order('name');
        
        if (laddersError) throw laddersError;
        setLadders(laddersData || []);

        // Fetch user's current memberships
        const { data: membershipsData, error: membershipsError } = await supabase
          .from('ladder_memberships')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true);

        if (membershipsError) throw membershipsError;
        setUserMemberships(membershipsData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: "Error loading ladders",
          description: "Please refresh the page and try again.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, toast]);

  // Get available ladders (ladders user is not already in)
  const getAvailableLadders = () => {
    const userLadderIds = userMemberships.map(m => m.ladder_id);
    return ladders.filter(ladder => !userLadderIds.includes(ladder.id));
  };

  const handleLadderSelect = (ladder: Ladder) => {
    setSelectedLadder(ladder);
    setCurrentStep('payment');
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    if (!user || !selectedLadder) return;

    setPaymentIntentId(paymentIntentId);
    setIsLoading(true);

    try {
      // Get the next rank (bottom of ladder)
      const { data: memberships, error: rankError } = await supabase
        .from('ladder_memberships')
        .select('current_rank')
        .eq('ladder_id', selectedLadder.id)
        .eq('is_active', true)
        .order('current_rank', { ascending: false })
        .limit(1);

      if (rankError) throw rankError;

      const nextRank = (memberships?.[0]?.current_rank || 0) + 1;

      // Add user to ladder
      const { error: membershipError } = await supabase
        .from('ladder_memberships')
        .insert({
          user_id: user.id,
          ladder_id: selectedLadder.id,
          current_rank: nextRank,
          is_active: true
        });

      if (membershipError) throw membershipError;

      // Record payment
        const { error: paymentError } = await supabase
          .from('payments')
          .insert({
            user_id: user.id,
            ladder_id: selectedLadder.id,
          amount: selectedLadder.fee,
            status: 'completed',
            paid_at: new Date().toISOString()
          });

      if (paymentError) throw paymentError;

      // Get user details for admin notification
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('name, email')
        .eq('id', user.id)
        .single();

      if (!userError && userData) {
        // Send admin notification about new user joining
        await sendAdminJoinNotification(userData.name, userData.email, selectedLadder.name);
      }

      setCurrentStep('complete');
      toast({
        title: "Successfully Joined!",
        description: `Welcome to ${selectedLadder.name}!`,
      });

      // Refresh user memberships
      const { data: newMembershipsData, error: newMembershipsError } = await supabase
        .from('ladder_memberships')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (!newMembershipsError) {
        setUserMemberships(newMembershipsData || []);
      }

    } catch (error: any) {
      console.error('Join ladder error:', error);
      toast({
        title: "Failed to join ladder",
        description: error.message || "Please try again.",
        variant: "destructive"
      });
      setCurrentStep('select');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentError = (error: string) => {
    console.error('Payment error:', error);
    setCurrentStep('select');
    toast({
      title: "Payment Failed",
      description: "Please try again.",
      variant: "destructive"
    });
  };

  const handleBackToSelect = () => {
    setSelectedLadder(null);
    setCurrentStep('select');
  };

  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };

  // Show loading spinner while auth is loading
  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const availableLadders = getAvailableLadders();

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gradient">Join Additional Ladder</h1>
              <p className="text-muted-foreground mt-2">Expand your pickleball experience by joining more ladders</p>
            </div>
          <Button 
              variant="outline"
            onClick={() => navigate('/dashboard')}
              className="flex items-center"
          >
              <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
            Back to Dashboard
          </Button>
          </div>
        </div>

            {/* Current Memberships */}
            {userMemberships.length > 0 && (
          <Card className="card-premium mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center">
                <CheckCircle className="h-6 w-6 mr-2 text-blue-600" />
                    Your Current Ladders
                  </CardTitle>
                  <CardDescription>
                You are currently a member of these ladders
                  </CardDescription>
                </CardHeader>
                <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {userMemberships.map((membership) => {
                      const ladder = ladders.find(l => l.id === membership.ladder_id);
                  if (!ladder) return null;

                      return (
                    <div key={membership.id} className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                          <div className="flex items-center space-x-3">
                        <Trophy className="h-5 w-5 text-blue-600" />
                            <div>
                          <p className="font-semibold text-blue-800 dark:text-blue-200">{ladder.name}</p>
                          <p className="text-sm text-blue-600 dark:text-blue-400">Rank #{membership.current_rank}</p>
                            </div>
                          </div>
                          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                        Member
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Available Ladders */}
        {currentStep === 'select' && (
            <Card className="card-premium">
              <CardHeader>
                <CardTitle className="flex items-center">
                <Trophy className="h-6 w-6 mr-2 text-primary" />
                  Available Ladders
                </CardTitle>
                <CardDescription>
                Choose a ladder to join and start competing
                </CardDescription>
              </CardHeader>
              <CardContent>
                {availableLadders.length === 0 ? (
                  <div className="text-center py-8">
                    <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">You're already a member of all available ladders!</p>
                  <Button
                    onClick={handleGoToDashboard}
                    className="mt-4"
                  >
                    Go to Dashboard
                  </Button>
                  </div>
                ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {availableLadders.map((ladder) => (
                    <Card key={ladder.id} className="card-premium hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center">
                            <Trophy className="h-5 w-5 mr-2 text-primary" />
                            {ladder.name}
                          </CardTitle>
                          <Badge variant="outline" className="capitalize">
                            {ladder.type}
                          </Badge>
                        </div>
                        <CardDescription>
                          Join the {ladder.name} ladder and start competing with other players
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Entry Fee:</span>
                            <span className="font-semibold text-lg">${ladder.fee}</span>
                          </div>
                          
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <Users className="h-4 w-4" />
                            <span>Active players</span>
                          </div>

                        <Button 
                          onClick={() => handleLadderSelect(ladder)}
                            className="w-full btn-hero"
                        >
                          <CreditCard className="h-4 w-4 mr-2" />
                            Join for ${ladder.fee}
                        </Button>
                      </div>
                      </CardContent>
                    </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
        )}

        {/* Payment Step */}
        {currentStep === 'payment' && selectedLadder && (
          <Card className="card-premium">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
              <CardTitle className="flex items-center">
                    <CreditCard className="h-6 w-6 mr-2 text-primary" />
                Complete Payment
              </CardTitle>
              <CardDescription>
                    Join {selectedLadder.name} for ${selectedLadder.fee}
              </CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={handleBackToSelect}
                  className="flex items-center"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Elements stripe={stripePromise}>
                <PaymentForm
                  onPaymentSuccess={handlePaymentSuccess}
                  onPaymentError={handlePaymentError}
                  userEmail={user?.email || ''}
                  userName={user?.user_metadata?.name || ''}
                  paymentAmount={selectedLadder.fee * 100}
                />
              </Elements>
            </CardContent>
          </Card>
        )}

        {/* Success Step */}
        {currentStep === 'complete' && selectedLadder && (
          <Card className="card-premium">
            <CardHeader>
              <CardTitle className="flex items-center text-blue-600">
                <CheckCircle className="h-6 w-6 mr-2" />
                Successfully Joined!
              </CardTitle>
              <CardDescription>
                Welcome to {selectedLadder.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Welcome to {selectedLadder.name}!</h3>
                  <p className="text-muted-foreground mb-4">
                    You've successfully joined the ladder. You'll be notified when your first match is scheduled.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    onClick={handleGoToDashboard}
                    className="btn-hero"
                  >
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Go to Dashboard
                  </Button>
              <Button 
                variant="outline" 
                    onClick={() => {
                      setCurrentStep('select');
                      setSelectedLadder(null);
                    }}
                  >
                    Join Another Ladder
              </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default JoinAdditionalLadder; 