import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Trash2, Upload, Map, Settings, Eye, EyeOff, Flag, CheckCircle, XCircle } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, orderBy } from 'firebase/firestore';
import InteractiveMap from './InteractiveMap';

const CAMPAIGNS = [
  {
    id: 'forgotten-castle',
    name: 'The Forgotten Castle',
    color: '#d4af37',
    subMaps: [
      { id: 'ruins', name: 'The Ruins', gridSize: 7 },
      { id: 'crypts', name: 'The Crypts', gridSize: 5 },
      { id: 'inferno', name: 'The Inferno', gridSize: 5 },
    ],
  },
  {
    id: 'goblin-caves',
    name: 'The Goblin Caves',
    color: '#22c55e',
    subMaps: [
      { id: 'goblin', name: 'The Goblin Caves', gridSize: 5 },
      { id: 'firedeep', name: 'The Firedeep', gridSize: 3 },
    ],
  },
  {
    id: 'frost-mountain',
    name: 'The Frost Mountain',
    color: '#3b82f6',
    subMaps: [
      { id: 'ice', name: 'The Ice Cavern', gridSize: 5 },
      { id: 'ice-abyss', name: 'The Ice Abyss', gridSize: 5 },
    ],
  },
  {
    id: 'blue-maelstrom',
    name: 'The Blue Maelstrom',
    color: '#06b6d4',
    subMaps: [
      { id: 'ship-graveyard', name: 'The Ship Graveyard', gridSize: 7 },
    ],
  },
];

const DIFFICULTIES = [
  { id: 'easy', name: 'Easy', color: '#22c55e' },
  { id: 'hard', name: 'Hard', color: '#f59e0b' },
  { id: 'impossible', name: 'Impossible', color: '#ef4444' },
];

const GRID_SIZES: { [key: number]: { label: string; scale: number } } = {
  3: { label: '3×3 (90m)', scale: 90 },
  5: { label: '5×5 (150m)', scale: 150 },
  7: { label: '7×7 (210m)', scale: 210 },
};

