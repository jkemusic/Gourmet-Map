export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Place {
  id: string; // Could be a Place ID from Google or a generated one
  name: string;
  address?: string;
  location: Coordinates;
  rating?: number; // Aggregate rating or Google rating
  reviews?: number; // Number of reviews
  googleMapsUri?: string;
}

export interface CheckIn {
  id: string;
  placeId: string;
  timestamp: number;
  rating: number; // 1-5
  text: string;
  image?: string; // Base64 string
}

export interface SavedPlace extends Place {
  myCheckIns: CheckIn[];
}
