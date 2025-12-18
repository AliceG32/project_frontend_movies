import { configureStore } from '@reduxjs/toolkit';
import moviesReducer, {
    initialState,
    setSearchText,
    setCurrentSearchText,
    setCurrentPage,
    setSort,
    clearSort,
    clearSearch,
    setFavoritesPage,
    setFavoritesSort,
    clearFavoritesSort,
    fetchFavoriteMovies,
    fetchFavoriteIds,
    addToFavorites,
    removeFromFavorites,
    getSupabaseFieldName,
    type SortField,
    type SortDirection
} from './moviesSlice';
jest.mock('../utils/notifications', () => ({
    showSuccessToast: jest.fn(),
    showErrorToast: jest.fn()
}));
jest.mock('../config/supabase', () => ({
    supabase: {
        from: jest.fn(() => ({
            select: jest.fn(() => ({
                eq: jest.fn(() => ({
                    order: jest.fn(() => ({
                        maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
                        range: jest.fn(() => Promise.resolve({ data: [], error: null, count: 0 }))
                    }))
                })),
                in: jest.fn(() => ({
                    order: jest.fn(() => Promise.resolve({ data: [], error: null }))
                }))
            })),
            delete: jest.fn(() => ({
                eq: jest.fn(() => Promise.resolve({ error: null }))
            })),
            insert: jest.fn(() => Promise.resolve({ error: null }))
        })),
        rpc: jest.fn(() => Promise.resolve({ data: [], error: null }))
    }
}));

