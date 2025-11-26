import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Search, MapPin, Plus, Navigation, Loader2, UtensilsCrossed, Coffee, Beer } from 'lucide-react';
import { Place, CheckIn, SavedPlace, Coordinates } from './types';
import { CheckInModal } from './components/CheckInModal';
import { Timeline } from './components/Timeline';
import { searchPlacesWithGemini } from './services/geminiService';
import { StarRating } from './components/StarRating';

// --- Leaflet Icon Fix ---
// Fix for missing Leaflet default markers in React environments
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom red icon for selected place
const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Helper component to update map view when center changes
function MapUpdater({ center }: { center: Coordinates }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([center.latitude, center.longitude], 15, { duration: 1.5 });
  }, [center, map]);
  return null;
}

const CUISINE_CATEGORIES = [
  { name: '台式', label: '台式料理', icon: '🍚' },
  { name: '日式', label: '日式料理', icon: '🍣' },
  { name: '韓式', label: '韓式料理', icon: '🥘' },
  { name: '火鍋', label: '火鍋', icon: '🍲' },
  { name: '義式', label: '義式料理', icon: '🍝' },
  { name: '美式', label: '美式餐廳', icon: '🍔' },
  { name: '早午餐', label: '早午餐', icon: '🍳' },
  { name: '咖啡廳', label: '咖啡廳', icon: '☕' },
  { name: '甜點', label: '甜點', icon: '🍰' },
  { name: '酒吧', label: '酒吧', icon: '🍺' },
];

