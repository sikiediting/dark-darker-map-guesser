import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Trash2, Eye, Grid, List } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore';

interface Level {
  id: string;
  map_name: string;
  campaign: string;
  sub_map: string;
  difficulty: string;
  screenshot_url: string;
  grid_size: number;
  map_scale_meters: number;
  created_at: string;
}

const DIFFICULTY_COLORS: { [key: string]: string } = {
  easy: '#22c55e',
  hard: '#f59e0b',
  impossible: '#ef4444',
};

export default function LevelGallery() {
  const navigate = useNavigate();
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [filterCampaign, setFilterCampaign] = useState<string>('all');

  useEffect(() => {
    loadLevels();
  }, []);

  const loadLevels = async () => {
    try {
      const q = query(collection(db, 'levels'), orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(q);
      const levelsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Level[];
      setLevels(levelsData);
    } catch (error) {
      console.error('Error loading levels:', error);
    } finally {
      setLoading(false);
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

  const filteredLevels = levels.filter(level => {
    if (filterDifficulty !== 'all' && level.difficulty !== filterDifficulty) return false;
    if (filterCampaign !== 'all' && level.campaign !== filterCampaign) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-dark text-white p-4">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/admin')}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <Home className="w-6 h-6 text-gold" />
          </button>
          <h1 className="text-3xl font-bold text-gold">Level Gallery ({filteredLevels.length})</h1>
          <div className="w-10"></div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">Difficulty:</span>
            <button
              onClick={() => setFilterDifficulty('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
                filterDifficulty === 'all' ? 'bg-gold text-dark' : 'bg-black/50 text-gray-400'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterDifficulty('easy')}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
                filterDifficulty === 'easy' ? 'bg-green-600 text-white' : 'bg-black/50 text-gray-400'
              }`}
            >
              Easy
            </button>
            <button
              onClick={() => setFilterDifficulty('hard')}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
                filterDifficulty === 'hard' ? 'bg-yellow-600 text-white' : 'bg-black/50 text-gray-400'
              }`}
            >
              Hard
            </button>
            <button
              onClick={() => setFilterDifficulty('impossible')}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
                filterDifficulty === 'impossible' ? 'bg-red-600 text-white' : 'bg-black/50 text-gray-400'
              }`}
            >
              Impossible
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">Campaign:</span>
            <button
              onClick={() => setFilterCampaign('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
                filterCampaign === 'all' ? 'bg-gold text-dark' : 'bg-black/50 text-gray-400'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterCampaign('forgotten-castle')}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
                filterCampaign === 'forgotten-castle' ? 'bg-gold text-dark' : 'bg-black/50 text-gray-400'
              }`}
            >
              Castle
            </button>
            <button
              onClick={() => setFilterCampaign('goblin-caves')}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
                filterCampaign === 'goblin-caves' ? 'bg-gold text-dark' : 'bg-black/50 text-gray-400'
              }`}
            >
              Goblin
            </button>
            <button
              onClick={() => setFilterCampaign('frost-mountain')}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
                filterCampaign === 'frost-mountain' ? 'bg-gold text-dark' : 'bg-black/50 text-gray-400'
              }`}
            >
              Frost
            </button>
            <button
              onClick={() => setFilterCampaign('blue-maelstrom')}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
                filterCampaign === 'blue-maelstrom' ? 'bg-gold text-dark' : 'bg-black/50 text-gray-400'
              }`}
            >
              Maelstrom
            </button>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-gold text-dark' : 'bg-black/50 text-gray-400'}`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-gold text-dark' : 'bg-black/50 text-gray-400'}`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Gallery */}
        {loading ? (
          <div className="text-center text-gray-400 py-20">
            <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p>Loading levels...</p>
          </div>
        ) : filteredLevels.length === 0 ? (
          <div className="text-center text-gray-400 py-20">
            <p>No levels found for this filter</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredLevels.map((level) => (
              <div
                key={level.id}
                className="bg-black/50 rounded-lg border border-gold/20 overflow-hidden group"
              >
                {/* Screenshot Preview */}
                <div className="relative aspect-video bg-gray-900">
                  <img
                    src={level.screenshot_url}
                    alt={level.map_name}
                    className="w-full h-full object-cover"
                  />
                  {/* Difficulty Badge */}
                  <div
                    className="absolute top-2 right-2 px-2 py-1 rounded text-xs font-bold text-white"
                    style={{ backgroundColor: DIFFICULTY_COLORS[level.difficulty] || '#666' }}
                  >
                    {level.difficulty}
                  </div>
                  {/* Hover Actions */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <a
                      href={level.screenshot_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                      title="View Full Size"
                    >
                      <Eye className="w-5 h-5 text-white" />
                    </a>
                    <button
                      onClick={() => handleDelete(level.id)}
                      className="p-2 bg-red-500/50 rounded-lg hover:bg-red-500/70 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5 text-white" />
                    </button>
                  </div>
                </div>

                {/* Info */}
                <div className="p-3">
                  <div className="text-white font-semibold text-sm truncate">{level.map_name}</div>
                  <div className="text-gray-400 text-xs mt-1">
                    {level.sub_map} • {level.grid_size}×{level.grid_size}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredLevels.map((level) => (
              <div
                key={level.id}
                className="bg-black/50 rounded-lg border border-gold/20 p-3 flex items-center gap-4"
              >
                {/* Screenshot Thumbnail */}
                <div className="relative w-32 h-20 bg-gray-900 rounded overflow-hidden flex-shrink-0">
                  <img
                    src={level.screenshot_url}
                    alt={level.map_name}
                    className="w-full h-full object-cover"
                  />
                  <div
                    className="absolute top-1 right-1 px-1.5 py-0.5 rounded text-xs font-bold text-white"
                    style={{ backgroundColor: DIFFICULTY_COLORS[level.difficulty] || '#666' }}
                  >
                    {level.difficulty}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-white font-semibold">{level.map_name}</div>
                  <div className="text-gray-400 text-sm">
                    {level.campaign} • {level.sub_map} • {level.grid_size}×{level.grid_size} ({level.map_scale_meters}m)
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <a
                    href={level.screenshot_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                    title="View Full Size"
                  >
                    <Eye className="w-5 h-5 text-white" />
                  </a>
                  <button
                    onClick={() => handleDelete(level.id)}
                    className="p-2 bg-red-500/50 rounded-lg hover:bg-red-500/70 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}