import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LocationPicker from '@/components/LocationPicker';
import { CheckCircle, Trophy, Users, Star, ArrowRight, Loader2, CreditCard, User, Calendar, Mail, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase, type Ladder } from '@/lib/supabase';
import { sendAdminJoinNotification } from '@/lib/email';
import { Elements } from '@stripe/react-stripe-js';
import { stripePromise } from '@/lib/stripe';
import PaymentForm from '@/components/PaymentForm';
import { Badge } from '@/components/ui/badge';

const WomensLadder = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    ladder: 'women' // Pre-selected for women's ladder
  });
  const [locationData, setLocationData] = useState({
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
    travel_radius_km: 20,
    locationText: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [ladders, setLadders] = useState<Ladder[]>([]);
  const [currentStep, setCurrentStep] = useState<'info' | 'payment' | 'complete'>('info');
  const [paymentIntentId, setPaymentIntentId] = useState<string>('');
  const { toast } = useToast();

  // Fetch women's ladder
  useEffect(() => {
    const fetchLadders = async () => {
      try {
        const { data, error } = await supabase
          .from('ladders')
          .select('*')
          .eq('type', 'women')
          .eq('sport', 'pickleball')
          .order('name');
        
        if (error) throw error;
        setLadders(data || []);
      } catch (error) {
        console.error('Error fetching women\'s ladder:', error);
        toast({
          title: "Error loading ladder",
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
    if (!formData.name || !formData.email || !formData.password || !formData.phone) {
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

        // 3. Create ladder membership
        const womenLadder = ladders.find(l => l.type === 'women');
        if (!womenLadder) {
          throw new Error('Women\'s ladder not found');
        }

        const { error: membershipError } = await supabase
          .from('ladder_memberships')
          .insert({
            user_id: authData.user.id,
            ladder_id: womenLadder.id,
            current_rank: 999, // Will be updated by admin
            is_active: true
          });

        if (membershipError) throw membershipError;

        // 4. Record payment
        const { error: paymentError } = await supabase
          .from('payments')
          .insert({
            user_id: authData.user.id,
            ladder_id: womenLadder.id,
            amount: womenLadder.fee,
            status: 'completed',
            paid_at: new Date().toISOString()
          });

        if (paymentError) throw paymentError;

        // Send admin notification about new user joining
        await sendAdminJoinNotification(formData.name, formData.email, womenLadder.name);

        toast({
          title: "Registration successful!",
          description: "Welcome to the Women's Tennis Ladder!",
        });

        // Move to completion step
        setCurrentStep('complete');

        // Auto-sign in and redirect after a delay
        setTimeout(() => {
          navigate('/dashboard');
        }, 3000);

      } else {
        throw new Error('Failed to create user account');
      }

    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: "Registration failed",
        description: error.message || "Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentError = (error: string) => {
    toast({
      title: "Payment failed",
      description: error,
      variant: "destructive"
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (currentStep === 'complete') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-rose-100 dark:from-pink-950 dark:to-rose-950">
        <Card className="w-full max-w-md card-premium">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-pink-100 dark:bg-pink-900 rounded-full flex items-center justify-center">
                <Check className="h-8 w-8 text-pink-600 dark:text-pink-400" />
              </div>
              <h2 className="text-2xl font-bold text-pink-600 dark:text-pink-400">
                Welcome to the Women's Ladder!
              </h2>
              <p className="text-muted-foreground">
                Your registration is complete and payment has been processed.
              </p>
              <Badge className="bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-100">
                Redirecting to Dashboard...
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="mx-auto w-20 h-20 bg-pink-100 dark:bg-pink-900/20 rounded-full flex items-center justify-center mb-6">
            <User className="h-10 w-10 text-pink-600 dark:text-pink-400" />
          </div>
          <h1 className="text-5xl font-bold text-gradient mb-4">Women's Tennis Ladder</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Join Vancouver's dedicated women's tennis ladder for players of all skill levels (2.0-3.5). 
            Build friendships, improve your game, and compete in a supportive environment.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Registration Form */}
          <div className="space-y-6">
            {currentStep === 'info' && (
              <Card className="card-premium">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="h-6 w-6 mr-2 text-pink-600 dark:text-pink-400" />
                    Join the Women's Ladder
                  </CardTitle>
                  <CardDescription>
                    Create your account and join our women's tennis community
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

                    {/* Phone */}
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

                    {/* Ladder Selection (Pre-selected) */}
                    <div className="space-y-2">
                      <Label>Ladder Selection</Label>
                      <div className="p-4 bg-pink-50 dark:bg-pink-950/20 rounded-lg border border-pink-200 dark:border-pink-800">
                        <div className="flex items-center space-x-2">
                          <User className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                          <span className="font-semibold">Women's Ladder</span>
                          <Badge className="bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-100 ml-auto">
                            $10 Registration
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Dedicated women's ladder for players (2.0-3.5 skill level), fostering a supportive and competitive environment.
                        </p>
                      </div>
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
                          Join Women's Ladder
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
                  onClick={() => setCurrentStep('info')}
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
                    paymentAmount={ladders.find(l => l.type === 'women')?.fee * 100 || 1000}
                  />
                </Elements>
              </div>
            )}
          </div>

          {/* Info Panel */}
          <div className="space-y-6">
            {/* What to Expect */}
            <Card className="card-premium">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Star className="h-6 w-6 mr-2 text-pink-600 dark:text-pink-400" />
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
                    <span>Supportive community of women tennis players</span>
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
                    <span>Current season ends September 20th, 2025</span>
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
                  <div className="p-3 bg-pink-50 dark:bg-pink-950/20 rounded-lg border border-pink-200 dark:border-pink-800">
                    <h4 className="font-semibold text-pink-900 dark:text-pink-100 mb-1">Women's Ladder (2.0-3.5)</h4>
                    <p className="text-xs text-pink-700 dark:text-pink-300">Dedicated women's division for 2.0-3.5 skill level</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Perfect for women players looking to improve their game in a supportive environment!
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Match Format */}
            <Card className="card-premium">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Trophy className="h-6 w-6 mr-2 text-pink-600 dark:text-pink-400" />
                  Match Format
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-3 bg-pink-50 dark:bg-pink-950/20 rounded-lg border border-pink-200 dark:border-pink-800">
                  <h4 className="font-semibold text-pink-900 dark:text-pink-100 mb-2">One Set Format</h4>
                  <div className="space-y-1 text-sm text-pink-700 dark:text-pink-300">
                    <p><strong>Format:</strong> Best of 1 set (first to 6 games)</p>
                    <p><strong>Scoring:</strong> Standard tennis scoring (15, 30, 40, game)</p>
                    <p><strong>Deuce:</strong> Win by 2 points after deuce</p>
                    <p><strong>5-5 Rule:</strong> If score reaches 5-5, play to 7 games</p>
                    <p><strong>6-6 Rule:</strong> If score reaches 6-6, play a tiebreak to 7 points</p>
                  </div>
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
                  <li>• Own tennis equipment (racket, appropriate shoes)</li>
                  <li>• Committed to weekly match participation</li>
                  <li>• Respectful and sportsmanlike conduct</li>
                </ul>
              </CardContent>
            </Card>

            {/* Contact Info */}
            <Card className="card-premium tennis-court-bg">
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

export default WomensLadder; 