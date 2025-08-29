import { useState } from 'react';
import { CardNumberElement, CardExpiryElement, CardCvcElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, CreditCard, CheckCircle, Tag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PAYMENT_AMOUNT, PAYMENT_DESCRIPTION, COUPON_CODES } from '@/lib/stripe';

interface PaymentFormProps {
  onPaymentSuccess: (paymentIntentId: string) => void;
  onPaymentError: (error: string) => void;
  userEmail: string;
  userName: string;
  paymentAmount: number; // Amount in cents
}

const PaymentForm = ({ onPaymentSuccess, onPaymentError, userEmail, userName, paymentAmount }: PaymentFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number; description: string } | null>(null);
  const { toast } = useToast();

  // Calculate final amount after coupon
  const finalAmount = appliedCoupon ? Math.round(paymentAmount * (1 - appliedCoupon.discount / 100)) : paymentAmount;
  const discountAmount = appliedCoupon ? Math.round(paymentAmount * (appliedCoupon.discount / 100)) : 0;

  const handleApplyCoupon = () => {
    const coupon = COUPON_CODES[couponCode.toUpperCase()];
    if (coupon) {
      setAppliedCoupon({ code: couponCode.toUpperCase(), ...coupon });
      toast({
        title: "Coupon Applied!",
        description: coupon.description,
      });
    } else {
      toast({
        title: "Invalid Coupon Code",
        description: "Please check your coupon code and try again.",
        variant: "destructive"
      });
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    toast({
      title: "Coupon Removed",
      description: "Coupon has been removed from your order.",
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      toast({
        title: "Payment system not ready",
        description: "Please refresh the page and try again.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    try {
      // If coupon gives 100% off, skip payment and proceed directly
      if (appliedCoupon && appliedCoupon.discount === 100) {
        onPaymentSuccess('COUPON_100_OFF');
        return;
      }

      // Create payment intent using Supabase Edge Function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          amount: finalAmount,
          email: userEmail,
          name: userName,
          description: PAYMENT_DESCRIPTION,
          couponCode: appliedCoupon?.code || null
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create payment intent');
      }

      const { clientSecret } = await response.json();

      // Confirm the payment with Stripe
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardNumberElement)!,
          billing_details: {
            name: userName,
            email: userEmail,
            address: {
              postal_code: postalCode,
            },
          },
        },
      });

      if (error) {
        throw new Error(error.message || 'Payment failed');
      }

      if (paymentIntent.status === 'succeeded') {
        setIsCompleted(true);
        onPaymentSuccess(paymentIntent.id);
        toast({
          title: "Payment Successful!",
          description: "Your registration fee has been processed.",
        });
      } else {
        throw new Error('Payment was not successful');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      onPaymentError(error.message || 'Payment failed');
      toast({
        title: "Payment Failed",
        description: error.message || "Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isCompleted) {
    return (
      <Card className="card-premium">
        <CardContent className="pt-6">
          <div className="text-center">
            <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Payment Successful!</h3>
            <p className="text-muted-foreground">
              Your registration fee has been processed. Creating your account...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const cardElementStyle = {
    style: {
      base: {
        fontSize: '16px',
        color: 'hsl(var(--foreground))',
        '::placeholder': {
          color: 'hsl(var(--muted-foreground))',
        },
        padding: '12px',
        border: '1px solid hsl(var(--border))',
        borderRadius: '6px',
        backgroundColor: 'hsl(var(--background))',
      },
      invalid: {
        color: 'hsl(var(--destructive))',
      },
    },
  };

  return (
    <Card className="card-premium">
      <CardHeader>
        <CardTitle className="flex items-center">
          <CreditCard className="h-6 w-6 mr-2 text-primary" />
          Payment Information
        </CardTitle>
        <CardDescription>
          Complete your registration by paying the ${(paymentAmount / 100).toFixed(2)} season fee
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">Registration Fee:</span>
                <span className="text-2xl font-bold text-primary">${(paymentAmount / 100).toFixed(2)}</span>
              </div>
              {appliedCoupon && (
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-success">Discount ({appliedCoupon.code}):</span>
                  <span className="text-xl font-bold text-success">-${(discountAmount / 100).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center mb-2 border-t pt-2">
                <span className="font-bold">Total:</span>
                <span className="text-2xl font-bold text-primary">${(finalAmount / 100).toFixed(2)}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                One-time fee for the current season (starts September 1st and ends October 1st, 2025)
              </p>
            </div>

            {/* Coupon Code Section */}
            <div className="space-y-3">
              <Label htmlFor="coupon">Coupon Code (Optional)</Label>
              <div className="flex space-x-2">
                <Input
                  id="coupon"
                  type="text"
                  placeholder="Enter coupon code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="flex-1"
                />
                {!appliedCoupon ? (
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleApplyCoupon}
                    disabled={!couponCode.trim()}
                  >
                    <Tag className="h-4 w-4 mr-1" />
                    Apply
                  </Button>
                ) : (
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleRemoveCoupon}
                  >
                    Remove
                  </Button>
                )}
              </div>
              {appliedCoupon && (
                <Badge className="bg-success/10 text-success">
                  ✓ {appliedCoupon.description}
                </Badge>
              )}
            </div>

            {/* Card Information Section */}
            <div className="space-y-4">
              <Label>Card Information</Label>
              
              {/* Card Number */}
              <div className="space-y-2">
                <Label htmlFor="card-number">Card Number</Label>
                <div className="p-3 border rounded-lg bg-background">
                  <CardNumberElement 
                    id="card-number"
                    options={cardElementStyle}
                  />
                </div>
              </div>

              {/* Expiry Date and CVC */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="card-expiry">Expiry Date</Label>
                  <div className="p-3 border rounded-lg bg-background">
                    <CardExpiryElement 
                      id="card-expiry"
                      options={cardElementStyle}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="card-cvc">CVC</Label>
                  <div className="p-3 border rounded-lg bg-background">
                    <CardCvcElement 
                      id="card-cvc"
                      options={cardElementStyle}
                    />
                  </div>
                </div>
              </div>

              {/* Postal Code */}
              <div className="space-y-2">
                <Label htmlFor="card-postal">Postal Code</Label>
                <Input
                  id="card-postal"
                  type="text"
                  placeholder="Enter postal code"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={!stripe || isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing Payment...
              </>
            ) : appliedCoupon && appliedCoupon.discount === 100 ? (
              <>
                Complete Registration (Free with Coupon)
              </>
            ) : (
              <>
                Pay ${(finalAmount / 100).toFixed(2)} & Complete Registration
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Your payment is secure and processed by Stripe. We never store your card information.
          </p>
        </form>
      </CardContent>
    </Card>
  );
};

export default PaymentForm; 