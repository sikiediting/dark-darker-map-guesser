import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ChevronRight, Map, Lock } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

const CAMPAIGNS = [
  {
    id: 'forgotten-castle',
    name: 'The Forgotten Castle',
    color: '#d4af37',
    subMaps: [
      { id: 'ruins', name: 'The Ruins' },
      { id: 'crypts', name: 'The Crypts' },
      { id: 'inferno', name: 'The Inferno' },
    ],
  },
  {
    id: 'goblin-caves',
    name: 'The Goblin Caves',
    color: '#22c55e',
    subMaps: [
      { id: 'goblin', name: 'The Goblin Caves' },
      { id: 'firedeep', name: 'The Firedeep' },
    ],
  },
  {
    id: 'frost-mountain',
    name: 'The Frost Mountain',
    color: '#3b82f6',
    subMaps: [
      { id: 'ice', name: 'The Ice Cavern' },
      { id: 'ice-abyss', name: 'The Ice Abyss' },
    ],
  },
  {
    id: 'blue-maelstrom',
    name: 'The Blue Maelstrom',
    color: '#06b6d4',
    subMaps: [
      { id: 'ship-graveyard', name: 'The Ship Graveyard' },
    ],
  },
];

export default function CampaignSelect() {
  const navigate = useNavigate();
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);
  const [mapSettings, setMapSettings] = useState<{ [key: string]: boolean }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMapSettings();
  }, []);

  const loadMapSettings = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'map_settings'));
      const settings: { [key: string]: boolean } = {};
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const key = `${data.campaign}-${data.sub_map}`;
        settings[key] = data.enabled !== false;
      });
      setMapSettings(settings);
    } catch (error) {
      console.error('Error loading map settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (campaign: string, subMap: string) => {
    navigate('/game', { state: { campaign, subMap } });
  };

  const isMapEnabled = (campaign: string, subMap: string): boolean => {
    const key = `${campaign}-${subMap}`;
    return mapSettings[key] !== false;
  };

  return (
    <div className="min-h-screen bg-dark flex flex-col items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="fixed inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle, #d4af37 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }} />
      </div>

      <div className="relative z-10 w-full max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <Home className="w-8 h-8 text-gold" />
          </button>
          <h1 className="text-4xl font-bold text-gold">Select Campaign</h1>
          <div className="w-10"></div>
        </div>

        {/* Mixed Maps Option */}
        <button
          onClick={() => handleSelect('all', 'mixed')}
          className="w-full mb-8 p-6 rounded-xl border-2 border-purple-500/50 bg-purple-500/10 hover:bg-purple-500/20 transition-all transform hover:scale-[1.02]"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-lg bg-purple-500/30 flex items-center justify-center flex-shrink-0">
              <Map className="w-8 h-8 text-purple-400" />
            </div>
            <div className="text-left flex-1">
              <h3 className="text-2xl font-bold text-white">Mixed Maps</h3>
              <p className="text-gray-400">All campaigns combined - Random maps from all dungeons</p>
            </div>
            <ChevronRight className="w-8 h-8 text-purple-400 flex-shrink-0" />
          </div>
        </button>

        {/* Campaign Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CAMPAIGNS.map((campaign) => {
            const isExpanded = expandedCampaign === campaign.id;
            
            return (
              <div
                key={campaign.id}
                className="rounded-xl border-2 overflow-hidden transition-all duration-300"
                style={{ 
                  borderColor: isExpanded ? campaign.color : campaign.color + '60',
                  backgroundColor: isExpanded ? campaign.color + '15' : campaign.color + '10'
                }}
                onMouseEnter={() => setExpandedCampaign(campaign.id)}
                onMouseLeave={() => setExpandedCampaign(null)}
              >
                {/* Campaign Header - Fixed Height */}
                <div
                  className="p-4 cursor-pointer flex items-center justify-between"
                  style={{ backgroundColor: campaign.color + '20' }}
                >
                  <div>
                    <h3 className="text-xl font-bold text-white">{campaign.name}</h3>
                    <p className="text-gray-400 text-sm mt-1">
                      {campaign.subMaps.length} map{campaign.subMaps.length > 1 ? 's' : ''}
                    </p>
                  </div>
                  <ChevronRight
                    className={`w-6 h-6 transition-transform duration-300 ${
                      isExpanded ? 'rotate-90' : ''
                    }`}
                    style={{ color: campaign.color }}
                  />
                </div>

                {/* Sub-Maps - Fixed Container with Smooth Transition */}
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="bg-black/50 p-4 space-y-2">
                    {/* Mixed Campaign Option */}
                    <button
                      onClick={() => handleSelect(campaign.id, 'mixed')}
                      className="w-full p-3 rounded-lg border border-gray-600 hover:border-gray-400 transition-all flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded bg-gray-700 flex items-center justify-center flex-shrink-0">
                        <Map className="w-4 h-4 text-gray-300" />
                      </div>
                      <span className="text-white font-semibold">
                        Mixed {campaign.name}
                      </span>
                    </button>

                    {/* Individual Sub-Maps */}
                    {campaign.subMaps.map((subMap) => {
                      const enabled = isMapEnabled(campaign.id, subMap.id);
                      
                      return (
                        <button
                          key={subMap.id}
                          onClick={() => enabled && handleSelect(campaign.id, subMap.id)}
                          disabled={!enabled}
                          className={`w-full p-3 rounded-lg border transition-all flex items-center gap-3 ${
                            enabled
                              ? 'border-gray-600 hover:border-gray-400'
                              : 'border-red-900/50 bg-red-900/10 cursor-not-allowed'
                          }`}
                        >
                          <div
                            className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
                            style={{ 
                              backgroundColor: enabled ? campaign.color + '40' : '#450a0a',
                              opacity: enabled ? 1 : 0.5
                            }}
                          >
                            {enabled ? (
                              <Map className="w-4 h-4" style={{ color: campaign.color }} />
                            ) : (
                              <Lock className="w-4 h-4 text-red-500" />
                            )}
                          </div>
                          <div className="flex-1 text-left">
                            <span className={enabled ? 'text-white' : 'text-gray-400'}>
                              {subMap.name}
                            </span>
                            {!enabled && (
                              <p className="text-xs text-orange-400 font-semibold">🚧 Under Construction</p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Instructions */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>📍 Hover over a campaign to see available maps</p>
          <p>🎯 Select a specific map or play mixed maps from that campaign</p>
          <p className="text-orange-400 mt-2">🚧 Maps marked "Under Construction" are temporarily unavailable</p>
        </div>
      </div>
    </div>
  );
}