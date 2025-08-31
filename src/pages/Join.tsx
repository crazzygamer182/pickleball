import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LocationPicker from '@/components/LocationPicker';
import { CheckCircle, Trophy, Users, Star, ArrowRight, Loader2, CreditCard, User } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase, type Ladder } from '@/lib/supabase';
import { Elements } from '@stripe/react-stripe-js';
import { stripePromise } from '@/lib/stripe';
import PaymentForm from '@/components/PaymentForm';

const Join = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    ladder: 'casual'
  });
  const [locationData, setLocationData] = useState({
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
    travel_radius_km: 20,
    locationText: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [ladders, setLadders] = useState<Ladder[]>([]);
  const [currentStep, setCurrentStep] = useState<'form' | 'payment' | 'complete'>('form');
  const [paymentIntentId, setPaymentIntentId] = useState<string>('');
  const { toast } = useToast();

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Fetch available ladders
  useEffect(() => {
    const fetchLadders = async () => {
      try {
        const { data, error } = await supabase
          .from('ladders')
          .select('*')
          .eq('sport', 'pickleball')
          .order('name');
        
        if (error) throw error;
        setLadders(data || []);
      } catch (error) {
        console.error('Error fetching ladders:', error);
        toast({
          title: "Error loading ladders",
          description: "Please refresh the page and try again.",
          variant: "destructive"
        });
      }
    };

    fetchLadders();
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.name || !formData.email || !formData.password || !formData.phone || !formData.ladder) {
      toast({
        title: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive"
      });
      return;
    }

    // Location validation
    if ((!locationData.latitude || !locationData.longitude) && !locationData.locationText) {
      toast({
        title: "Location required",
        description: "Please choose either your current location or select a general location.",
        variant: "destructive"
      });
      return;
    }

    // Move to payment step
    setCurrentStep('payment');
  };

  const handleLocationChange = (lat: number | null, lng: number | null, radius: number, locationText?: string) => {
    setLocationData({
      latitude: lat || undefined,
      longitude: lng || undefined,
      travel_radius_km: radius,
      locationText: locationText || ''
    });
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    setPaymentIntentId(paymentIntentId);
    setIsLoading(true);

    try {
      // 1. Create user account with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. Create user profile
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            name: formData.name,
            email: formData.email,
            phone_number: formData.phone,
            preferred_latitude: locationData.latitude,
            preferred_longitude: locationData.longitude,
            travel_radius_km: locationData.travel_radius_km,
            location_text: locationData.locationText,
            type: 'pickleball'
          });

        if (profileError) throw profileError;

        // 3. Get the selected ladder
        const selectedLadder = ladders.find(l => l.id === formData.ladder);
        if (!selectedLadder) throw new Error('Selected ladder not found');

        // 4. Get the next rank (bottom of ladder)
        const { data: memberships, error: rankError } = await supabase
          .from('ladder_memberships')
          .select('current_rank')
          .eq('ladder_id', formData.ladder)
          .eq('is_active', true)
          .order('current_rank', { ascending: false })
          .limit(1);

        if (rankError) throw rankError;

        const nextRank = (memberships?.[0]?.current_rank || 0) + 1;

        // 5. Add user to ladder
        const { error: membershipError } = await supabase
          .from('ladder_memberships')
          .insert({
            user_id: authData.user.id,
            ladder_id: formData.ladder,
            current_rank: nextRank
          });

        if (membershipError) throw membershipError;

        // 6. Update payment record with success
        const { error: paymentError } = await supabase
          .from('payments')
          .insert({
            user_id: authData.user.id,
            ladder_id: formData.ladder,
            amount: selectedLadder.fee,
            status: 'completed',
            paid_at: new Date().toISOString()
          });

        if (paymentError) throw paymentError;

        // Automatically sign the user in after successful registration
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password
        });

        if (signInError) {
          console.error('Auto sign-in error:', signInError);
          // If auto sign-in fails, still show success but redirect to sign-in
          setCurrentStep('complete');
          toast({
            title: "Registration Successful!",
            description: `Welcome to ${selectedLadder.name}! Please sign in to access your dashboard.`,
          });
          setTimeout(() => {
            navigate('/signin');
          }, 3000);
        } else {
          // Auto sign-in successful - redirect to dashboard
          toast({
            title: "Welcome to Vancouver Pickleball Smash!",
            description: `Successfully joined ${selectedLadder.name}. You're now signed in!`,
          });
          navigate('/dashboard');
        }
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: "Registration Failed",
        description: error.message || "Please try again.",
        variant: "destructive"
      });
      setCurrentStep('form');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentError = (error: string) => {
    console.error('Payment error:', error);
    setCurrentStep('form');
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };



  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gradient">Join the Ladder</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Ready to compete? Join Vancouver's most active pickleball community and start climbing the rankings
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Form or Payment */}
          <div>
            {currentStep === 'form' && (
              <Card className="card-premium">
                <CardHeader>
                  <CardTitle className="text-2xl">Player Registration</CardTitle>
                  <CardDescription>
                    Fill out the form below to join one of our ladder systems
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Enter your full name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      required
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      required
                    />
                  </div>

                  {/* Phone Number */}
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="Enter your phone number"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      required
                    />
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Create a password (min 6 characters)"
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      required
                    />
                  </div>



                  {/* Ladder Preference */}
                  <div className="space-y-3">
                    <Label>Ladder Preference *</Label>
                    <RadioGroup
                      value={formData.ladder}
                      onValueChange={(value) => handleInputChange('ladder', value)}
                    >
                      {ladders.map((ladder) => (
                        <div key={ladder.id} className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                          <RadioGroupItem value={ladder.id} id={ladder.id} />
                          <div className="flex-1">
                            <Label htmlFor={ladder.id} className="cursor-pointer">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  {ladder.type === 'competitive' ? (
                                    <Trophy className="h-5 w-5 text-primary" />
                                  ) : ladder.type === 'casual' ? (
                                    <Users className="h-5 w-5 text-accent-foreground" />
                                  ) : (
                                    <Users className="h-5 w-5 text-muted-foreground" />
                                  )}
                                  <span className="font-semibold">{ladder.name}</span>
                                </div>
                                <span className="text-sm font-medium text-primary">${ladder.fee}</span>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {ladder.type === 'competitive' 
                                  ? 'For experienced players (3.0-4.0 skill level) seeking competitive matches'
                                  : ladder.type === 'casual'
                                  ? 'For beginners and recreational players (2.0-2.5 skill level) focused on fun, learning, and flexible scheduling'
                                  : 'Ladder description not available'
                                }
                              </p>
                            </Label>
                          </div>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  {/* Location Picker */}
                  <LocationPicker
                    latitude={locationData.latitude}
                    longitude={locationData.longitude}
                    onLocationChange={handleLocationChange}
                    className="mt-6"
                  />

                  <Button type="submit" className="btn-hero w-full group" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      <>
                        Join the Ladder
                        <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
            )}

            {currentStep === 'payment' && (
              <div className="space-y-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep('form')}
                  className="mb-4"
                >
                  ← Back to Registration
                </Button>
                <Elements stripe={stripePromise}>
                  <PaymentForm
                    onPaymentSuccess={handlePaymentSuccess}
                    onPaymentError={handlePaymentError}
                    userEmail={formData.email}
                    userName={formData.name}
                    paymentAmount={ladders.find(l => l.id === formData.ladder)?.fee * 100 || 500}
                  />
                </Elements>
              </div>
            )}

            {currentStep === 'complete' && (
              <Card className="card-premium">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Registration Complete!</h3>
                    <p className="text-muted-foreground mb-4">
                      Your account has been created and payment processed successfully.
                    </p>
                    <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800 mb-4">
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                        🔄 Redirecting...
                      </h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        You should be automatically signed in and redirected to your dashboard. 
                        If not, you'll be taken to the sign-in page.
                      </p>
                    </div>
                    {isLoading && (
                      <div className="flex items-center justify-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Setting up your account...</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Info Panel */}
          <div className="space-y-6">
            {/* What to Expect */}
            <Card className="card-premium">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Star className="h-6 w-6 mr-2 text-accent" />
                  What to Expect
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-success mt-0.5" />
                    <span>Weekly match assignments based on your ranking</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-success mt-0.5" />
                    <span>Fair and transparent ranking system</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-success mt-0.5" />
                    <span>Active community of pickleball enthusiasts</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-success mt-0.5" />
                    <span>Flexible scheduling with your opponent</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-success mt-0.5" />
                    <span>Season-end tournaments and social events</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-success mt-0.5" />
                    <span>Current season starts September 1st and ends October 1st, 2025</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Skill Level Guide */}
            <Card className="card-premium">
              <CardHeader>
                <CardTitle>Skill Level Guide</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                         <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">Casual Ladder (2.0-2.5)</h4>
                    <p className="text-xs text-blue-700 dark:text-blue-300">Perfect for beginners and recreational players</p>
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">Competitive Ladder (3.0-4.0)</h4>
                    <p className="text-xs text-blue-700 dark:text-blue-300">For experienced players seeking competitive matches</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Not sure about your skill level? Start with casual - you can always move up!
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Requirements */}
            <Card className="card-premium">
              <CardHeader>
                <CardTitle>Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Must be 16+ years old</li>
                  <li>• Own pickleball equipment (paddle, appropriate shoes)</li>
                  <li>• Committed to weekly match participation</li>
                  <li>• Respectful and sportsmanlike conduct</li>
                </ul>
              </CardContent>
            </Card>

            {/* Contact Info */}
            <Card className="card-premium pickleball-court-bg">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-2">Questions?</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Email us at vancouverpickleballsmash@gmail.com
                </p>
                <p className="text-xs text-muted-foreground">
                  We typically respond within 24 hours
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Join;