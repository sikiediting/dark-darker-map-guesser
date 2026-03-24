import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Trash2, Upload } from 'lucide-react';
import { supabase, Level, MapType } from '../lib/supabase';
import { calculateMapScale, getMapTypeName } from '../lib/utils';
import InteractiveMap from './InteractiveMap';

const MAP_TYPES: { value: MapType; label: string; color: string }[] = [
  { value: 'ruins', label: 'Ancient Ruins', color: '#d4af37' },
  { value: 'goblin', label: 'Goblin Caves', color: '#22c55e' },
  { value: 'ice', label: 'Ice Caverns', color: '#3b82f6' },
];

const GRID_SIZES = [
  { value: 3, label: '3×3 (90m)', scale: 90 },
  { value: 5, label: '5×5 (150m)', scale: 150 },
  { value: 7, label: '7×7 (210m)', scale: 210 },
];

export default function AdminPage() {
  const navigate = useNavigate();
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(false);

  const [mapName, setMapName] = useState('');
  const [mapType, setMapType] = useState<MapType>('ruins');
  const [gridSize, setGridSize] = useState(5);
  const [mapFile, setMapFile] = useState<File | null>(null);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [mapPreview, setMapPreview] = useState<string>('');
  const [targetLocation, setTargetLocation] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (authenticated) {
      loadLevels();
    }
  }, [authenticated]);

  // PASSWORD CHANGED TO: sikibog1
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'sikibog1') {
      setAuthenticated(true);
    } else {
      alert('Incorrect password');
    }
  };

  const loadLevels = async () => {
    try {
      const { data, error } = await supabase
        .from('levels')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLevels(data || []);
    } catch (error) {
      console.error('Error loading levels:', error);
    }
  };

  const handleMapFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMapFile(file);
      const url = URL.createObjectURL(file);
      setMapPreview(url);
      setTargetLocation(null);
    }
  };

  const handleScreenshotFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setScreenshotFile(file);
    }
  };

  const handleMapClick = (x: number, y: number) => {
    console.log('Admin Click Debug:', { x, y });
    setTargetLocation({ x, y });
  };

  const uploadFile = async (file: File, folder: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('game-images')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from('game-images').getPublicUrl(fileName);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!mapFile || !screenshotFile || !targetLocation || !mapName) {
      alert('Please fill all fields and set target location');
      return;
    }

    setLoading(true);

    try {
      const mapUrl = await uploadFile(mapFile, 'maps');
      const screenshotUrl = await uploadFile(screenshotFile, 'screenshots');

      const mapScale = calculateMapScale(gridSize);

      console.log('Saving level:', {
        target_x: targetLocation.x,
        target_y: targetLocation.y,
        map_scale_meters: mapScale
      });

      const { error } = await supabase.from('levels').insert({
        map_image_url: mapUrl,
        screenshot_url: screenshotUrl,
        target_x: targetLocation.x,
        target_y: targetLocation.y,
        map_name: mapName,
        map_type: mapType,
        grid_size: gridSize,
        map_scale_meters: mapScale,
      });

      if (error) throw error;

      alert('Level created successfully!');
      setMapName('');
      setMapType('ruins');
      setGridSize(5);
      setMapFile(null);
      setScreenshotFile(null);
      setMapPreview('');
      setTargetLocation(null);
      loadLevels();
    } catch (error) {
      console.error('Error creating level:', error);
      alert('Error creating level');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this level?')) return;

    try {
      const { error } = await supabase.from('levels').delete().eq('id', id);

      if (error) throw error;

      alert('Level deleted successfully!');
      loadLevels();
    } catch (error) {
      console.error('Error deleting level:', error);
      alert('Error deleting level');
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center p-4">
        <div className="bg-black/50 p-8 rounded-lg border-2 border-gold max-w-md w-full">
          <h1 className="text-3xl font-bold text-gold mb-6 text-center">Admin Login</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-white mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-black/50 border border-gold/50 rounded-lg text-white focus:outline-none focus:border-gold min-h-[44px]"
                placeholder="Enter admin password"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-red text-white font-bold rounded-lg hover:bg-red/90 transition-all min-h-[44px]"
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-full py-3 bg-transparent border-2 border-gold text-gold font-bold rounded-lg hover:bg-gold hover:text-dark transition-all min-h-[44px]"
            >
              Back to Home
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark text-white p-4">
      <div className="container mx-auto max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <Home className="w-6 h-6 text-gold" />
          </button>
          <h1 className="text-2xl md:text-3xl font-bold text-gold">Admin Panel</h1>
          <div className="w-10"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-black/30 rounded-lg p-6 border border-gold/30">
            <h2 className="text-xl font-bold text-gold mb-4">Create New Level</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-white mb-2">Map Name</label>
                <input
                  type="text"
                  value={mapName}
                  onChange={(e) => setMapName(e.target.value)}
                  className="w-full px-4 py-3 bg-black/50 border border-gold/50 rounded-lg text-white focus:outline-none focus:border-gold min-h-[44px]"
                  placeholder="e.g., Ruins Level 1"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white mb-2">Map Type</label>
                  <select
                    value={mapType}
                    onChange={(e) => setMapType(e.target.value as MapType)}
                    className="w-full px-4 py-3 bg-black/50 border border-gold/50 rounded-lg text-white focus:outline-none focus:border-gold min-h-[44px]"
                  >
                    {MAP_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-white mb-2">Grid Size</label>
                  <select
                    value={gridSize}
                    onChange={(e) => setGridSize(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-black/50 border border-gold/50 rounded-lg text-white focus:outline-none focus:border-gold min-h-[44px]"
                  >
                    {GRID_SIZES.map((size) => (
                      <option key={size.value} value={size.value}>
                        {size.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-white mb-2">Map Image</label>
                <label className="flex items-center justify-center w-full px-4 py-3 bg-black/50 border-2 border-dashed border-gold/50 rounded-lg cursor-pointer hover:border-gold transition-colors min-h-[44px]">
                  <Upload className="w-5 h-5 mr-2 text-gold" />
                  <span className="text-gray-300">
                    {mapFile ? mapFile.name : 'Choose map image'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleMapFileChange}
                    className="hidden"
                    required
                  />
                </label>
              </div>

              <div>
                <label className="block text-white mb-2">Screenshot Image</label>
                <label className="flex items-center justify-center w-full px-4 py-3 bg-black/50 border-2 border-dashed border-gold/50 rounded-lg cursor-pointer hover:border-gold transition-colors min-h-[44px]">
                  <Upload className="w-5 h-5 mr-2 text-gold" />
                  <span className="text-gray-300">
                    {screenshotFile ? screenshotFile.name : 'Choose screenshot'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleScreenshotFileChange}
                    className="hidden"
                    required
                  />
                </label>
              </div>

              {mapPreview && (
                <div>
                  <label className="block text-white mb-2">
                    Click on map to set target location
                    {targetLocation && (
                      <span className="text-green-400 ml-2">
                        ✓ Location set ({targetLocation.x.toFixed(1)}%, {targetLocation.y.toFixed(1)}%)
                      </span>
                    )}
                  </label>
                  
                  <div className="h-[500px] border border-gold/30 rounded-lg overflow-hidden">
                    <InteractiveMap
                      imageUrl={mapPreview}
                      onMapClick={handleMapClick}
                      targetPin={
                        targetLocation
                          ? { x: targetLocation.x, y: targetLocation.y, color: '#ef4444' }
                          : null
                      }
                      disabled={false}
                      showDistance={false}
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-red text-white font-bold rounded-lg hover:bg-red/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              >
                {loading ? 'Creating...' : 'Create Level'}
              </button>
            </form>
          </div>

          <div className="bg-black/30 rounded-lg p-6 border border-gold/30">
            <h2 className="text-xl font-bold text-gold mb-4">
              Existing Levels ({levels.length})
            </h2>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {levels.map((level) => (
                <div
                  key={level.id}
                  className="bg-black/50 p-4 rounded-lg border border-gold/20 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">{level.map_name}</h3>
                    <p className="text-sm text-gray-400">
                      {getMapTypeName(level.map_type)} • {level.grid_size}×{level.grid_size} ({level.map_scale_meters}m)
                    </p>
                    <p className="text-xs text-gray-500">
                      Target: ({level.target_x.toFixed(1)}%, {level.target_y.toFixed(1)}%)
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(level.id)}
                    className="p-2 hover:bg-red/20 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5 text-red" />
                  </button>
                </div>
              ))}
              {levels.length === 0 && (
                <p className="text-gray-400 text-center py-8">No levels yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}