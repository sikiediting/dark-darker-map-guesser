import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Trophy, Medal, Clock } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

interface LeaderboardEntry {
  id: string;
  player_name: string;
  total_score: number;
  campaign: string;
  sub_map: string;
  difficulty: string;
  map_type?: string;
  rounds_completed: number;
  created_at: string;
}

const CAMPAIGNS = [
  { id: 'forgotten-castle', name: 'Forgotten Castle', color: '#d4af37' },
  { id: 'goblin-caves', name: 'Goblin Caves', color: '#22c55e' },
  { id: 'frost-mountain', name: 'Frost Mountain', color: '#3b82f6' },
  { id: 'blue-maelstrom', name: 'Blue Maelstrom', color: '#06b6d4' },
];

const SUB_MAPS: { [key: string]: { name: string; campaign: string; color: string } } = {
  ruins: { name: 'The Ruins', campaign: 'forgotten-castle', color: '#d4af37' },
  crypts: { name: 'The Crypts', campaign: 'forgotten-castle', color: '#d4af37' },
  inferno: { name: 'The Inferno', campaign: 'forgotten-castle', color: '#d4af37' },
  goblin: { name: 'The Goblin Caves', campaign: 'goblin-caves', color: '#22c55e' },
  firedeep: { name: 'The Firedeep', campaign: 'goblin-caves', color: '#22c55e' },
  ice: { name: 'The Ice Cavern', campaign: 'frost-mountain', color: '#3b82f6' },
  'ice-abyss': { name: 'The Ice Abyss', campaign: 'frost-mountain', color: '#3b82f6' },
  'ship-graveyard': { name: 'The Ship Graveyard', campaign: 'blue-maelstrom', color: '#06b6d4' },
  mixed: { name: 'Mixed Maps', campaign: 'all', color: '#a855f7' },
};

const DIFFICULTIES = [
  { id: 'all', name: 'All Difficulties', color: '#a855f7' },
  { id: 'easy', name: 'Easy', color: '#22c55e' },
  { id: 'hard', name: 'Hard', color: '#f59e0b' },
  { id: 'impossible', name: 'Impossible', color: '#ef4444' },
];

type FilterType = 'mixed' | 'campaign' | 'submap';
type FilterValue = string;

