import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Loader2, CreditCard, Calendar, Trophy } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase, type PickleballLadder, type PickleballLadderMembership } from '@/lib/supabase';
import { Elements } from '@stripe/react-stripe-js';
import { stripePromise } from '@/lib/stripe';
import PaymentForm from '@/components/PaymentForm';
import { useAuth } from '@/contexts/AuthContext';

const Renew = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [inactiveMemberships, setInactiveMemberships] = useState<Array<PickleballLadderMembership & { ladder: PickleballLadder }>>([]);
  const [currentStep, setCurrentStep] = useState<'select' | 'payment' | 'complete'>('select');
  const [selectedMembership, setSelectedMembership] = useState<(PickleballLadderMembership & { ladder: PickleballLadder }) | null>(null);
  const { toast } = useToast();

  // Redirect to sign in if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/signin');
    }
  }, [user, authLoading, navigate]);

  // Fetch inactive memberships
  useEffect(() => {
    if (!user) return;

    const fetchInactiveMemberships = async () => {
      try {
        const { data, error } = await supabase
          .from('pickleball_ladder_memberships')
          .select(`
            *,
            ladder:pickleball_ladders(*)
          `)
          .eq('user_id', user.id)
          .eq('active', false);

        if (error) throw error;
        setInactiveMemberships(data || []);
      } catch (error) {
        console.error('Error fetching memberships:', error);
        toast({
          title: "Error loading memberships",
          description: "Please refresh the page and try again.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchInactiveMemberships();
  }, [user, toast]);

  const handleRenewClick = (membership: PickleballLadderMembership & { ladder: PickleballLadder }) => {
    setSelectedMembership(membership);
    setCurrentStep('payment');
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    if (!selectedMembership || !user) return;

    try {
      // Update membership to active
      const { error: updateError } = await supabase
        .from('pickleball_ladder_memberships')
        .update({ active: true })
        .eq('id', selectedMembership.id);

      if (updateError) throw updateError;

      // Record payment
      const { error: paymentError } = await supabase
        .from('pickleball_payments')
        .insert({
          user_id: user.id,
          ladder_id: selectedMembership.ladder_id,
          amount: selectedMembership.ladder.fee,
          status: 'completed',
          paid_at: new Date().toISOString()
        });

      if (paymentError) throw paymentError;

      toast({
        title: "Membership Renewed!",
        description: "Your membership has been successfully renewed.",
      });

      // Redirect to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Error renewing membership:', error);
      toast({
        title: "Error renewing membership",
        description: "Please try again or contact support.",
        variant: "destructive"
      });
    }
  };

  // Don't render anything if auth is still loading or if not authenticated
  if (authLoading || !user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If no inactive memberships, redirect to dashboard
  if (inactiveMemberships.length === 0 && currentStep === 'select') {
    navigate('/dashboard');
    return null;
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gradient">Renew Your Membership</h1>
          <p className="text-muted-foreground mt-2">Continue playing in the pickleball ladder</p>
        </div>

        {currentStep === 'select' && (
          <>
            {/* Season Information Card */}
            <Card className="mb-8 border-blue-500 bg-blue-50 dark:bg-blue-950/20">
              <CardContent className="pt-6">
                <div className="flex items-start space-x-3">
                  <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100 text-lg mb-2">
                      October Season
                    </h3>
                    <p className="text-blue-700 dark:text-blue-300">
                      Renewing will allow you to play matches until <strong>November 1st</strong>, which is the end of the October season.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Inactive Memberships */}
            <Card className="card-premium">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="h-6 w-6 mr-2 text-orange-600" />
                  Expired Memberships
                </CardTitle>
                <CardDescription>
                  Select a membership to renew
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {inactiveMemberships.map((membership) => (
                    <Card key={membership.id} className="border-2">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center">
                              <Trophy className="h-6 w-6" />
                            </div>
                            <div>
                              <h3 className="text-xl font-semibold">{membership.ladder.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                Pickleball Ladder
                              </p>
                              <p className="text-lg font-bold text-primary mt-2">
                                ${membership.ladder.fee}
                              </p>
                            </div>
                          </div>
                          <Button
                            onClick={() => handleRenewClick(membership)}
                            className="btn-hero"
                          >
                            <CreditCard className="h-4 w-4 mr-2" />
                            Renew Now
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {currentStep === 'payment' && selectedMembership && (
          <Card className="card-premium">
            <CardHeader>
              <CardTitle>Complete Your Renewal</CardTitle>
              <CardDescription>
                Renewing {selectedMembership.ladder.name} for ${selectedMembership.ladder.fee}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Elements stripe={stripePromise}>
                <PaymentForm
                  paymentAmount={selectedMembership.ladder.fee * 100}
                  onPaymentSuccess={handlePaymentSuccess}
                  onPaymentError={(error) => {
                    console.error('Payment error:', error);
                    toast({
                      title: "Payment failed",
                      description: error,
                      variant: "destructive"
                    });
                    setCurrentStep('select');
                  }}
                  userEmail={user?.email || ''}
                  userName={user?.user_metadata?.name || ''}
                />
              </Elements>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Renew;