const App: React.FC = () => {
  // --- State ---
  // Default to Taipei
  const [currentLocation, setCurrentLocation] = useState<Coordinates>({ latitude: 25.0330, longitude: 121.5654 }); 
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Place[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>(() => {
    const saved = localStorage.getItem('my_gourmet_map_places');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [selectedPlace, setSelectedPlace] = useState<SavedPlace | Place | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewState, setViewState] = useState<'map' | 'list'>('map'); // Mobile toggle

  // --- Effects ---
  useEffect(() => {
    // Save to local storage whenever savedPlaces changes
    localStorage.setItem('my_gourmet_map_places', JSON.stringify(savedPlaces));
  }, [savedPlaces]);

  useEffect(() => {
    // Get initial user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting location", error);
        }
      );
    }
  }, []);

  // --- Handlers ---

  const performSearch = async (query: string) => {
    if (!query.trim()) return;

    setIsSearching(true);
    // 1. Search using Gemini
    const geminiResults = await searchPlacesWithGemini(query, currentLocation);
    
    if (geminiResults.length === 0) {
         // Create a mock result for demo purposes if API key is invalid or returns no map chunks
         const mockPlace: Place = {
             id: 'mock-' + Date.now(),
             name: query,
             address: "附近 (模擬結果)",
             location: {
                 latitude: currentLocation.latitude + (Math.random() * 0.01 - 0.005),
                 longitude: currentLocation.longitude + (Math.random() * 0.01 - 0.005)
             },
             googleMapsUri: "https://maps.google.com"
         };
         setSearchResults([mockPlace]);
    } else {
        setSearchResults(geminiResults);
    }
    
    setIsSearching(false);
    setViewState('list'); // Switch to list view on mobile to see results
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(searchQuery);
  };

  const handleCategoryClick = (categoryLabel: string) => {
    const query = `附近的${categoryLabel}`;
    setSearchQuery(query);
    performSearch(query);
  };

  const handleSelectPlace = (place: Place | SavedPlace) => {
    // Check if it's already saved
    const existing = savedPlaces.find(p => p.id === place.id);
    setSelectedPlace(existing || place);
    setViewState('map'); // Switch to map to see it
  };

  const handleAddCheckIn = (data: Omit<CheckIn, 'id' | 'timestamp'>) => {
    if (!selectedPlace) return;

    const newCheckIn: CheckIn = {
      ...data,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };

    setSavedPlaces(prev => {
      const existingIndex = prev.findIndex(p => p.id === selectedPlace.id);
      
      if (existingIndex >= 0) {
        // Update existing saved place
        const updatedPlaces = [...prev];
        updatedPlaces[existingIndex] = {
          ...updatedPlaces[existingIndex],
          myCheckIns: [...updatedPlaces[existingIndex].myCheckIns, newCheckIn]
        };
        // Update selected place reference too so UI updates immediately
        setSelectedPlace(updatedPlaces[existingIndex]);
        return updatedPlaces;
      } else {
        // Create new saved place
        const newSavedPlace: SavedPlace = {
          ...selectedPlace,
          myCheckIns: [newCheckIn]
        };
        setSelectedPlace(newSavedPlace);
        return [...prev, newSavedPlace];
      }
    });
  };

  // --- Render ---

  // Determine active check-ins for selected place
  const selectedPlaceCheckIns = (selectedPlace as SavedPlace)?.myCheckIns || [];

  return (
    <div className="flex h-screen w-full bg-gray-100 overflow-hidden font-sans text-gray-800">
      
      {/* Sidebar (Desktop: Left, Mobile: Full/Hidden) */}
      <div className={`
        flex-col bg-white shadow-xl z-20 
        w-full md:w-[400px] h-full
        ${viewState === 'list' ? 'flex' : 'hidden md:flex'}
      `}>
        {/* Header */}
        <div className="p-4 bg-indigo-600 text-white shadow-md">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <MapPin className="fill-white" /> 美食地圖
          </h1>
          <p className="text-xs text-indigo-200 mt-1 opacity-80">Powered by Gemini AI</p>
        </div>

        {/* Search */}
        <div className="p-4 border-b space-y-3">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              placeholder="搜尋餐廳、地點..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            {isSearching && (
              <div className="absolute right-3 top-2.5">
                <Loader2 size={18} className="animate-spin text-indigo-600" />
              </div>
            )}
          </form>

          {/* Categories */}
          <div>
             <p className="text-xs text-gray-500 mb-2 font-medium">探索附近美食</p>
             <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 no-scrollbar items-center">
                {CUISINE_CATEGORIES.map((cat) => (
                  <button
                    key={cat.name}
                    onClick={() => handleCategoryClick(cat.label)}
                    className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-200 rounded-full text-sm text-gray-700 transition whitespace-nowrap"
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.name}</span>
                  </button>
                ))}
             </div>
          </div>
        </div>

        {/* Lists */}
        <div className="flex-1 overflow-y-auto">
          {searchResults.length > 0 && (
            <div className="mb-6">
              <h3 className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase sticky top-0 z-10">搜尋結果</h3>
              {searchResults.map(place => (
                <div 
                  key={place.id}
                  onClick={() => handleSelectPlace(place)}
                  className="px-4 py-3 border-b hover:bg-gray-50 cursor-pointer transition flex justify-between items-center group"
                >
                  <div>
                    <div className="font-medium text-gray-800 group-hover:text-indigo-600">{place.name}</div>
                    <div className="text-xs text-gray-500 truncate w-64">{place.address || '無地址資訊'}</div>
                  </div>
                  <Navigation size={16} className="text-gray-300 group-hover:text-indigo-500" />
                </div>
              ))}
            </div>
          )}

          <div>
            <h3 className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase sticky top-0 z-10">我的收藏</h3>
            {savedPlaces.length === 0 ? (
              <div className="p-8 text-center text-gray-400 flex flex-col items-center">
                <UtensilsCrossed size={48} className="mb-3 opacity-20" />
                <p>尚未收藏地點。</p>
                <p className="text-sm mt-1">搜尋並打卡以建立您的地圖！</p>
              </div>
            ) : (
              savedPlaces.map(place => (
                <div 
                  key={place.id}
                  onClick={() => handleSelectPlace(place)}
                  className={`px-4 py-3 border-b hover:bg-gray-50 cursor-pointer transition ${selectedPlace?.id === place.id ? 'bg-indigo-50 border-l-4 border-l-indigo-500' : ''}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="font-medium text-gray-900">{place.name}</div>
                    <div className="bg-indigo-100 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
                       {place.myCheckIns.length} 次造訪
                    </div>
                  </div>
                  {/* Show latest rating */}
                  <div className="mt-1">
                     <StarRating rating={place.myCheckIns[place.myCheckIns.length - 1]?.rating || 0} size={12} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Mobile Toggle */}
        <div className="md:hidden p-4 border-t">
          <button 
            onClick={() => setViewState('map')}
            className="w-full py-2 bg-gray-800 text-white rounded-lg"
          >
            切換至地圖
          </button>
        </div>
      </div>

      {/* Main Content (Map & Detail Overlay) */}
      <div className={`
        relative flex-1 h-full
        ${viewState === 'map' ? 'block' : 'hidden md:block'}
      `}>
        <MapContainer 
          center={[currentLocation.latitude, currentLocation.longitude]} 
          zoom={13} 
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapUpdater center={selectedPlace ? selectedPlace.location : currentLocation} />

          {/* User Location Marker */}
          <Marker position={[currentLocation.latitude, currentLocation.longitude]}>
            <Popup>您的位置</Popup>
          </Marker>

          {/* Search Results Markers */}
          {searchResults.map(place => (
            <Marker 
              key={place.id} 
              position={[place.location.latitude, place.location.longitude]}
              eventHandlers={{
                click: () => handleSelectPlace(place)
              }}
            />
          ))}

          {/* Saved Places Markers (Custom Icon) */}
          {savedPlaces.map(place => (
            <Marker 
              key={`saved-${place.id}`} 
              position={[place.location.latitude, place.location.longitude]}
              icon={redIcon}
              eventHandlers={{
                click: () => handleSelectPlace(place)
              }}
            />
          ))}
        </MapContainer>

        {/* Floating Detail Card (Overlay) */}
        {selectedPlace && (
           <div className="absolute top-4 right-4 z-[400] w-[90%] md:w-96 max-h-[85vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
              <div className="p-4 border-b bg-gradient-to-r from-gray-50 to-white flex justify-between items-start">
                 <div>
                   <h2 className="text-xl font-bold text-gray-900">{selectedPlace.name}</h2>
                   <p className="text-sm text-gray-500 mt-1">{selectedPlace.address || '無地址資訊'}</p>
                   {selectedPlace.googleMapsUri && (
                     <a href={selectedPlace.googleMapsUri} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline mt-1 inline-block">
                       在 Google 地圖中開啟
                     </a>
                   )}
                 </div>
                 <button 
                   onClick={() => setSelectedPlace(null)}
                   className="text-gray-400 hover:text-gray-600 p-1"
                 >
                   <span className="sr-only">Close</span>
                   <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                 <button 
                   onClick={() => setIsModalOpen(true)}
                   className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold shadow-md hover:bg-indigo-700 transition flex items-center justify-center gap-2 mb-4"
                 >
                   <Plus size={20} /> 立即打卡
                 </button>

                 <Timeline checkIns={selectedPlaceCheckIns} />
              </div>
           </div>
        )}

        {/* Mobile Toggle Button (Floating) */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 md:hidden z-[400]">
           <button 
             onClick={() => setViewState('list')}
             className="px-6 py-2 bg-white text-gray-800 font-bold rounded-full shadow-lg border border-gray-200"
           >
             顯示列表
           </button>
        </div>
      </div>

      {/* Modal */}
      {selectedPlace && (
        <CheckInModal 
          isOpen={isModalOpen}
          place={selectedPlace}
          onClose={() => setIsModalOpen(false)}
          onSave={handleAddCheckIn}
        />
      )}
    </div>
  );
};

export default App;