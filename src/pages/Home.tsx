import { useEffect } from 'react';
import { ArrowRight, Trophy, Users, Calendar, Mail, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import pickleballHero from '@/assets/pickleball-hero.jpg';

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirect to dashboard if user is already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);



  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${pickleballHero})` }}
        >
          <div className="absolute inset-0 bg-black/40"></div>
        </div>
        
        {/* Hero Content */}
        <div className="relative z-10 text-center text-white max-w-4xl mx-auto px-4">
          <Badge className="mb-6 bg-accent text-accent-foreground font-semibold px-4 py-2">
            Vancouver's Premier Doubles Pickleball Ladder
          </Badge>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Vancouver Pickleball <span className="text-accent">Smash</span>
          </h1>
          
          <p className="text-xl md:text-2xl mb-8 text-gray-200 max-w-2xl mx-auto">
            Weekly doubles matchups. Choose your partner or get matched. Climb your way to the top.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/join">
              <Button className="btn-hero group">
                Join the Ladder
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 text-gradient">How It Works</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Join Vancouver's premier doubles pickleball ladder system designed for teams of all skill levels.
            </p>
          </div>
          
          {/* Ladder Overview */}
          <div className="flex justify-center mb-16 max-w-4xl mx-auto">
            <Card className="card-premium text-center">
              <CardHeader>
                <div className="mx-auto mb-4 p-4 bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center">
                  <Trophy className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-xl">Doubles Pickleball Ladder</CardTitle>
                <Badge className="bg-primary/10 text-primary w-fit mx-auto">Teams • 2.5-4.0 Skill Level</Badge>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Bring your own partner or get matched with someone new each game! Doubles format for players of all levels (2.5-4.0 skill level) looking to improve their doubles game.
                </CardDescription>
              </CardContent>
            </Card>


          </div>

          {/* Weekly Match System */}
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
            <div>
              <h3 className="text-2xl font-bold mb-4">Weekly Doubles Match System</h3>
              <p className="text-lg text-muted-foreground mb-6">
                Every week, you'll receive doubles match assignments against teams near your ranking. 
                Partner with a friend or get matched with someone new each game. Win to climb the ladder, lose and you'll have a chance to bounce back next week.
              </p>
                             <ul className="space-y-3">
                 <li className="flex items-start space-x-3">
                   <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                   <span>Choose your partner or get matched with someone each game</span>
                 </li>
                 <li className="flex items-start space-x-3">
                   <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                   <span>Flexible scheduling with your opponents (4-player doubles)</span>
                 </li>
                 <li className="flex items-start space-x-3">
                   <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                   <span>Fair ranking system based on match results</span>
                 </li>
                 <li className="flex items-start space-x-3">
                   <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                   <span>Track your progress and see your improvement</span>
                 </li>
               </ul>
            </div>
            <Card className="card-premium">
              <CardContent className="pt-6">
                <div className="text-center">
                  <Calendar className="h-16 w-16 text-primary mx-auto mb-4" />
                  <h4 className="text-xl font-semibold mb-2">Season Timeline</h4>
                  <p className="text-muted-foreground mb-4">
                    Current season starts <span className="font-semibold text-primary">September 1st</span> and ends <span className="font-semibold text-primary">October 1st, 2025</span>
                  </p>
                  <Badge className="bg-accent/10 text-accent-foreground">
                    Events & Prizes Coming Soon
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Beginner Friendly Section */}
          <div className="text-center mb-16">
            <h3 className="text-2xl font-bold mb-4">All Skill Levels Welcome</h3>
            <p className="text-lg text-muted-foreground mb-6 max-w-3xl mx-auto">
              New to doubles pickleball? No problem! Our team-based ladder welcomes players from 2.5-4.0 skill level. 
              Choose to play with the same partner every week, or try different partners each game - we'll match you with someone at your skill level. We provide a supportive environment for all players to improve their doubles game.
            </p>
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">🎾</span>
                </div>
                <h4 className="font-semibold mb-2">Teams Welcome</h4>
                <p className="text-sm text-muted-foreground">From beginner to advanced doubles teams</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">🤝</span>
                </div>
                <h4 className="font-semibold mb-2">Flexible Partnering</h4>
                <p className="text-sm text-muted-foreground">Play with friends or get matched each game</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">📈</span>
                </div>
                <h4 className="font-semibold mb-2">Track Team Progress</h4>
                <p className="text-sm text-muted-foreground">See your doubles team improvement over time</p>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-4">Ready to Join?</h3>
            <p className="text-lg text-muted-foreground mb-8">
              Start your pickleball journey today and climb your way to the top!
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Link to="/join">
                <Button className="btn-hero">
                  Join the Ladder
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button variant="outline" className="group">
                <Mail className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                vancouverpickleballsmash@gmail.com
              </Button>
            </div>
            
            <p className="text-muted-foreground">
              Questions? Email us anytime - we typically respond within 24 hours.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;