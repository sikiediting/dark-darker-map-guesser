import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type MapType = 'ruins' | 'goblin' | 'ice';

export type Level = {
  id: number;
  map_image_url: string;
  screenshot_url: string;
  target_x: number;
  target_y: number;
  map_name: string;
  map_type: MapType;
  grid_size: number;
  map_scale_meters: number;
  created_at: string;
};

export type LeaderboardEntry = {
  id: number;
  player_name: string;
  total_score: number;
  map_type: string;
  rounds_completed: number;
  created_at: string;
};