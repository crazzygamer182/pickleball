import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, Loader2, X, Building } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LocationPickerProps {
  latitude?: number;
  longitude?: number;
  locationText?: string;
  onLocationChange: (lat: number | null, lng: number | null, radius: number, locationText?: string) => void;
  className?: string;
}

const LocationPicker = ({ 
  latitude, 
  longitude, 
  locationText,
  onLocationChange, 
  className 
}: LocationPickerProps) => {
  const { toast } = useToast();
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number | null; lng: number | null; name?: string } | null>(
    latitude && longitude ? { lat: latitude, lng: longitude } : null
  );
  const [generalLocation, setGeneralLocation] = useState(locationText || '');
  const [isLoading, setIsLoading] = useState(false);
  const [locationMethod, setLocationMethod] = useState<'current' | 'general' | null>(locationText ? 'general' : null);

  // Fixed radius of 20km
  const FIXED_RADIUS = 20;

  const getUserLocation = () => {
    setIsLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setSelectedLocation({ lat: latitude, lng: longitude, name: 'Current Location' });
          setLocationMethod('current');
          setGeneralLocation('');
          onLocationChange(latitude, longitude, FIXED_RADIUS, '');
          
          setIsLoading(false);
          toast({
            title: "Location detected!",
            description: "Your current location has been set as your preferred playing area.",
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          toast({
            title: "Location access denied",
            description: "Please allow location access in your browser settings or choose a general location.",
            variant: "destructive"
          });
          setIsLoading(false);
        }
      );
    } else {
      toast({
        title: "Location not supported",
        description: "Your browser doesn't support geolocation. Please choose a general location.",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  const handleGeneralLocationChange = (value: string) => {
    setGeneralLocation(value);
    const location = value.trim();
    if (location) {
      setSelectedLocation({ lat: null, lng: null, name: location });
      setLocationMethod('general');
      onLocationChange(null, null, FIXED_RADIUS, location);
    } else {
      setSelectedLocation(null);
      setLocationMethod(null);
      onLocationChange(null, null, FIXED_RADIUS, '');
    }
  };

  const clearLocation = () => {
    setSelectedLocation(null);
    setLocationMethod(null);
    setGeneralLocation('');
    onLocationChange(null, null, FIXED_RADIUS, '');
  };

  const isLocationSet = locationMethod !== null;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <MapPin className="h-5 w-5 mr-2" />
          Preferred Playing Location
        </CardTitle>
        <CardDescription>
          Choose your preferred location to help match you with nearby players.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Option 1: Current Location */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Option 1: Use Current Location</Label>
          <Button
            type="button"
            onClick={getUserLocation}
            disabled={isLoading}
            variant={locationMethod === 'current' ? 'default' : 'outline'}
            className="w-full"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Navigation className="h-4 w-4 mr-2" />
            )}
            Use My Current Location
          </Button>
        </div>

        {/* Option 2: General Location */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Option 2: Choose General Location (or enter multiple locations)</Label>
          <div className="flex space-x-2">
            <Input
              type="text"
              placeholder="e.g., Surrey, Langley, Kitsilano, Burnaby..."
              value={generalLocation}
              onChange={(e) => handleGeneralLocationChange(e.target.value)}
              className="flex-1"
            />
          </div>
        </div>

        {/* Selected Location Display */}
        {selectedLocation && (
                      <div className="flex items-center space-x-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <MapPin className="h-4 w-4 text-blue-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Selected Location
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  {selectedLocation.name}
                </p>
              </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearLocation}
              className="text-red-600 hover:text-red-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}


      </CardContent>
    </Card>
  );
};

export default LocationPicker; 