export default function AdminPage() {
  const navigate = useNavigate();
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'levels' | 'maps' | 'settings' | 'reports'>('levels');
  const [levels, setLevels] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [masterMaps, setMasterMaps] = useState<{ [key: string]: any }>({});
  const [mapSettings, setMapSettings] = useState<{ [key: string]: boolean }>({});
  const [loading, setLoading] = useState(false);

  const [mapName, setMapName] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState('forgotten-castle');
  const [selectedSubMap, setSelectedSubMap] = useState('ruins');
  const [selectedDifficulty, setSelectedDifficulty] = useState('easy');
  const [gridSize, setGridSize] = useState(7);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [mapPreview, setMapPreview] = useState<string>('');
  const [targetLocation, setTargetLocation] = useState<{ x: number; y: number } | null>(null);
  const [uploading, setUploading] = useState(false);

  const [mapUploadFile, setMapUploadFile] = useState<File | null>(null);
  const [mapUploadCampaign, setMapUploadCampaign] = useState('forgotten-castle');
  const [mapUploadSubMap, setMapUploadSubMap] = useState('ruins');
  const [mapUploadDifficulty, setMapUploadDifficulty] = useState('easy');
  const [mapUploadPreview, setMapUploadPreview] = useState<string>('');
  const [uploadingMap, setUploadingMap] = useState(false);

  const [settingsCampaign, setSettingsCampaign] = useState('forgotten-castle');
  const [settingsSubMap, setSettingsSubMap] = useState('ruins');
  const [settingsEnabled, setSettingsEnabled] = useState(true);

  useEffect(() => {
    if (authenticated) {
      loadLevels();
      loadReports();
      loadMasterMaps();
      loadMapSettings();
    }
  }, [authenticated]);

  useEffect(() => {
    const campaign = CAMPAIGNS.find(c => c.id === selectedCampaign);
    const subMap = campaign?.subMaps.find(s => s.id === selectedSubMap);
    if (subMap) {
      setGridSize(subMap.gridSize);
      const mapKey = `${selectedCampaign}-${selectedSubMap}-${selectedDifficulty}`;
      if (masterMaps[mapKey]) {
        setMapPreview(masterMaps[mapKey].map_image_url);
      } else {
        setMapPreview('');
      }
    }
  }, [selectedCampaign, selectedSubMap, selectedDifficulty, masterMaps]);

  useEffect(() => {
    const key = `${settingsCampaign}-${settingsSubMap}`;
    setSettingsEnabled(mapSettings[key] !== false);
  }, [settingsCampaign, settingsSubMap, mapSettings]);

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
      const q = query(collection(db, 'levels'), orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(q);
      const levelsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLevels(levelsData);
    } catch (error) {
      console.error('Error loading levels:', error);
    }
  };

  const loadReports = async () => {
    try {
      const q = query(collection(db, 'reports'), orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(q);
      const reportsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReports(reportsData);
    } catch (error) {
      console.error('Error loading reports:', error);
    }
  };

  const loadMasterMaps = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'maps'));
      const mapsData: { [key: string]: any } = {};
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const key = `${data.campaign}-${data.sub_map}-${data.difficulty}`;
        mapsData[key] = { id: doc.id, ...data };
      });
      setMasterMaps(mapsData);
    } catch (error) {
      console.error('Error loading maps:', error);
    }
  };

  const loadMapSettings = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'map_settings'));
      const settingsData: { [key: string]: boolean } = {};
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const key = `${data.campaign}-${data.sub_map}`;
        settingsData[key] = data.enabled === true;
      });
      console.log('Loaded map settings:', settingsData);
      setMapSettings(settingsData);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleScreenshotFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setScreenshotFile(file);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          const file = new File([blob], `screenshot-${Date.now()}.png`, { type: blob.type });
          setScreenshotFile(file);
        }
        break;
      }
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.indexOf('image') !== -1) {
      setScreenshotFile(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleMapClick = (x: number, y: number) => {
    setTargetLocation({ x, y });
  };

  const handleMapUploadFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMapUploadFile(file);
      const url = URL.createObjectURL(file);
      setMapUploadPreview(url);
    }
  };

  const uploadToCloudinary = async (file: File, folder: string): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', `dark-darker/${folder}`);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error('Failed to upload to Cloudinary');
    }

    const data = await response.json();
    return data.secure_url;
  };

  const handleUploadMasterMap = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!mapUploadFile) {
      alert('Please select a map image');
      return;
    }

    setUploadingMap(true);

    try {
      const mapUrl = await uploadToCloudinary(mapUploadFile, 'maps');

      const mapKey = `${mapUploadCampaign}-${mapUploadSubMap}-${mapUploadDifficulty}`;
      
      const existingMap = masterMaps[mapKey];
      
      if (existingMap) {
        await deleteDoc(doc(db, 'maps', existingMap.id));
      }

      await addDoc(collection(db, 'maps'), {
        campaign: mapUploadCampaign,
        sub_map: mapUploadSubMap,
        difficulty: mapUploadDifficulty,
        map_image_url: mapUrl,
        grid_size: GRID_SIZES[gridSize] ? gridSize : 5,
        created_at: new Date().toISOString(),
      });

      alert('Master map uploaded successfully!');
      setMapUploadFile(null);
      setMapUploadPreview('');
      loadMasterMaps();
    } catch (error) {
      console.error('Error uploading map:', error);
      alert('Error uploading map: ' + (error as any).message);
    } finally {
      setUploadingMap(false);
    }
  };

  const handleSaveMapSettings = async () => {
    const settingsKey = `${settingsCampaign}-${settingsSubMap}`;
    
    try {
      const existingQ = query(
        collection(db, 'map_settings'),
        where('campaign', '==', settingsCampaign),
        where('sub_map', '==', settingsSubMap)
      );
      const existingSnapshot = await getDocs(existingQ);
      existingSnapshot.forEach(async (docSnapshot) => {
        await deleteDoc(doc(db, 'map_settings', docSnapshot.id));
      });

      await addDoc(collection(db, 'map_settings'), {
        campaign: settingsCampaign,
        sub_map: settingsSubMap,
        enabled: settingsEnabled,
        created_at: new Date().toISOString(),
      });

      console.log(`Saved settings: ${settingsKey} = ${settingsEnabled}`);
      alert(`Map ${settingsEnabled ? 'enabled' : 'disabled'} successfully!`);
      loadMapSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const mapKey = `${selectedCampaign}-${selectedSubMap}-${selectedDifficulty}`;
    const masterMap = masterMaps[mapKey];

    if (!masterMap) {
      alert(`No master map found for ${selectedSubMap} (${selectedDifficulty}). Please upload it in the "Manage Maps" tab first.`);
      setActiveTab('maps');
      return;
    }

    if (!screenshotFile || !targetLocation || !mapName) {
      alert('Please fill all fields and set target location');
      return;
    }

    setUploading(true);
    setLoading(true);

    try {
      const screenshotUrl = await uploadToCloudinary(screenshotFile, 'screenshots');
      const campaign = CAMPAIGNS.find(c => c.id === selectedCampaign);
      const subMap = campaign?.subMaps.find(s => s.id === selectedSubMap);
      const mapScale = GRID_SIZES[subMap?.gridSize || 5]?.scale || 150;

      await addDoc(collection(db, 'levels'), {
        map_image_url: masterMap.map_image_url,
        map_id: masterMap.id,
        screenshot_url: screenshotUrl,
        target_x: targetLocation.x,
        target_y: targetLocation.y,
        map_name: mapName,
        campaign: selectedCampaign,
        sub_map: selectedSubMap,
        difficulty: selectedDifficulty,
        grid_size: subMap?.gridSize || 5,
        map_scale_meters: mapScale,
        created_at: new Date().toISOString(),
      });

      alert('Level created successfully!');
      setMapName('');
      setSelectedCampaign('forgotten-castle');
      setSelectedSubMap('ruins');
      setSelectedDifficulty('easy');
      setScreenshotFile(null);
      setMapPreview(masterMaps['forgotten-castle-ruins-easy']?.map_image_url || '');
      setTargetLocation(null);
      loadLevels();
    } catch (error) {
      console.error('Error creating level:', error);
      alert('Error creating level: ' + (error as any).message);
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this level?')) return;

    try {
      await deleteDoc(doc(db, 'levels', id));
      alert('Level deleted successfully!');
      loadLevels();
    } catch (error) {
      console.error('Error deleting level:', error);
      alert('Error deleting level');
    }
  };

  const handleDeleteMap = async (campaign: string, subMap: string, difficulty: string) => {
    if (!confirm('Are you sure you want to delete this master map?')) return;

    try {
      const q = query(collection(db, 'maps'));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach(async (docSnapshot) => {
        const data = docSnapshot.data();
        if (data.campaign === campaign && data.sub_map === subMap && data.difficulty === difficulty) {
          await deleteDoc(doc(db, 'maps', docSnapshot.id));
        }
      });
      alert('Master map deleted successfully!');
      loadMasterMaps();
    } catch (error) {
      console.error('Error deleting map:', error);
      alert('Error deleting map');
    }
  };

  const handleReportAction = async (reportId: string, action: 'fixed' | 'ignored') => {
    try {
      await deleteDoc(doc(db, 'reports', reportId));
      alert(`Report marked as ${action}!`);
      loadReports();
    } catch (error) {
      console.error('Error updating report:', error);
      alert('Error updating report');
    }
  };

  const getCurrentCampaign = () => {
    return CAMPAIGNS.find(c => c.id === selectedCampaign);
  };

  const isMapEnabled = (campaign: string, subMap: string): boolean => {
    const key = `${campaign}-${subMap}`;
    const enabled = mapSettings[key];
    return enabled !== false;
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

        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setActiveTab('levels')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'levels'
                ? 'bg-gold text-dark'
                : 'bg-black/50 text-gray-400 hover:text-white'
            }`}
          >
            <Home className="w-5 h-5" />
            Create Levels
          </button>
          <button
            onClick={() => setActiveTab('maps')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'maps'
                ? 'bg-gold text-dark'
                : 'bg-black/50 text-gray-400 hover:text-white'
            }`}
          >
            <Map className="w-5 h-5" />
            Manage Maps
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'settings'
                ? 'bg-gold text-dark'
                : 'bg-black/50 text-gray-400 hover:text-white'
            }`}
          >
            <Settings className="w-5 h-5" />
            Map Settings
          </button>
          <button
            onClick={() => navigate('/admin/gallery')}
            className="px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 bg-black/50 text-gray-400 hover:text-white"
          >
            <Eye className="w-5 h-5" />
            View Gallery
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'reports'
                ? 'bg-gold text-dark'
                : 'bg-black/50 text-gray-400 hover:text-white'
            }`}
          >
            <Flag className="w-5 h-5" />
            Reports {reports.filter(r => r.status === 'pending').length > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {reports.filter(r => r.status === 'pending').length}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'reports' ? (
          /* Reports Tab */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gold">Player Reports ({reports.filter(r => r.status === 'pending').length} pending)</h2>
              <button
                onClick={loadReports}
                className="px-4 py-2 bg-gold/20 text-gold rounded-lg hover:bg-gold/30 transition-all"
              >
                Refresh
              </button>
            </div>

            {reports.length === 0 ? (
              <div className="text-center text-gray-400 py-20">
                <Flag className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>No reports yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className={`bg-black/50 rounded-lg border p-4 ${
                      report.status === 'pending' ? 'border-orange-500/50' : 'border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Flag className={`w-5 h-5 ${
                          report.report_type === 'coordinates' ? 'text-red-400' :
                          report.report_type === 'screenshot' ? 'text-yellow-400' : 'text-gray-400'
                        }`} />
                        <span className="font-semibold text-white capitalize">{report.report_type} Issue</span>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        report.status === 'pending' ? 'bg-orange-500/20 text-orange-400' : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {report.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="aspect-video bg-gray-900 rounded overflow-hidden">
                        <img src={report.screenshot_url} alt="Screenshot" className="w-full h-full object-cover" />
                      </div>
                      <div className="aspect-video bg-gray-900 rounded overflow-hidden">
                        <img src={report.map_image_url} alt="Map" className="w-full h-full object-cover" />
                      </div>
                    </div>

                    <div className="text-sm text-gray-400 mb-3">
                      <div><span className="text-white">Level:</span> {report.level_name}</div>
                      <div><span className="text-white">Campaign:</span> {report.campaign}</div>
                      <div><span className="text-white">Sub-Map:</span> {report.sub_map}</div>
                      <div><span className="text-white">Difficulty:</span> {report.difficulty}</div>
                      {report.comment && (
                        <div className="mt-2 p-2 bg-black/50 rounded">
                          <span className="text-white">Comment:</span> {report.comment}
                        </div>
                      )}
                    </div>

                    {report.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReportAction(report.id, 'fixed')}
                          className="flex-1 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-all flex items-center justify-center gap-2 text-sm font-semibold"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Fixed
                        </button>
                        <button
                          onClick={() => handleReportAction(report.id, 'ignored')}
                          className="flex-1 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-all flex items-center justify-center gap-2 text-sm font-semibold"
                        >
                          <XCircle className="w-4 h-4" />
                          Ignore
                        </button>
                        <button
                          onClick={() => {
                            navigate('/admin/gallery');
                          }}
                          className="px-4 py-2 bg-gold/20 text-gold rounded-lg hover:bg-gold/30 transition-all text-sm font-semibold"
                        >
                          Find in Gallery
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'settings' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-black/30 rounded-lg p-6 border border-gold/30">
              <h2 className="text-xl font-bold text-gold mb-4">Enable/Disable Maps</h2>
              <p className="text-gray-400 text-sm mb-4">
                Disable maps that are under construction. Players will see them as "Coming Soon".
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-white mb-2">Campaign</label>
                  <select
                    value={settingsCampaign}
                    onChange={(e) => {
                      setSettingsCampaign(e.target.value);
                      const campaign = CAMPAIGNS.find(c => c.id === e.target.value);
                      if (campaign) {
                        setSettingsSubMap(campaign.subMaps[0].id);
                      }
                    }}
                    className="w-full px-4 py-3 bg-black/50 border border-gold/50 rounded-lg text-white focus:outline-none focus:border-gold min-h-[44px]"
                  >
                    {CAMPAIGNS.map((campaign) => (
                      <option key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-white mb-2">Sub-Map</label>
                  <select
                    value={settingsSubMap}
                    onChange={(e) => setSettingsSubMap(e.target.value)}
                    className="w-full px-4 py-3 bg-black/50 border border-gold/50 rounded-lg text-white focus:outline-none focus:border-gold min-h-[44px]"
                  >
                    {CAMPAIGNS.find(c => c.id === settingsCampaign)?.subMaps.map((subMap) => (
                      <option key={subMap.id} value={subMap.id}>
                        {subMap.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-3 p-4 bg-black/50 rounded-lg border border-gold/30">
                  <button
                    onClick={() => setSettingsEnabled(!settingsEnabled)}
                    className={`p-3 rounded-lg transition-all ${
                      settingsEnabled ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {settingsEnabled ? <Eye className="w-6 h-6 text-white" /> : <EyeOff className="w-6 h-6 text-white" />}
                  </button>
                  <div>
                    <div className="font-semibold text-white">
                      {settingsEnabled ? 'Map is Enabled' : 'Map is Disabled'}
                    </div>
                    <div className="text-sm text-gray-400">
                      {settingsEnabled ? 'Players can select this map' : 'Players will see "Under Construction"'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSaveMapSettings}
                  className="w-full py-3 bg-gold text-dark font-bold rounded-lg hover:bg-gold/90 transition-all"
                >
                  Save Settings
                </button>
              </div>
            </div>

            <div className="bg-black/30 rounded-lg p-6 border border-gold/30">
              <h2 className="text-xl font-bold text-gold mb-4">Current Map Status</h2>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {CAMPAIGNS.map((campaign) => (
                  <div key={campaign.id} className="mb-4">
                    <h3 className="text-lg font-semibold text-white mb-2" style={{ color: campaign.color }}>
                      {campaign.name}
                    </h3>
                    <div className="space-y-2">
                      {campaign.subMaps.map((subMap) => {
                        const settingsKey = `${campaign.id}-${subMap.id}`;
                        const enabled = mapSettings[settingsKey] !== false;
                        return (
                          <div
                            key={subMap.id}
                            className={`p-3 rounded-lg border flex items-center justify-between ${
                              enabled ? 'bg-green-900/30 border-green-500/50' : 'bg-red-900/30 border-red-500/50'
                            }`}
                          >
                            <div>
                              <div className="font-semibold text-white">{subMap.name}</div>
                              <div className="text-xs" style={{ color: enabled ? '#22c55e' : '#ef4444' }}>
                                {enabled ? '✓ Available' : '🚧 Under Construction'}
                              </div>
                            </div>
                            {enabled ? (
                              <Eye className="w-5 h-5 text-green-500" />
                            ) : (
                              <EyeOff className="w-5 h-5 text-red-500" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : activeTab === 'maps' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-black/30 rounded-lg p-6 border border-gold/30">
              <h2 className="text-xl font-bold text-gold mb-4">Upload Master Map</h2>
              <p className="text-gray-400 text-sm mb-4">
                Upload separate maps for each difficulty. Easy, Hard, and Impossible can have different map images.
              </p>
              <form onSubmit={handleUploadMasterMap} className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-white mb-2">Campaign</label>
                    <select
                      value={mapUploadCampaign}
                      onChange={(e) => {
                        setMapUploadCampaign(e.target.value);
                        const campaign = CAMPAIGNS.find(c => c.id === e.target.value);
                        if (campaign) {
                          setMapUploadSubMap(campaign.subMaps[0].id);
                        }
                      }}
                      className="w-full px-4 py-3 bg-black/50 border border-gold/50 rounded-lg text-white focus:outline-none focus:border-gold min-h-[44px]"
                    >
                      {CAMPAIGNS.map((campaign) => (
                        <option key={campaign.id} value={campaign.id}>
                          {campaign.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-white mb-2">Sub-Map</label>
                    <select
                      value={mapUploadSubMap}
                      onChange={(e) => setMapUploadSubMap(e.target.value)}
                      className="w-full px-4 py-3 bg-black/50 border border-gold/50 rounded-lg text-white focus:outline-none focus:border-gold min-h-[44px]"
                    >
                      {CAMPAIGNS.find(c => c.id === mapUploadCampaign)?.subMaps.map((subMap) => (
                        <option key={subMap.id} value={subMap.id}>
                          {subMap.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-white mb-2">Difficulty</label>
                    <select
                      value={mapUploadDifficulty}
                      onChange={(e) => setMapUploadDifficulty(e.target.value)}
                      className="w-full px-4 py-3 bg-black/50 border border-gold/50 rounded-lg text-white focus:outline-none focus:border-gold min-h-[44px]"
                    >
                      {DIFFICULTIES.map((diff) => (
                        <option key={diff.id} value={diff.id}>
                          {diff.name}
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
                      {mapUploadFile ? mapUploadFile.name : 'Choose map image'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleMapUploadFileChange}
                      className="hidden"
                      required
                    />
                  </label>
                </div>

                {mapUploadPreview && (
                  <div className="h-[400px] border border-gold/30 rounded-lg overflow-hidden">
                    <img src={mapUploadPreview} alt="Map Preview" className="w-full h-full object-contain" />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={uploadingMap}
                  className="w-full py-3 bg-gold text-dark font-bold rounded-lg hover:bg-gold/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                >
                  {uploadingMap ? 'Uploading...' : 'Upload Master Map'}
                </button>
              </form>
            </div>

            <div className="bg-black/30 rounded-lg p-6 border border-gold/30">
              <h2 className="text-xl font-bold text-gold mb-4">Uploaded Master Maps</h2>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {CAMPAIGNS.map((campaign) => (
                  <div key={campaign.id} className="mb-4">
                    <h3 className="text-lg font-semibold text-white mb-2" style={{ color: campaign.color }}>
                      {campaign.name}
                    </h3>
                    <div className="space-y-2">
                      {campaign.subMaps.map((subMap) => (
                        <div key={subMap.id} className="ml-4">
                          <div className="text-sm text-gray-400 mb-1">{subMap.name}</div>
                          <div className="grid grid-cols-3 gap-2">
                            {DIFFICULTIES.map((diff) => {
                              const mapKey = `${campaign.id}-${subMap.id}-${diff.id}`;
                              const hasMap = masterMaps[mapKey];
                              return (
                                <div
                                  key={diff.id}
                                  className={`p-2 rounded-lg border text-center ${
                                    hasMap ? 'bg-green-900/30 border-green-500/50' : 'bg-black/50 border-gray-600'
                                  }`}
                                >
                                  <div className="text-xs font-semibold" style={{ color: diff.color }}>
                                    {diff.name}
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    {hasMap ? '✓' : '✗'}
                                  </div>
                                  {hasMap && (
                                    <button
                                      onClick={() => handleDeleteMap(campaign.id, subMap.id, diff.id)}
                                      className="mt-1 text-red-400 hover:text-red-300 text-xs"
                                    >
                                      Delete
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
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

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-white mb-2">Campaign</label>
                    <select
                      value={selectedCampaign}
                      onChange={(e) => {
                        setSelectedCampaign(e.target.value);
                        const campaign = CAMPAIGNS.find(c => c.id === e.target.value);
                        if (campaign) {
                          setSelectedSubMap(campaign.subMaps[0].id);
                          setGridSize(campaign.subMaps[0].gridSize);
                        }
                      }}
                      className="w-full px-4 py-3 bg-black/50 border border-gold/50 rounded-lg text-white focus:outline-none focus:border-gold min-h-[44px]"
                    >
                      {CAMPAIGNS.map((campaign) => (
                        <option key={campaign.id} value={campaign.id}>
                          {campaign.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-white mb-2">Sub-Map</label>
                    <select
                      value={selectedSubMap}
                      onChange={(e) => {
                        setSelectedSubMap(e.target.value);
                        const campaign = CAMPAIGNS.find(c => c.id === selectedCampaign);
                        const subMap = campaign?.subMaps.find(s => s.id === e.target.value);
                        if (subMap) {
                          setGridSize(subMap.gridSize);
                        }
                      }}
                      className="w-full px-4 py-3 bg-black/50 border border-gold/50 rounded-lg text-white focus:outline-none focus:border-gold min-h-[44px]"
                    >
                      {getCurrentCampaign()?.subMaps.map((subMap) => (
                        <option key={subMap.id} value={subMap.id}>
                          {subMap.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-white mb-2">Difficulty</label>
                    <select
                      value={selectedDifficulty}
                      onChange={(e) => {
                        setSelectedDifficulty(e.target.value);
                        const mapKey = `${selectedCampaign}-${selectedSubMap}-${e.target.value}`;
                        setMapPreview(masterMaps[mapKey]?.map_image_url || '');
                      }}
                      className="w-full px-4 py-3 bg-black/50 border border-gold/50 rounded-lg text-white focus:outline-none focus:border-gold min-h-[44px]"
                    >
                      {DIFFICULTIES.map((diff) => (
                        <option key={diff.id} value={diff.id}>
                          {diff.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-white mb-2">Grid Size</label>
                  <div className="px-4 py-3 bg-black/50 border border-gold/50 rounded-lg text-gray-400">
                    {GRID_SIZES[gridSize]?.label} (Auto-selected)
                  </div>
                </div>

                <div>
                  <label className="block text-white mb-2">Map Image</label>
                  <div className="px-4 py-3 bg-black/50 border border-gold/50 rounded-lg">
                    {mapPreview ? (
                      <div className="flex items-center gap-2 text-green-400">
                        <Map className="w-4 h-4" />
                        ✓ Auto-loaded ({selectedDifficulty})
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-red-400">
                        <Map className="w-4 h-4" />
                        ✗ No map - Upload in "Manage Maps" tab
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-white mb-2">Screenshot Image</label>
                  <div
                    onPaste={handlePaste}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    className={`flex flex-col items-center justify-center w-full px-4 py-8 bg-black/50 border-2 border-dashed rounded-lg transition-all min-h-[150px] ${
                      screenshotFile 
                        ? 'border-green-500 bg-green-900/20' 
                        : 'border-gold/50 hover:border-gold'
                    }`}
                  >
                    {screenshotFile ? (
                      <div className="text-center">
                        <div className="text-green-400 font-semibold mb-2">✓ Screenshot Ready!</div>
                        <div className="text-gray-400 text-sm">{screenshotFile.name}</div>
                        <button
                          type="button"
                          onClick={() => setScreenshotFile(null)}
                          className="mt-2 text-red-400 hover:text-red-300 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Upload className="w-8 h-8 text-gold mx-auto mb-2" />
                        <div className="text-white font-semibold">Paste or Drop Screenshot</div>
                        <div className="text-gray-400 text-sm mt-1">
                          Press <kbd className="px-2 py-1 bg-gray-700 rounded">Ctrl+V</kbd> or drag & drop
                        </div>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleScreenshotFileChange}
                      className="hidden"
                      id="screenshot-upload"
                    />
                  </div>
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
                  disabled={loading || uploading || !mapPreview || !screenshotFile}
                  className="w-full py-3 bg-red text-white font-bold rounded-lg hover:bg-red/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                >
                  {uploading ? 'Uploading...' : loading ? 'Creating...' : 'Create Level'}
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
                        {level.campaign} • {level.sub_map} • {level.difficulty} • {level.grid_size}×{level.grid_size} ({level.map_scale_meters}m)
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
        )}
      </div>
    </div>
  );
}