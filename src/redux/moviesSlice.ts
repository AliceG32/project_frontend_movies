import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { supabase } from '../config/supabase';
import type { Database } from '../config/supabase';
import { showSuccessToast, showErrorToast } from '../utils/notifications';
import type { AppDispatch, RootState } from './store';
const ITEMS_PER_PAGE: number = 10;
type Movie = Database['public']['Tables']['movies']['Row'];
export type SortField = 'title' | 'release_year' | 'duration_minutes' | 'rating' | 'updated_at' | 'created_at';
export type SortDirection = 'asc' | 'desc';

export interface MovieWithRank extends Movie {
    rank?: number;
    comment_count?: number;
}

export { getSupabaseFieldName };

interface MoviesState {
    movies: MovieWithRank[];
    loading: boolean;
    error: string | null;
    totalCount: number;

    searchText: string;
    currentSearchText: string;
    currentPage: number;
    sortField: SortField;
    sortDirection: SortDirection;
    favoriteIds: string[];
    favoritesLoading: string[]; 
    favoriteMovies: Movie[];
    favoritesTotalCount: number;
    favoritesCurrentPage: number;
    favoritesSortField: SortField;
    favoritesSortDirection: SortDirection;
}

const getSupabaseFieldName = (field: SortField): string => {
    switch (field) {
        case 'title': return 'title';
        case 'release_year': return 'release_year';
        case 'duration_minutes': return 'duration_minutes';
        case 'rating': return 'rating';
        case 'created_at': return 'created_at';
        case 'updated_at': return 'updated_at';
        default: return 'updated_at';
    }
};
const addCommentCountsToMovies = async (moviesData: Movie[]): Promise<MovieWithRank[]> => {
    try {
        if (moviesData.length === 0) return moviesData as MovieWithRank[];

        const movieIds = moviesData.map(movie => movie.id);

        const { data: commentsData, error } = await supabase
            .from('comments')
            .select('movie_id')
            .in('movie_id', movieIds);

        if (error) {
            console.error('Ошибка при загрузке комментариев:', error);
            return moviesData.map(movie => ({ ...movie, comment_count: 0 })) as MovieWithRank[];
        }

        const commentCountMap = new Map<string, number>();
        movieIds.forEach(id => commentCountMap.set(id, 0));

        commentsData?.forEach(comment => {
            const currentCount = commentCountMap.get(comment.movie_id) || 0;
            commentCountMap.set(comment.movie_id, currentCount + 1);
        });

        return moviesData.map(movie => ({
            ...movie,
            comment_count: commentCountMap.get(movie.id) || 0
        })) as MovieWithRank[];

    } catch (err) {
        console.error('Ошибка при подсчете комментариев:', err);
        return moviesData.map(movie => ({ ...movie, comment_count: 0 })) as MovieWithRank[];
    }
};

const getFullTextCount = async (searchQuery: string): Promise<number> => {
    try {
        const { data, error } = await supabase.rpc('search_movies_count', {
            search_text: searchQuery
        });

        if (error) {
            console.warn('RPC подсчета не сработал:', error);
            return await getSimpleCount(searchQuery);
        }

        return data || 0;

    } catch (err) {
        console.error('Ошибка при получении количества результатов:', err);
        return await getSimpleCount(searchQuery);
    }
};

const getSimpleCount = async (searchQuery: string): Promise<number> => {
    const { count } = await supabase
        .from('movies')
        .select('*', { count: 'exact', head: true })
        .ilike('title', `%${searchQuery}%`);

    return count || 0;
};
interface FetchMoviesArgs {
    currentPage: number;
    currentSearchText: string;
    sortField: SortField;
    sortDirection: SortDirection;
}

export const fetchMovies = createAsyncThunk<
    { movies: MovieWithRank[]; totalCount: number },
    FetchMoviesArgs,
    {
        dispatch: AppDispatch;
        state: { movies: MoviesState };
        rejectValue: string;
    }
