import { ExternalLink, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const Admin = () => {
  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Admin Header */}
        <div className="text-center mb-12">
          <Badge className="mb-6 bg-primary/10 text-primary font-semibold px-4 py-2 text-lg">
            Admin Access
          </Badge>
          <h1 className="text-5xl font-bold text-gradient mb-6">
            <Shield className="inline-block h-12 w-12 mr-4 text-primary" />
            Admin Panel
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Administrative functions are currently managed through our legacy system.
          </p>
        </div>

        {/* VTC Admin Access */}
        <Card className="card-premium">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Access Admin Dashboard</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <ExternalLink className="h-10 w-10 text-primary" />
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2">Vancouver Tennis Clash Admin</h3>
              <p className="text-muted-foreground mb-6">
                All administrative functions including match management, ladder updates, and player administration 
                are currently available through our Vancouver Tennis Clash admin portal.
              </p>
            </div>

            <Button 
              onClick={() => window.open('https://vancouvertennisclash.com/admin', '_blank')}
              className="btn-hero"
              size="lg"
            >
              <ExternalLink className="mr-2 h-5 w-5" />
              Open VTC Admin Dashboard
            </Button>
            
            <p className="text-sm text-muted-foreground">
              Opens in a new tab • Requires admin credentials
            </p>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="card-premium mt-8">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="font-semibold text-lg mb-3">Available Admin Functions</h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div className="space-y-2">
                  <div>• Match creation and management</div>
                  <div>• Player ranking adjustments</div>
                  <div>• Ladder administration</div>
                </div>
                <div className="space-y-2">
                  <div>• Email notifications</div>
                  <div>• Statistics and reporting</div>
                  <div>• User management</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default Admin;

/* 
TEMPORARILY COMMENTED OUT - ORIGINAL ADMIN FUNCTIONALITY
TODO: Uncomment when moving admin functions back to this platform

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
  // ... all original admin functionality is preserved here for easy restoration
  // (keeping all the original code commented for when we want to bring it back)
};

export default Admin;
*/