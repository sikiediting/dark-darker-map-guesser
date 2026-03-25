import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Trophy, Medal } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { getMapTypeName, getMapTypeColor } from '../lib/utils';

interface LeaderboardEntry {
  id: string;
  player_name: string;
  total_score: number;
  map_type: string;
  rounds_completed: number;
  created_at: string;
}

export default function LeaderboardPage() {
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadLeaderboard();
  }, [filter]);

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

      if (filter !== 'all') {
        entries = entries.filter(entry => entry.map_type === filter);
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

  return (
    <div className="min-h-screen bg-dark text-white p-4">
      <div className="container mx-auto max-w-4xl">
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

        {/* Filter */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              filter === 'all'
                ? 'bg-gold text-dark'
                : 'bg-black/50 text-gray-400 hover:text-white'
            }`}
          >
            All Maps
          </button>
          <button
            onClick={() => setFilter('ruins')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              filter === 'ruins'
                ? 'bg-gold text-dark'
                : 'bg-black/50 text-gray-400 hover:text-white'
            }`}
          >
            Ruins
          </button>
          <button
            onClick={() => setFilter('goblin')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              filter === 'goblin'
                ? 'bg-gold text-dark'
                : 'bg-black/50 text-gray-400 hover:text-white'
            }`}
          >
            Goblin
          </button>
          <button
            onClick={() => setFilter('ice')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              filter === 'ice'
                ? 'bg-gold text-dark'
                : 'bg-black/50 text-gray-400 hover:text-white'
            }`}
          >
            Ice
          </button>
        </div>

        {/* Leaderboard Table */}
        <div className="bg-black/30 border border-gold/30 rounded-xl overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 p-4 bg-gold/20 border-b border-gold/30 font-bold text-gold">
            <div className="col-span-1 text-center">Rank</div>
            <div className="col-span-4">Player</div>
            <div className="col-span-3">Map Type</div>
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
              <p>No scores yet. Be the first to play!</p>
            </div>
          ) : (
            <div className="divide-y divide-gold/20">
              {leaderboard.map((entry, index) => (
                <div
                  key={entry.id}
                  className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-white/5 transition-colors"
                >
                  <div className="col-span-1 flex justify-center">
                    {getRankIcon(index)}
                  </div>
                  <div className="col-span-4">
                    <div className="font-semibold text-white">{entry.player_name}</div>
                  </div>
                  <div className="col-span-3">
                    <span
                      className="px-3 py-1 rounded-full text-xs font-semibold"
                      style={{
                        backgroundColor: getMapTypeColor(entry.map_type) + '20',
                        color: getMapTypeColor(entry.map_type)
                      }}
                    >
                      {getMapTypeName(entry.map_type)}
                    </span>
                  </div>
                  <div className="col-span-2 text-center text-gray-400">
                    {entry.rounds_completed}
                  </div>
                  <div className="col-span-2 text-right font-bold text-gold">
                    {entry.total_score.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>🏆 Top 100 scores displayed</p>
          <p>📊 Filter by map type to see specific rankings</p>
        </div>
      </div>
    </div>
  );
}