>('movies/fetchMovies', async ({ currentPage, currentSearchText, sortField, sortDirection }, { rejectWithValue }) => {
    try {
        const from = (currentPage - 1) * ITEMS_PER_PAGE;
        const searchQuery = currentSearchText.trim();
        let moviesData: Movie[] = [];
        let totalCount: number = 0;

        if (searchQuery) {
            const { data, error: rpcError } = await supabase.rpc('search_movies', {
                search_text: searchQuery,
                offset_val: from,
                limit_val: ITEMS_PER_PAGE
            });

            if (rpcError) {
                const { data: simpleData, error: simpleError, count } = await supabase
                    .from('movies')
                    .select('*', { count: 'exact' })
                    .ilike('title', `%${searchQuery}%`)
                    .order(getSupabaseFieldName(sortField), { ascending: sortDirection === 'asc' })
                    .range(from, from + ITEMS_PER_PAGE - 1);

                if (simpleError) throw new Error(`Ошибка простого поиска: ${simpleError.message}`);

                moviesData = (simpleData || []).map(movie => ({ ...movie, rank: 0 }));
                totalCount = count || 0;

            } else {
                moviesData = (data || []).map((item: any) => ({
                    id: item.id, title: item.title, release_year: item.release_year, duration_minutes: item.duration_minutes,
                    description: item.description, rating: item.rating, subtitles: item.subtitles, created_at: item.created_at,
                    updated_at: item.updated_at, rank: item.rank
                }));
                totalCount = await getFullTextCount(searchQuery);
            }
        } else {
            const query = supabase
                .from('movies')
                .select('*', { count: 'exact' })
                .order(getSupabaseFieldName(sortField), { ascending: sortDirection === 'asc' })
                .range(from, from + ITEMS_PER_PAGE - 1);

            const { data, error: supabaseError, count } = await query;

            if (supabaseError) throw new Error(`Ошибка базы данных: ${supabaseError.message}`);

            moviesData = data || [];
            totalCount = count || 0;
        }

        const moviesWithComments = await addCommentCountsToMovies(moviesData);
        return { movies: moviesWithComments, totalCount };

    } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Неизвестная ошибка загрузки';
        return rejectWithValue(errorMsg);
    }
});
interface FetchFavoritesArgs {
    userId: string;
    currentPage: number;
    sortField: SortField;
    sortDirection: SortDirection;
}

export const fetchFavoriteMovies = createAsyncThunk<
    { movies: Movie[]; totalCount: number },
    FetchFavoritesArgs,
    {
        dispatch: AppDispatch;
        state: RootState;
        rejectValue: string;
    }
>('movies/fetchFavoriteMovies', async ({ userId, currentPage, sortField, sortDirection }, { rejectWithValue }) => {
    try {
        const { data: favoritesData, error: favoritesError } = await supabase
            .from('favorites')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: sortDirection === 'asc' });

        if (favoritesError) throw new Error(`Ошибка при загрузке избранного: ${favoritesError.message}`);

        const movieIds = favoritesData.map(fav => fav.movie_id);
        const totalCount = movieIds.length;
        if (totalCount === 0) return { movies: [], totalCount: 0 };
        const from = (currentPage - 1) * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;
        const paginatedMovieIds = movieIds.slice(from, to + 1);
        let query = supabase.from('movies').select('*').in('id', paginatedMovieIds);
        if (sortField !== 'created_at') {
            query = query.order(getSupabaseFieldName(sortField), { ascending: sortDirection === 'asc' });
        }

        const { data: moviesData, error: moviesError } = await query;
        if (moviesError) throw new Error(`Ошибка базы данных: ${moviesError.message}`);

        const sortedMovies = moviesData || [];
        if (sortField === 'created_at') {
            const favMap = new Map(favoritesData.map(fav => [fav.movie_id, fav.created_at]));
            sortedMovies.sort((a, b) => {
                const dateA = new Date(favMap.get(a.id) || 0).getTime();
                const dateB = new Date(favMap.get(b.id) || 0).getTime();
                return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
            });
        }

        return { movies: sortedMovies, totalCount };

    } catch (err) {
        return rejectWithValue(err instanceof Error ? err.message : 'Неизвестная ошибка');
    }
});
export const fetchFavoriteIds = createAsyncThunk<
    string[],
    string,
    {
        dispatch: AppDispatch;
        state: RootState;
        rejectValue: string;
    }
>('movies/fetchFavoriteIds', async (userId, { rejectWithValue }) => {
    try {
        const { data: favoritesData, error: favoritesError } = await supabase
            .from('favorites')
            .select('movie_id')
            .eq('user_id', userId);

        if (favoritesError) {
            throw new Error(`Ошибка при загрузке избранного: ${favoritesError.message}`);
        }

        return (favoritesData || []).map(fav => String(fav.movie_id));

    } catch (err) {
        return rejectWithValue(err instanceof Error ? err.message : 'Неизвестная ошибка при загрузке избранного');
    }
});
export const addToFavorites = createAsyncThunk<
    { movieId: string; movieTitle: string },
    { movieId: string; movieTitle: string; userId: string },
    {
        dispatch: AppDispatch;
        state: RootState;
        rejectValue: string;
    }
