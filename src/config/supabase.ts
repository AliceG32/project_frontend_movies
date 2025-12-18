import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY } from './api';
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
        persistSession: false 
    }
});
export type Database = {
    public: {
        Tables: {
            movies: {
                Row: {
                    id: string;
                    title: string;
                    release_year: number;
                    duration_minutes: number;
                    description: string;
                    rating: number;
                    subtitles: string | null; 
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    title: string;
                    release_year: number;
                    duration_minutes: number;
                    description: string;
                    rating: number;
                    subtitles?: string | null; 
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    title?: string;
                    release_year?: number;
                    duration_minutes?: number;
                    description?: string;
                    rating?: number;
                    subtitles?: string | null; 
                    created_at?: string;
                    updated_at?: string;
                };
            };
            favorites: {
                Row: {
                    id: string;
                    user_id: string;
                    movie_id: string;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    movie_id: string;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    movie_id?: string;
                    created_at?: string;
                };
            };
            comments: {
                Row: {
                    id: string;
                    created_at: string;
                    updated_at: string;
                    comment: string;
                    movie_id: string;
                    user_id: string;
                };
                Insert: {
                    id?: string;
                    created_at?: string;
                    updated_at?: string;
                    comment: string;
                    movie_id: string;
                    user_id: string;
                };
                Update: {
                    id?: string;
                    created_at?: string;
                    updated_at?: string;
                    comment?: string;
                    movie_id?: string;
                    user_id?: string;
                };
            };
        };
    };
};