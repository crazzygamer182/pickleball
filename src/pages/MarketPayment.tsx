import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, DollarSign, ShoppingCart, Loader2, Check, ArrowLeft } from 'lucide-react';
import { Elements } from '@stripe/react-stripe-js';
import { stripePromise } from '@/lib/stripe';
import MarketPaymentForm from '@/components/MarketPaymentForm';

const MarketPayment = () => {
  const [amount, setAmount] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [currentStep, setCurrentStep] = useState<'amount' | 'payment' | 'complete'>('amount');
  const [paymentIntentId, setPaymentIntentId] = useState<string>('');
  const { toast } = useToast();

  const handleAmountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount greater than $0.",
        variant: "destructive"
      });
      return;
    }

    if (!customerName.trim()) {
      toast({
        title: "Missing customer name",
        description: "Please enter the customer's name.",
        variant: "destructive"
      });
      return;
    }

    setCurrentStep('payment');
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    setPaymentIntentId(paymentIntentId);
    setCurrentStep('complete');
    
    toast({
      title: "Payment successful!",
      description: `Payment of $${parseFloat(amount).toFixed(2)} has been processed.`,
    });
  };

  const handlePaymentError = (error: string) => {
    toast({
      title: "Payment failed",
      description: error,
      variant: "destructive"
    });
  };

  if (currentStep === 'complete') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950 dark:to-emerald-950">
        <Card className="w-full max-w-md card-premium">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-green-600 dark:text-green-400">
                Payment Successful!
              </h2>
              <p className="text-muted-foreground">
                Thank you for your purchase of ${parseFloat(amount).toFixed(2)}
              </p>
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                Transaction Complete
              </Badge>
              <Button 
                onClick={() => {
                  setCurrentStep('amount');
                  setAmount('');
                  setCustomerName('');
                  setCustomerEmail('');
                }}
                className="mt-4"
              >
                Process Another Payment
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950 dark:to-indigo-950">
      <div className="max-w-md mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <ShoppingCart className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-gradient mb-2">Market Payment</h1>
          <p className="text-muted-foreground">Complete your purchase securely</p>
        </div>

        {currentStep === 'amount' ? (
          <Card className="card-premium">
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="h-5 w-5 mr-2 text-primary" />
                Set Payment Amount
              </CardTitle>
              <CardDescription>
                Enter the amount and customer information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAmountSubmit} className="space-y-6">
                {/* Amount Input */}
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount ($)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                {/* Customer Name */}
                <div className="space-y-2">
                  <Label htmlFor="customer-name">Customer Name</Label>
                  <Input
                    id="customer-name"
                    type="text"
                    placeholder="John Doe"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                  />
                </div>

                {/* Customer Email (Optional) */}
                <div className="space-y-2">
                  <Label htmlFor="customer-email">Customer Email (Optional)</Label>
                  <Input
                    id="customer-email"
                    type="email"
                    placeholder="john@example.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                  />
                </div>

                {/* Payment Summary */}
                {amount && parseFloat(amount) > 0 && (
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total Amount:</span>
                      <span className="text-lg font-bold text-primary">
                        ${parseFloat(amount).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Continue Button */}
                <Button 
                  type="submit" 
                  className="btn-hero w-full" 
                  disabled={!amount || parseFloat(amount) <= 0 || !customerName.trim()}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Continue to Payment
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <Button 
              variant="outline" 
              onClick={() => setCurrentStep('amount')}
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Amount
            </Button>
            <Elements stripe={stripePromise}>
              <MarketPaymentForm
                onPaymentSuccess={handlePaymentSuccess}
                onPaymentError={handlePaymentError}
                customerName={customerName}
                customerEmail={customerEmail}
                paymentAmount={Math.round(parseFloat(amount) * 100)} // Convert to cents
              />
            </Elements>
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketPayment; 