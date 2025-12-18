import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '../config/supabase';
import type { Database } from '../config/supabase';
import { showSuccessToast, showErrorToast } from '../utils/notifications';

type Movie = Database['public']['Tables']['movies']['Row'];
type MovieUpdate = Database['public']['Tables']['movies']['Update'];

interface MovieDetailState {
    currentMovie: Movie | null; 
    loading: boolean; 
    saving: boolean; 
    error: string | null;
}
export const fetchMovieDetail = createAsyncThunk<
    Movie, 
    string, 
    { rejectValue: string }
>('movieDetail/fetchMovieDetail', async (movieId, { rejectWithValue }) => {
    try {
        const { data, error } = await supabase
            .from('movies')
            .select('*')
            .eq('id', movieId)
            .single();

        if (error) {
            throw new Error(`Ошибка при загрузке фильма: ${error.message}`);
        }

        if (!data) {
            throw new Error('Фильм не найден.');
        }

        return data;

    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка загрузки';
        showErrorToast('Ошибка загрузки', errorMessage);
        return rejectWithValue(errorMessage);
    }
});
export const updateMovie = createAsyncThunk<
    Movie, 
    { movieId: string; movieData: MovieUpdate }, 
    { rejectValue: string }
>('movieDetail/updateMovie', async ({ movieId, movieData }, { rejectWithValue }) => {
    try {
        const { data, error } = await supabase
            .from('movies')
            .update(movieData)
            .eq('id', movieId)
            .select() 
            .single();

        if (error) {
            throw new Error(`Ошибка при сохранении: ${error.message}`);
        }

        showSuccessToast('Успех', `Фильм "${data?.title || movieId}" успешно обновлен!`);
        return data!;

    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка сохранения';
        showErrorToast('Ошибка сохранения', errorMessage);
        return rejectWithValue(errorMessage);
    }
});

const initialState: MovieDetailState = {
    currentMovie: null,
    loading: false,
    saving: false,
    error: null,
};

const movieDetailSlice = createSlice({
    name: 'movieDetail',
    initialState,
    reducers: {
        clearMovieDetail: (state) => {
            state.currentMovie = null;
            state.loading = false;
            state.saving = false;
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchMovieDetail.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchMovieDetail.fulfilled, (state, action) => {
                state.loading = false;
                state.currentMovie = action.payload;
            })
            .addCase(fetchMovieDetail.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
                state.currentMovie = null;
            })
        builder
            .addCase(updateMovie.pending, (state) => {
                state.saving = true;
                state.error = null;
            })
            .addCase(updateMovie.fulfilled, (state, action) => {
                state.saving = false;
                state.currentMovie = action.payload; 
            })
            .addCase(updateMovie.rejected, (state, action) => {
                state.saving = false;
                state.error = action.payload as string;
            });
    },
});

export const { clearMovieDetail } = movieDetailSlice.actions;
export default movieDetailSlice.reducer;