>('movies/addToFavorites', async ({ movieId, movieTitle, userId }, { rejectWithValue }) => {
    try {
        const { data: existingFavorite, error: checkError } = await supabase
            .from('favorites')
            .select('id')
            .eq('user_id', userId)
            .eq('movie_id', movieId)
            .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
            throw new Error(`Ошибка при проверке: ${checkError.message}`);
        }

        if (existingFavorite) {
            alert(`"${movieTitle}" уже в избранном!`);
            return rejectWithValue(`"${movieTitle}" уже в избранном!`);
        }

        const { error } = await supabase
            .from('favorites')
            .insert({
                user_id: userId,
                movie_id: movieId
            });

        if (error) {
            throw new Error(`Ошибка при добавлении: ${error.message}`);
        }

        showSuccessToast(
            '⭐ Добавлено в избранное',
            `Фильм "<strong>${movieTitle}</strong>" добавлен в избранное!`
        );

        return { movieId, movieTitle };

    } catch (err) {
        const errorMsg = `Не удалось добавить фильм "${movieTitle}" в избранное: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`;
        showErrorToast('Ошибка добавления', errorMsg);
        return rejectWithValue(errorMsg);
    }
});
interface RemoveFavoritesArgs {
    movieId: string;
    movieTitle: string;
    userId: string;
    shouldRefreshList?: boolean; 
    fetchFavoritesArgs?: FetchFavoritesArgs; 
}

export const removeFromFavorites = createAsyncThunk<
    { movieId: string; movieTitle: string },
    RemoveFavoritesArgs,
    {
        dispatch: AppDispatch;
        state: RootState;
        rejectValue: string;
    }
>('movies/removeFromFavorites', async (
    { movieId, movieTitle, userId, shouldRefreshList, fetchFavoritesArgs },
    { dispatch, rejectWithValue }
) => {
    try {
        if (!window.confirm(`Вы уверены, что хотите удалить "${movieTitle}" из избранного?`)) {
            return rejectWithValue('Отмена удаления из избранного');
        }

        const { error } = await supabase
            .from('favorites')
            .delete()
            .eq('user_id', userId)
            .eq('movie_id', movieId);

        if (error) {
            throw new Error(`Ошибка при удалении: ${error.message}`);
        }

        showSuccessToast(
            '❌ Удалено из избранного',
            `Фильм "<strong>${movieTitle}</strong>" удален из избранного.`
        );
        if (shouldRefreshList && fetchFavoritesArgs) {
            dispatch(fetchFavoriteMovies(fetchFavoritesArgs));
        }

        return { movieId, movieTitle };

    } catch (err) {
        const errorMsg = `Не удалось удалить фильм "${movieTitle}" из избранного: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`;
        showErrorToast('Ошибка удаления', errorMsg);
        return rejectWithValue(errorMsg);
    }
});
export const deleteMovie = createAsyncThunk<
    void,
    { movieId: string; movieTitle: string; fetchMoviesArgs: FetchMoviesArgs },
    {
        dispatch: AppDispatch;
        state: RootState;
        rejectValue: string;
    }
