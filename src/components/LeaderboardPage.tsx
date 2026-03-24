import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Trophy, Search } from 'lucide-react';
import { supabase, LeaderboardEntry } from '../lib/supabase';
import { getMapTypeName, getMapTypeColor } from '../lib/utils';

export default function LeaderboardPage() {
  const navigate = useNavigate();
  const [allScores, setAllScores] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMapType, setFilterMapType] = useState<string>('all');

  useEffect(() => {
    loadAllScores();
  }, []);

  const loadAllScores = async () => {
    try {
      const { data, error } = await supabase
        .from('leaderboard')
        .select('*')
        .order('total_score', { ascending: false });

      if (error) throw error;
      setAllScores(data || []);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredScores = allScores.filter((entry) => {
    const matchesSearch = entry.player_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMapType = filterMapType === 'all' || entry.map_type === filterMapType;
    return matchesSearch && matchesMapType;
  });

  return (
    <div className="min-h-screen bg-dark text-white p-4">
      <div className="container mx-auto max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <Home className="w-6 h-6 text-gold" />
          </button>
          <h1 className="text-3xl font-bold text-gold flex items-center gap-2">
            <Trophy className="w-8 h-8" />
            Leaderboard
          </h1>
          <div className="w-10"></div>
        </div>

        <div className="bg-black/30 border border-gold/30 rounded-xl p-4 mb-6 space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search player..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-black/50 border border-gold/50 rounded-lg text-white focus:outline-none focus:border-gold"
              />
            </div>
            <select
              value={filterMapType}
              onChange={(e) => setFilterMapType(e.target.value)}
              className="px-4 py-2 bg-black/50 border border-gold/50 rounded-lg text-white focus:outline-none focus:border-gold"
            >
              <option value="all">All Maps</option>
              <option value="ruins">Ancient Ruins</option>
              <option value="goblin">Goblin Caves</option>
              <option value="ice">Ice Caverns</option>
              <option value="all">Mixed Maps</option>
            </select>
          </div>
          <div className="text-gray-400 text-sm">
            Showing {filteredScores.length} of {allScores.length} scores
          </div>
        </div>

        <div className="bg-black/30 border border-gold/30 rounded-xl overflow-hidden">
          {loading ? (
            <div className="text-center text-gray-400 py-16">Loading...</div>
          ) : filteredScores.length === 0 ? (
            <div className="text-center text-gray-400 py-16">No scores found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-black/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-gold font-semibold">#</th>
                    <th className="px-4 py-3 text-left text-gold font-semibold">Player</th>
                    <th className="px-4 py-3 text-left text-gold font-semibold">Map Type</th>
                    <th className="px-4 py-3 text-left text-gold font-semibold">Rounds</th>
                    <th className="px-4 py-3 text-left text-gold font-semibold">Score</th>
                    <th className="px-4 py-3 text-left text-gold font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredScores.map((entry, index) => (
                    <tr key={entry.id} className="border-t border-gold/20 hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          index === 0 ? 'bg-yellow-500 text-black' :
                          index === 1 ? 'bg-gray-400 text-black' :
                          index === 2 ? 'bg-orange-600 text-white' :
                          'bg-gray-700 text-white'
                        }`}>
                          {index + 1}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold">{entry.player_name}</td>
                      <td className="px-4 py-3">
                        <span
                          className="px-3 py-1 rounded-full text-sm font-semibold"
                          style={{
                            backgroundColor: getMapTypeColor(entry.map_type) + '33',
                            color: getMapTypeColor(entry.map_type)
                          }}
                        >
                          {getMapTypeName(entry.map_type)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400">{entry.rounds_completed}</td>
                      <td className="px-4 py-3 text-gold font-bold text-lg">
                        {entry.total_score.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-sm">
                        {new Date(entry.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}