export default function LeaderboardPage() {
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<FilterType>('mixed');
  const [filterValue, setFilterValue] = useState<FilterValue>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');

  useEffect(() => {
    loadLeaderboard();
  }, [filterType, filterValue, difficultyFilter]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      let q = query(
        collection(db, 'leaderboard'),
        orderBy('total_score', 'desc'),
        limit(100)
      );

      const querySnapshot = await getDocs(q);
      let entries = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LeaderboardEntry[];

      // Apply filters
      if (filterType === 'mixed') {
        entries = entries.filter(entry => 
          entry.campaign === 'all' || entry.sub_map === 'mixed' || (entry.map_type && entry.map_type === 'all')
        );
      } else if (filterType === 'campaign' && filterValue !== 'all') {
        entries = entries.filter(entry => entry.campaign === filterValue);
      } else if (filterType === 'submap' && filterValue !== 'all') {
        entries = entries.filter(entry => entry.sub_map === filterValue);
      }

      // Apply difficulty filter
      if (difficultyFilter !== 'all') {
        entries = entries.filter(entry => entry.difficulty === difficultyFilter);
      }

      setLeaderboard(entries);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Medal className="w-6 h-6 text-yellow-500" />;
    if (index === 1) return <Medal className="w-6 h-6 text-gray-400" />;
    if (index === 2) return <Medal className="w-6 h-6 text-orange-600" />;
    return <span className="w-6 h-6 flex items-center justify-center text-gray-500 font-bold">{index + 1}</span>;
  };

  const getDisplayName = (entry: LeaderboardEntry) => {
    if (entry.campaign === 'all' || entry.sub_map === 'mixed' || (entry.map_type && entry.map_type === 'all')) {
      return 'Mixed Maps';
    }
    if (entry.sub_map && SUB_MAPS[entry.sub_map]) {
      return SUB_MAPS[entry.sub_map].name;
    }
    if (entry.map_type && SUB_MAPS[entry.map_type]) {
      return SUB_MAPS[entry.map_type].name;
    }
    return entry.sub_map || entry.map_type || 'Unknown';
  };

  const getColor = (entry: LeaderboardEntry) => {
    if (entry.campaign === 'all' || entry.sub_map === 'mixed' || (entry.map_type && entry.map_type === 'all')) {
      return '#a855f7';
    }
    if (entry.sub_map && SUB_MAPS[entry.sub_map]) {
      return SUB_MAPS[entry.sub_map].color;
    }
    if (entry.map_type && SUB_MAPS[entry.map_type]) {
      return SUB_MAPS[entry.map_type].color;
    }
    return '#d4af37';
  };

  const getDifficultyColor = (difficulty: string) => {
    const diff = DIFFICULTIES.find(d => d.id === difficulty);
    return diff?.color || '#d4af37';
  };

  const getDifficultyName = (difficulty: string) => {
    const diff = DIFFICULTIES.find(d => d.id === difficulty);
    return diff?.name || difficulty;
  };

  return (
    <div className="min-h-screen bg-dark text-white p-4">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <Home className="w-6 h-6 text-gold" />
          </button>
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8 text-gold" />
            <h1 className="text-3xl font-bold text-gold">Leaderboard</h1>
          </div>
          <div className="w-10"></div>
        </div>

        {/* Difficulty Filter - Always Visible */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="text-gray-400 text-sm">Difficulty:</span>
          {DIFFICULTIES.map((diff) => (
            <button
              key={diff.id}
              onClick={() => setDifficultyFilter(diff.id)}
              className={`px-4 py-2 rounded-lg font-semibold transition-all text-sm ${
                difficultyFilter === diff.id
                  ? 'bg-gold text-dark'
                  : 'bg-black/50 text-gray-400 hover:text-white'
              }`}
              style={{ 
                borderColor: difficultyFilter === diff.id ? diff.color : undefined,
                borderWidth: difficultyFilter === diff.id ? 2 : 0
              }}
            >
              {diff.name}
            </button>
          ))}
        </div>

        {/* Filter Type Selection */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <button
            onClick={() => { setFilterType('mixed'); setFilterValue('all'); }}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              filterType === 'mixed'
                ? 'bg-gold text-dark'
                : 'bg-black/50 text-gray-400 hover:text-white'
            }`}
          >
            Mixed Maps
          </button>
          <button
            onClick={() => { setFilterType('campaign'); setFilterValue('all'); }}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              filterType === 'campaign'
                ? 'bg-gold text-dark'
                : 'bg-black/50 text-gray-400 hover:text-white'
            }`}
          >
            By Campaign
          </button>
          <button
            onClick={() => { setFilterType('submap'); setFilterValue('all'); }}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              filterType === 'submap'
                ? 'bg-gold text-dark'
                : 'bg-black/50 text-gray-400 hover:text-white'
            }`}
          >
            By Sub-Map
          </button>
        </div>

        {/* Filter Value Selection */}
        {filterType === 'campaign' && (
          <div className="flex items-center justify-center gap-2 mb-8 flex-wrap">
            <button
              onClick={() => setFilterValue('all')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                filterValue === 'all'
                  ? 'bg-purple-500 text-white'
                  : 'bg-black/50 text-gray-400 hover:text-white'
              }`}
            >
              All Campaigns
            </button>
            {CAMPAIGNS.map((campaign) => (
              <button
                key={campaign.id}
                onClick={() => setFilterValue(campaign.id)}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  filterValue === campaign.id
                    ? 'bg-gold text-dark'
                    : 'bg-black/50 text-gray-400 hover:text-white'
                }`}
              >
                {campaign.name}
              </button>
            ))}
          </div>
        )}

        {filterType === 'submap' && (
          <div className="flex items-center justify-center gap-2 mb-8 flex-wrap">
            <button
              onClick={() => setFilterValue('all')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                filterValue === 'all'
                  ? 'bg-purple-500 text-white'
                  : 'bg-black/50 text-gray-400 hover:text-white'
              }`}
            >
              All Sub-Maps
            </button>
            {Object.entries(SUB_MAPS).map(([id, data]) => (
              <button
                key={id}
                onClick={() => setFilterValue(id)}
                className={`px-4 py-2 rounded-lg font-semibold transition-all text-sm ${
                  filterValue === id
                    ? 'bg-gold text-dark'
                    : 'bg-black/50 text-gray-400 hover:text-white'
                }`}
              >
                {data.name}
              </button>
            ))}
          </div>
        )}

        {/* Current Filter Display */}
        <div className="text-center mb-6">
          <p className="text-gray-400">
            {filterType === 'mixed' && '📊 Mixed Maps Gamemode'}
            {filterType === 'campaign' && filterValue === 'all' && 'Showing all campaigns'}
            {filterType === 'campaign' && filterValue !== 'all' && `Campaign: ${CAMPAIGNS.find(c => c.id === filterValue)?.name}`}
            {filterType === 'submap' && filterValue === 'all' && 'Showing all sub-maps'}
            {filterType === 'submap' && filterValue !== 'all' && `Sub-Map: ${SUB_MAPS[filterValue]?.name}`}
            {difficultyFilter !== 'all' && ` • Difficulty: ${getDifficultyName(difficultyFilter)}`}
          </p>
        </div>

        {/* Leaderboard Table */}
        <div className="bg-black/30 border border-gold/30 rounded-xl overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 p-4 bg-gold/20 border-b border-gold/30 font-bold text-gold">
            <div className="col-span-1 text-center">Rank</div>
            <div className="col-span-3">Player</div>
            <div className="col-span-2">Map</div>
            <div className="col-span-2 text-center">Difficulty</div>
            <div className="col-span-2 text-center">Rounds</div>
            <div className="col-span-2 text-right">Score</div>
          </div>

          {/* Table Body */}
          {loading ? (
            <div className="p-8 text-center text-gray-400">
              <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="mt-4">Loading leaderboard...</p>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <Trophy className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No scores yet for this filter. Be the first to play!</p>
            </div>
          ) : (
            <div className="divide-y divide-gold/20">
              {leaderboard.map((entry, index) => {
                const color = getColor(entry);
                const diffColor = getDifficultyColor(entry.difficulty);
                return (
                  <div
                    key={entry.id}
                    className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-white/5 transition-colors"
                  >
                    <div className="col-span-1 flex justify-center">
                      {getRankIcon(index)}
                    </div>
                    <div className="col-span-3">
                      <div className="font-semibold text-white">{entry.player_name}</div>
                    </div>
                    <div className="col-span-2">
                      <span
                        className="px-3 py-1 rounded-full text-xs font-semibold"
                        style={{
                          backgroundColor: color + '20',
                          color: color
                        }}
                      >
                        {getDisplayName(entry)}
                      </span>
                    </div>
                    <div className="col-span-2 text-center">
                      <span
                        className="px-3 py-1 rounded-full text-xs font-semibold flex items-center justify-center gap-1"
                        style={{
                          backgroundColor: diffColor + '20',
                          color: diffColor
                        }}
                      >
                        <Clock className="w-3 h-3" />
                        {getDifficultyName(entry.difficulty)}
                      </span>
                    </div>
                    <div className="col-span-2 text-center text-gray-400">
                      {entry.rounds_completed}
                    </div>
                    <div className="col-span-2 text-right font-bold" style={{ color }}>
                      {entry.total_score.toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>🏆 Top 100 scores displayed</p>
          <p>📊 Filter by map type and difficulty to see specific rankings</p>
        </div>
      </div>
    </div>
  );
}