>('movies/deleteMovie', async ({ movieId, movieTitle, fetchMoviesArgs }, { dispatch, rejectWithValue }) => {
    if (!window.confirm(`Вы уверены, что хотите удалить фильм "${movieTitle}"?`)) {
        return rejectWithValue('Отмена удаления фильма');
    }

    try {
        const { error } = await supabase
            .from('movies')
            .delete()
            .eq('id', movieId);

        if (error) {
            throw new Error(`Ошибка при удалении: ${error.message}`);
        }

        await supabase.from('favorites').delete().eq('movie_id', movieId);
        await supabase.from('comments').delete().eq('movie_id', movieId);
        await dispatch(fetchMovies(fetchMoviesArgs));

        showSuccessToast(
            '🗑️ Фильм удален',
            `Фильм "<strong>${movieTitle}</strong>" успешно удален из базы данных.`
        );

    } catch (err) {
        const errorMsg = `Не удалось удалить фильм "${movieTitle}": ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`;
        showErrorToast('Ошибка удаления', errorMsg);
        return rejectWithValue(errorMsg);
    }
});
export const initialState: MoviesState = {
    movies: [],
    loading: false,
    error: null,
    totalCount: 0,
    searchText: '',
    currentSearchText: '',
    currentPage: 1,
    sortField: 'updated_at',
    sortDirection: 'desc',
    favoriteIds: [],
    favoritesLoading: [],
    favoriteMovies: [],
    favoritesTotalCount: 0,
    favoritesCurrentPage: 1,
    favoritesSortField: 'created_at',
    favoritesSortDirection: 'desc',
};
const moviesSlice = createSlice({
    name: 'movies',
    initialState,
    reducers: {
        setSearchText: (state, action: PayloadAction<string>) => {
            state.searchText = action.payload;
        },
        setCurrentSearchText: (state, action: PayloadAction<string>) => {
            state.currentSearchText = action.payload;
            state.currentPage = 1;
        },
        setCurrentPage: (state, action: PayloadAction<number>) => {
            state.currentPage = action.payload;
        },
        setSort: (state, action: PayloadAction<{ field: SortField, direction: SortDirection }>) => {
            state.sortField = action.payload.field;
            state.sortDirection = action.payload.direction;
            state.currentPage = 1;
        },
        clearSort: (state) => {
            state.sortField = 'updated_at';
            state.sortDirection = 'desc';
            state.currentPage = 1;
        },
        clearSearch: (state) => {
            state.searchText = '';
            state.currentSearchText = '';
            state.currentPage = 1;
        },
        setFavoritesPage: (state, action: PayloadAction<number>) => {
            state.favoritesCurrentPage = action.payload;
        },
        setFavoritesSort: (state, action: PayloadAction<{ field: SortField, direction: SortDirection }>) => {
            state.favoritesSortField = action.payload.field;
            state.favoritesSortDirection = action.payload.direction;
            state.favoritesCurrentPage = 1;
        },
        clearFavoritesSort: (state) => {
            state.favoritesSortField = 'created_at';
            state.favoritesSortDirection = 'desc';
            state.favoritesCurrentPage = 1;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchMovies.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchMovies.fulfilled, (state, action) => {
                state.loading = false;
                state.movies = action.payload.movies;
                state.totalCount = action.payload.totalCount;
            })
            .addCase(fetchMovies.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
                state.movies = [];
                state.totalCount = 0;
            });
        builder
            .addCase(fetchFavoriteMovies.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchFavoriteMovies.fulfilled, (state, action) => {
                state.loading = false;
                state.favoriteMovies = action.payload.movies;
                state.favoritesTotalCount = action.payload.totalCount;
            })
            .addCase(fetchFavoriteMovies.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
                state.favoriteMovies = [];
                state.favoritesTotalCount = 0;
            });
        builder
            .addCase(fetchFavoriteIds.fulfilled, (state, action) => {
                state.favoriteIds = action.payload;
            })
            .addCase(fetchFavoriteIds.rejected, (state) => {
                state.favoriteIds = [];
            });
        builder
            .addCase(addToFavorites.pending, (state, action) => {
                const movieId = action.meta.arg.movieId;
                state.favoritesLoading.push(movieId);
            })
            .addCase(addToFavorites.fulfilled, (state, action) => {
                const movieId = action.payload.movieId;
                state.favoritesLoading = state.favoritesLoading.filter(id => id !== movieId);
                if (!state.favoriteIds.includes(movieId)) {
                    state.favoriteIds.push(movieId);
                }
            })
            .addCase(addToFavorites.rejected, (state, action) => {
                const movieId = action.meta.arg.movieId;
                state.favoritesLoading = state.favoritesLoading.filter(id => id !== movieId);
            });
        builder
            .addCase(removeFromFavorites.pending, (state, action) => {
                const movieId = action.meta.arg.movieId;
                state.favoritesLoading.push(movieId);
            })
            .addCase(removeFromFavorites.fulfilled, (state, action) => {
                const movieId = action.payload.movieId;
                state.favoritesLoading = state.favoritesLoading.filter(id => id !== movieId);
                state.favoriteIds = state.favoriteIds.filter(id => id !== movieId);
            })
            .addCase(removeFromFavorites.rejected, (state, action) => {
                const movieId = action.meta.arg.movieId;
                state.favoritesLoading = state.favoritesLoading.filter(id => id !== movieId);
            });
        builder
            .addCase(deleteMovie.rejected, (_state, action) => {
                console.warn('Ошибка при удалении фильма, список не обновлен:', action.payload);
            });
    },
});

export const {
    setSearchText,
    setCurrentSearchText,
    setCurrentPage,
    setSort,
    clearSort,
    clearSearch,
    setFavoritesPage,
    setFavoritesSort,
    clearFavoritesSort
} = moviesSlice.actions;

export default moviesSlice.reducer;