describe('moviesSlice', () => {
    describe('reducers', () => {
        describe('MovieList reducers', () => {
            it('should handle setSearchText', () => {
                const action = setSearchText('test search');
                const state = moviesReducer(initialState, action);

                expect(state.searchText).toBe('test search');
                expect(state.currentSearchText).toBe('');
            });

            it('should handle setCurrentSearchText and reset page', () => {
                const stateWithPage = {
                    ...initialState,
                    currentPage: 3,
                    movies: [{ id: '1', title: 'Test' } as any]
                };
                const action = setCurrentSearchText('new search');
                const state = moviesReducer(stateWithPage, action);

                expect(state.currentSearchText).toBe('new search');
                expect(state.currentPage).toBe(1);
            });

            it('should handle setCurrentPage', () => {
                const action = setCurrentPage(5);
                const state = moviesReducer(initialState, action);

                expect(state.currentPage).toBe(5);
            });

            it('should handle setSort and reset page', () => {
                const stateWithPage = {
                    ...initialState,
                    currentPage: 3,
                    sortField: 'title' as SortField,
                    sortDirection: 'desc' as SortDirection
                };
                const action = setSort({ field: 'rating', direction: 'asc' });
                const state = moviesReducer(stateWithPage, action);

                expect(state.sortField).toBe('rating');
                expect(state.sortDirection).toBe('asc');
                expect(state.currentPage).toBe(1);
            });

            it('should handle clearSort', () => {
                const customState = {
                    ...initialState,
                    sortField: 'title' as SortField,
                    sortDirection: 'asc' as SortDirection,
                    currentPage: 5
                };

                const state = moviesReducer(customState, clearSort());

                expect(state.sortField).toBe('updated_at');
                expect(state.sortDirection).toBe('desc');
                expect(state.currentPage).toBe(1);
            });

            it('should handle clearSearch', () => {
                const customState = {
                    ...initialState,
                    searchText: 'test',
                    currentSearchText: 'test',
                    currentPage: 3,
                    movies: [{ id: '1', title: 'Test' } as any],
                    totalCount: 10
                };

                const state = moviesReducer(customState, clearSearch());

                expect(state.searchText).toBe('');
                expect(state.currentSearchText).toBe('');
                expect(state.currentPage).toBe(1);
            });
        });

        describe('Favorites reducers', () => {
            it('should handle setFavoritesPage', () => {
                const action = setFavoritesPage(3);
                const state = moviesReducer(initialState, action);

                expect(state.favoritesCurrentPage).toBe(3);
            });

            it('should handle setFavoritesSort and reset page', () => {
                const customState = {
                    ...initialState,
                    favoritesCurrentPage: 5,
                    favoritesSortField: 'title' as SortField,
                    favoritesSortDirection: 'desc' as SortDirection
                };

                const action = setFavoritesSort({
                    field: 'rating',
                    direction: 'asc'
                });

                const state = moviesReducer(customState, action);

                expect(state.favoritesSortField).toBe('rating');
                expect(state.favoritesSortDirection).toBe('asc');
                expect(state.favoritesCurrentPage).toBe(1);
            });

            it('should handle clearFavoritesSort', () => {
                const customState = {
                    ...initialState,
                    favoritesSortField: 'title' as SortField,
                    favoritesSortDirection: 'asc' as SortDirection,
                    favoritesCurrentPage: 5
                };

                const state = moviesReducer(customState, clearFavoritesSort());

                expect(state.favoritesSortField).toBe('created_at');
                expect(state.favoritesSortDirection).toBe('desc');
                expect(state.favoritesCurrentPage).toBe(1);
            });
        });
    });

    describe('extraReducers', () => {
        describe('fetchFavoriteMovies', () => {
            it('should handle pending state', () => {
                const action = { type: fetchFavoriteMovies.pending.type };
                const state = moviesReducer(initialState, action);

                expect(state.loading).toBe(true);
                expect(state.error).toBeNull();
            });

            it('should handle fulfilled state', () => {
                const mockMovies = [
                    {
                        id: '1',
                        title: 'Movie 1',
                        release_year: 2020,
                        duration_minutes: 120,
                        description: 'Description 1',
                        rating: 8.5,
                        subtitles: true,
                        created_at: '2023-01-01',
                        updated_at: '2023-01-01'
                    },
                    {
                        id: '2',
                        title: 'Movie 2',
                        release_year: 2021,
                        duration_minutes: 90,
                        description: 'Description 2',
                        rating: 7.2,
                        subtitles: false,
                        created_at: '2023-02-01',
                        updated_at: '2023-02-01'
                    }
                ];

                const action = {
                    type: fetchFavoriteMovies.fulfilled.type,
                    payload: { movies: mockMovies, totalCount: 2 }
                };

                const state = moviesReducer(initialState, action);

                expect(state.loading).toBe(false);
                expect(state.favoriteMovies).toEqual(mockMovies);
                expect(state.favoritesTotalCount).toBe(2);
                expect(state.error).toBeNull();
            });

            it('should handle rejected state', () => {
                const errorMessage = 'Failed to load favorite movies';
                const action = {
                    type: fetchFavoriteMovies.rejected.type,
                    payload: errorMessage
                };

                const state = moviesReducer(initialState, action);

                expect(state.loading).toBe(false);
                expect(state.error).toBe(errorMessage);
                expect(state.favoriteMovies).toEqual([]);
                expect(state.favoritesTotalCount).toBe(0);
            });
        });

        describe('fetchFavoriteIds', () => {
            it('should handle fulfilled state', () => {
                const action = {
                    type: fetchFavoriteIds.fulfilled.type,
                    payload: ['1', '2', '3']
                };

                const state = moviesReducer(initialState, action);

                expect(state.favoriteIds).toEqual(['1', '2', '3']);
            });

            it('should handle rejected state by clearing favorites', () => {
                const customState = {
                    ...initialState,
                    favoriteIds: ['1', '2', '3']
                };

                const action = { type: fetchFavoriteIds.rejected.type };
                const state = moviesReducer(customState, action);

                expect(state.favoriteIds).toEqual([]);
            });
        });

        describe('addToFavorites', () => {
            it('should handle pending state - add to loading array', () => {
                const action = {
                    type: addToFavorites.pending.type,
                    meta: { arg: { movieId: '123' } }
                };

                const state = moviesReducer(initialState, action);

                expect(state.favoritesLoading).toContain('123');
            });

            it('should handle fulfilled state - remove from loading and add to favorites', () => {
                const customState = {
                    ...initialState,
                    favoritesLoading: ['123'],
                    favoriteIds: ['456']
                };

                const action = {
                    type: addToFavorites.fulfilled.type,
                    payload: { movieId: '123', movieTitle: 'Test Movie' }
                };

                const state = moviesReducer(customState, action);

                expect(state.favoritesLoading).not.toContain('123');
                expect(state.favoriteIds).toContain('123');
                expect(state.favoriteIds).toContain('456');
            });

            it('should handle fulfilled state - prevent duplicate favorites', () => {
                const customState = {
                    ...initialState,
                    favoritesLoading: ['123'],
                    favoriteIds: ['123', '456'] 
                };

                const action = {
                    type: addToFavorites.fulfilled.type,
                    payload: { movieId: '123', movieTitle: 'Test Movie' }
                };

                const state = moviesReducer(customState, action);

                expect(state.favoritesLoading).not.toContain('123');
                expect(state.favoriteIds).toContain('123');
                expect(state.favoriteIds).toHaveLength(2); 
            });

            it('should handle rejected state - remove from loading', () => {
                const customState = {
                    ...initialState,
                    favoritesLoading: ['123']
                };

                const action = {
                    type: addToFavorites.rejected.type,
                    meta: { arg: { movieId: '123' } }
                };

                const state = moviesReducer(customState, action);

                expect(state.favoritesLoading).not.toContain('123');
            });
        });

        describe('removeFromFavorites', () => {
            it('should handle pending state - add to loading array', () => {
                const action = {
                    type: removeFromFavorites.pending.type,
                    meta: { arg: { movieId: '123' } }
                };

                const state = moviesReducer(initialState, action);

                expect(state.favoritesLoading).toContain('123');
            });

            it('should handle fulfilled state - remove from loading and favorites', () => {
                const customState = {
                    ...initialState,
                    favoritesLoading: ['123'],
                    favoriteIds: ['123', '456']
                };

                const action = {
                    type: removeFromFavorites.fulfilled.type,
                    payload: { movieId: '123', movieTitle: 'Test Movie' }
                };

                const state = moviesReducer(customState, action);

                expect(state.favoritesLoading).not.toContain('123');
                expect(state.favoriteIds).not.toContain('123');
                expect(state.favoriteIds).toContain('456');
            });

            it('should handle rejected state - remove from loading', () => {
                const customState = {
                    ...initialState,
                    favoritesLoading: ['123']
                };

                const action = {
                    type: removeFromFavorites.rejected.type,
                    meta: { arg: { movieId: '123' } }
                };

                const state = moviesReducer(customState, action);

                expect(state.favoritesLoading).not.toContain('123');
            });
        });

        describe('deleteMovie', () => {
            it('should handle rejected state - log warning', () => {
                const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
                const errorMessage = 'Failed to delete movie';

                const action = {
                    type: 'movies/deleteMovie/rejected',
                    payload: errorMessage
                };

                moviesReducer(initialState, action);

                expect(consoleWarnSpy).toHaveBeenCalledWith(
                    'Ошибка при удалении фильма, список не обновлен:',
                    errorMessage
                );

                consoleWarnSpy.mockRestore();
            });
        });
    });

    describe('utility functions', () => {
        it('getSupabaseFieldName should map fields correctly', () => {
            expect(getSupabaseFieldName('title')).toBe('title');
            expect(getSupabaseFieldName('release_year')).toBe('release_year');
            expect(getSupabaseFieldName('duration_minutes')).toBe('duration_minutes');
            expect(getSupabaseFieldName('rating')).toBe('rating');
            expect(getSupabaseFieldName('created_at')).toBe('created_at');
            expect(getSupabaseFieldName('updated_at')).toBe('updated_at');
        });

        it('should return default field for unknown input', () => {
            expect(getSupabaseFieldName('unknown_field' as SortField)).toBe('updated_at');
        });
    });

    describe('async thunks integration', () => {
        let store: any;

        beforeEach(() => {
            store = configureStore({
                reducer: {
                    movies: moviesReducer
                },
                middleware: (getDefaultMiddleware) =>
                    getDefaultMiddleware({
                        serializableCheck: false,
                    }),
            });
        });

        it('should dispatch fetchFavoriteMovies and update state', async () => {
            const { supabase } = require('../config/supabase');
            const mockFavorites = [
                { movie_id: '1', user_id: 'user-123', created_at: '2023-01-01' },
                { movie_id: '2', user_id: 'user-123', created_at: '2023-01-02' }
            ];

            const mockMovies = [
                {
                    id: '1',
                    title: 'Movie 1',
                    release_year: 2020,
                    duration_minutes: 120,
                    description: 'Description',
                    rating: 8.5,
                    subtitles: true,
                    created_at: '2023-01-01',
                    updated_at: '2023-01-01'
                }
            ];

            (supabase.from as jest.Mock).mockClear();
            const mockFavoritesQuery = {
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                order: jest.fn().mockResolvedValue({
                    data: mockFavorites,
                    error: null
                })
            };
            const mockMoviesQuery = {
                select: jest.fn().mockReturnThis(),
                in: jest.fn().mockReturnThis(),
                order: jest.fn().mockResolvedValue({
                    data: mockMovies,
                    error: null
                })
            };
            (supabase.from as jest.Mock)
                .mockReturnValueOnce(mockFavoritesQuery) 
                .mockReturnValueOnce(mockMoviesQuery); 

            const fetchArgs = {
                userId: 'user-123',
                currentPage: 1,
                sortField: 'created_at' as SortField,
                sortDirection: 'desc' as SortDirection
            };

            await store.dispatch(fetchFavoriteMovies(fetchArgs));

            const state = store.getState().movies;
            expect(state.loading).toBe(false);
            expect(state.favoritesTotalCount).toBe(mockFavorites.length); 
        });

        it('should dispatch addToFavorites and update favoriteIds', async () => {
            const { supabase } = require('../config/supabase');

            (supabase.from as jest.Mock).mockClear();
            const mockCheckQuery = {
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                maybeSingle: jest.fn().mockResolvedValue({ 
                    data: null,
                    error: null
                })
            };
            const mockInsertQuery = {
                insert: jest.fn().mockResolvedValue({ error: null })
            };
            (supabase.from as jest.Mock)
                .mockReturnValueOnce(mockCheckQuery) 
                .mockReturnValueOnce(mockInsertQuery); 

            const addArgs = {
                movieId: '123',
                movieTitle: 'Test Movie',
                userId: 'user-123'
            };

            await store.dispatch(addToFavorites(addArgs));

            const state = store.getState().movies;
            expect(state.favoriteIds).toContain('123');
            expect(state.favoritesLoading).not.toContain('123');
        });

        it('should dispatch fetchFavoriteIds and populate favoriteIds', async () => {
            const { supabase } = require('../config/supabase');

            const mockFavorites = [
                { movie_id: '1' },
                { movie_id: '2' },
                { movie_id: '3' }
            ];

            (supabase.from as jest.Mock).mockClear();
            const mockIdsQuery = {
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockResolvedValue({
                    data: mockFavorites,
                    error: null
                })
            };

            (supabase.from as jest.Mock).mockReturnValueOnce(mockIdsQuery);

            await store.dispatch(fetchFavoriteIds('user-123'));

            const state = store.getState().movies;
            expect(state.favoriteIds).toEqual(['1', '2', '3']);
        });
    });

    describe('edge cases', () => {
        it('should handle empty state correctly', () => {
            const emptyState = moviesReducer(undefined, { type: 'unknown' });
            expect(emptyState).toEqual(initialState);
        });

        it('should handle unknown action without errors', () => {
            const state = moviesReducer(initialState, { type: 'UNKNOWN_ACTION' });
            expect(state).toEqual(initialState);
        });

        it('should maintain immutability', () => {
            const originalState = { ...initialState };
            const action = setCurrentPage(2);
            const newState = moviesReducer(originalState, action);

            expect(newState).not.toBe(originalState);
            expect(originalState.currentPage).toBe(1);
            expect(newState.currentPage).toBe(2);
        });

        it('should handle pagination overflow correctly', () => {
            const stateWithLargePage = {
                ...initialState,
                currentPage: 100
            };

            const action = setCurrentPage(200);
            const state = moviesReducer(stateWithLargePage, action);

            expect(state.currentPage).toBe(200);
        });

        it('should handle favoriteIds with non-string values', () => {
            const action = {
                type: fetchFavoriteIds.fulfilled.type,
                payload: ['1', '2', '3'] 
            };

            const state = moviesReducer(initialState, action);
            expect(state.favoriteIds.every(id => typeof id === 'string')).toBe(true);
        });
    });
});