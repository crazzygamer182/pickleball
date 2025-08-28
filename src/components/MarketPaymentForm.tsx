import { useState } from 'react';
import { CardNumberElement, CardExpiryElement, CardCvcElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, CreditCard, CheckCircle, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MarketPaymentFormProps {
  onPaymentSuccess: (paymentIntentId: string) => void;
  onPaymentError: (error: string) => void;
  customerName: string;
  customerEmail: string;
  paymentAmount: number; // Amount in cents
}

const MarketPaymentForm = ({ onPaymentSuccess, onPaymentError, customerName, customerEmail, paymentAmount }: MarketPaymentFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [postalCode, setPostalCode] = useState('');
  const { toast } = useToast();

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
      // Create payment intent using Supabase Edge Function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          amount: paymentAmount,
          email: customerEmail || 'market@example.com',
          name: customerName,
          description: 'Market Purchase',
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
            name: customerName,
            email: customerEmail || undefined,
            address: {
              postal_code: postalCode || undefined,
            },
          },
        },
      });

      if (error) {
        throw new Error(error.message || 'Payment failed');
      }

      if (paymentIntent.status === 'succeeded') {
        onPaymentSuccess(paymentIntent.id);
      } else {
        throw new Error('Payment was not successful');
      }

    } catch (error: any) {
      console.error('Payment error:', error);
      onPaymentError(error.message || 'Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="card-premium">
      <CardHeader>
        <CardTitle className="flex items-center">
          <CreditCard className="h-5 w-5 mr-2 text-primary" />
          Payment Information
        </CardTitle>
        <CardDescription>
          Enter your card details to complete the payment
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Payment Summary */}
          <div className="p-4 bg-muted/30 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Customer:</span>
              <span className="font-medium">{customerName}</span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm text-muted-foreground">Amount:</span>
              <span className="text-lg font-bold text-primary">
                ${(paymentAmount / 100).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Card Number */}
          <div className="space-y-2">
            <Label htmlFor="card-number">Card Number</Label>
            <div className="relative">
              <CardNumberElement
                id="card-number"
                options={{
                  style: {
                    base: {
                      fontSize: '16px',
                      color: 'hsl(var(--foreground))',
                      '::placeholder': {
                        color: 'hsl(var(--muted-foreground))',
                      },
                      padding: '10px 12px',
                      border: '1px solid hsl(var(--input))',
                      borderRadius: '6px',
                      backgroundColor: 'hsl(var(--background))',
                    },
                    invalid: {
                      color: 'hsl(var(--destructive))',
                    },
                  },
                }}
              />
            </div>
          </div>

          {/* Expiry and CVC */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="card-expiry">Expiry Date</Label>
              <CardExpiryElement
                id="card-expiry"
                options={{
                  style: {
                    base: {
                      fontSize: '16px',
                      color: 'hsl(var(--foreground))',
                      '::placeholder': {
                        color: 'hsl(var(--muted-foreground))',
                      },
                      padding: '10px 12px',
                      border: '1px solid hsl(var(--input))',
                      borderRadius: '6px',
                      backgroundColor: 'hsl(var(--background))',
                    },
                    invalid: {
                      color: 'hsl(var(--destructive))',
                    },
                  },
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="card-cvc">CVC</Label>
              <CardCvcElement
                id="card-cvc"
                options={{
                  style: {
                    base: {
                      fontSize: '16px',
                      color: 'hsl(var(--foreground))',
                      '::placeholder': {
                        color: 'hsl(var(--muted-foreground))',
                      },
                      padding: '10px 12px',
                      border: '1px solid hsl(var(--input))',
                      borderRadius: '6px',
                      backgroundColor: 'hsl(var(--background))',
                    },
                    invalid: {
                      color: 'hsl(var(--destructive))',
                    },
                  },
                }}
              />
            </div>
          </div>

          {/* Postal Code */}
          <div className="space-y-2">
            <Label htmlFor="postal-code">Postal Code (Optional)</Label>
            <Input
              id="postal-code"
              type="text"
              placeholder="12345"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
            />
          </div>

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="btn-hero w-full" 
            disabled={isProcessing || !stripe}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing Payment...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Pay ${(paymentAmount / 100).toFixed(2)}
              </>
            )}
          </Button>
        </form>

        {/* Security Notice */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
            <div className="text-xs text-blue-700 dark:text-blue-300">
              <p className="font-medium mb-1">Secure Payment</p>
              <p>Your payment information is encrypted and secure. We do not store your card details.</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MarketPaymentForm; 