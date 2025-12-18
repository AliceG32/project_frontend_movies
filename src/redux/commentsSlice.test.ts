import { configureStore } from '@reduxjs/toolkit';
import commentsReducer, {
    fetchComments,
    addComment,
    editComment,
    deleteComment,
    setEditingCommentId
} from './commentsSlice';
jest.mock('../utils/notifications', () => ({
    showSuccessToast: jest.fn(),
    showErrorToast: jest.fn()
}));
global.confirm = jest.fn();
jest.mock('../config/supabase', () => {
    const mockFrom = jest.fn();
    return {
        supabase: {
            from: mockFrom
        }
    };
});
import { supabase } from '../config/supabase';
const initialState = {
    comments: [],
    currentMovieTitle: '',
    loading: false,
    submitting: false,
    error: null,
    editingCommentId: null,
};

describe('commentsSlice', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (global.confirm as jest.Mock).mockReset();
        (supabase.from as jest.Mock).mockClear();
    });

    describe('reducers', () => {
        it('должен обрабатывать setEditingCommentId', () => {
            const action = setEditingCommentId('123');
            const state = commentsReducer(initialState, action);

            expect(state.editingCommentId).toBe('123');
        });

        it('должен обрабатывать setEditingCommentId с null', () => {
            const customState = {
                ...initialState,
                editingCommentId: '123'
            };
            const action = setEditingCommentId(null);
            const state = commentsReducer(customState, action);

            expect(state.editingCommentId).toBeNull();
        });

        it('должен сохранять иммутабельность', () => {
            const originalState = { ...initialState };
            const action = setEditingCommentId('123');
            const newState = commentsReducer(originalState, action);

            expect(newState).not.toBe(originalState);
            expect(originalState.editingCommentId).toBeNull();
            expect(newState.editingCommentId).toBe('123');
        });
    });

    describe('extraReducers', () => {
        describe('fetchComments', () => {
            it('должен обрабатывать состояние pending', () => {
                const action = { type: fetchComments.pending.type };
                const state = commentsReducer(initialState, action);

                expect(state.loading).toBe(true);
                expect(state.error).toBeNull();
            });

            it('должен обрабатывать состояние fulfilled', () => {
                const mockComments = [
                    {
                        id: '1',
                        movie_id: 'movie-1',
                        user_id: 'user-1',
                        comment: 'Great movie!',
                        created_at: '2023-01-01',
                        updated_at: '2023-01-01',
                        user: { name: 'John Doe' }
                    },
                    {
                        id: '2',
                        movie_id: 'movie-1',
                        user_id: 'user-2',
                        comment: 'Awesome film',
                        created_at: '2023-01-02',
                        updated_at: '2023-01-02',
                        user: { name: 'Jane Smith' }
                    }
                ];

                const action = {
                    type: fetchComments.fulfilled.type,
                    payload: {
                        comments: mockComments,
                        movieTitle: 'Test Movie'
                    }
                };

                const state = commentsReducer(initialState, action);

                expect(state.loading).toBe(false);
                expect(state.comments).toEqual(mockComments);
                expect(state.currentMovieTitle).toBe('Test Movie');
                expect(state.error).toBeNull();
            });

            it('должен обрабатывать состояние rejected', () => {
                const errorMessage = 'Failed to load comments';
                const action = {
                    type: fetchComments.rejected.type,
                    payload: errorMessage
                };

                const state = commentsReducer(initialState, action);

                expect(state.loading).toBe(false);
                expect(state.error).toBe(errorMessage);
                expect(state.comments).toEqual([]);
                expect(state.currentMovieTitle).toBe('');
            });
        });

        describe('addComment', () => {
            it('должен обрабатывать состояние pending', () => {
                const action = { type: addComment.pending.type };
                const state = commentsReducer(initialState, action);

                expect(state.submitting).toBe(true);
            });

            it('должен обрабатывать состояние fulfilled — добавление комментария в начало', () => {
                const existingComments = [
                    {
                        id: '1',
                        movie_id: 'movie-1',
                        user_id: 'user-1',
                        comment: 'Old comment',
                        created_at: '2023-01-01',
                        updated_at: '2023-01-01',
                        user: { name: 'User 1' }
                    }
                ];

                const customState = {
                    ...initialState,
                    comments: existingComments
                };

                const newComment = {
                    id: '2',
                    movie_id: 'movie-1',
                    user_id: 'user-2',
                    comment: 'New comment',
                    created_at: '2023-01-02',
                    updated_at: '2023-01-02',
                    user: { name: 'User 2' }
                };

                const action = {
                    type: addComment.fulfilled.type,
                    payload: newComment
                };

                const state = commentsReducer(customState, action);

                expect(state.submitting).toBe(false);
                expect(state.comments).toHaveLength(2);
                expect(state.comments[0]).toEqual(newComment);
                expect(state.comments[1]).toEqual(existingComments[0]);
            });

            it('должен обрабатывать состояние rejected', () => {
                const customState = {
                    ...initialState,
                    submitting: true
                };

                const action = { type: addComment.rejected.type };
                const state = commentsReducer(customState, action);

                expect(state.submitting).toBe(false);
            });
        });

        describe('editComment', () => {
            it('должен обрабатывать состояние pending', () => {
                const action = { type: editComment.pending.type };
                const state = commentsReducer(initialState, action);

                expect(state.submitting).toBe(true);
            });

            it('должен обрабатывать состояние fulfilled — обновление текста комментария', () => {
                const existingComments = [
                    {
                        id: '1',
                        movie_id: 'movie-1',
                        user_id: 'user-1',
                        comment: 'Old text',
                        created_at: '2023-01-01',
                        updated_at: '2023-01-01',
                        user: { name: 'User 1' }
                    },
                    {
                        id: '2',
                        movie_id: 'movie-1',
                        user_id: 'user-2',
                        comment: 'Another comment',
                        created_at: '2023-01-02',
                        updated_at: '2023-01-02',
                        user: { name: 'User 2' }
                    }
                ];

                const customState = {
                    ...initialState,
                    comments: existingComments,
                    editingCommentId: '1'
                };

                const action = {
                    type: editComment.fulfilled.type,
                    payload: {
                        id: '1',
                        newComment: 'Updated text'
                    }
                };

                const state = commentsReducer(customState, action);

                expect(state.submitting).toBe(false);
                expect(state.editingCommentId).toBeNull();
                expect(state.comments[0].comment).toBe('Updated text');
                expect(state.comments[0].updated_at).toBeDefined();
                expect(state.comments[1]).toEqual(existingComments[1]);
            });

            it('должен обрабатывать состояние fulfilled — несуществующий комментарий', () => {
                const existingComments = [
                    {
                        id: '1',
                        movie_id: 'movie-1',
                        user_id: 'user-1',
                        comment: 'Some text',
                        created_at: '2023-01-01',
                        updated_at: '2023-01-01',
                        user: { name: 'User 1' }
                    }
                ];

                const customState = {
                    ...initialState,
                    comments: existingComments
                };

                const action = {
                    type: editComment.fulfilled.type,
                    payload: {
                        id: '999',
                        newComment: 'Updated text'
                    }
                };

                const state = commentsReducer(customState, action);

                expect(state.submitting).toBe(false);
                expect(state.editingCommentId).toBeNull();
                expect(state.comments).toEqual(existingComments);
            });

            it('должен обрабатывать состояние rejected', () => {
                const customState = {
                    ...initialState,
                    submitting: true,
                    editingCommentId: '1'
                };

                const action = { type: editComment.rejected.type };
                const state = commentsReducer(customState, action);

                expect(state.submitting).toBe(false);
                expect(state.editingCommentId).toBe('1');
            });
        });

        describe('deleteComment', () => {
            it('должен обрабатывать состояние pending', () => {
                const action = { type: deleteComment.pending.type };
                const state = commentsReducer(initialState, action);

                expect(state.submitting).toBe(true);
            });

            it('должен обрабатывать состояние fulfilled — удаление комментария', () => {
                const existingComments = [
                    {
                        id: '1',
                        movie_id: 'movie-1',
                        user_id: 'user-1',
                        comment: 'Comment 1',
                        created_at: '2023-01-01',
                        updated_at: '2023-01-01',
                        user: { name: 'User 1' }
                    },
                    {
                        id: '2',
                        movie_id: 'movie-1',
                        user_id: 'user-2',
                        comment: 'Comment 2',
                        created_at: '2023-01-02',
                        updated_at: '2023-01-02',
                        user: { name: 'User 2' }
                    }
                ];

                const customState = {
                    ...initialState,
                    comments: existingComments
                };

                const action = {
                    type: deleteComment.fulfilled.type,
                    payload: '1'
                };

                const state = commentsReducer(customState, action);

                expect(state.submitting).toBe(false);
                expect(state.comments).toHaveLength(1);
                expect(state.comments[0].id).toBe('2');
            });

            it('должен обрабатывать состояние rejected — отмена', () => {
                const customState = {
                    ...initialState,
                    submitting: true
                };

                const action = {
                    type: deleteComment.rejected.type,
                    payload: 'Отмена удаления'
                };

                const state = commentsReducer(customState, action);

                expect(state.submitting).toBe(false);
                expect(state.error).toBeNull();
            });

            it('должен обрабатывать состояние rejected — реальная ошибка', () => {
                const customState = {
                    ...initialState,
                    submitting: true
                };

                const errorMessage = 'Database error';
                const action = {
                    type: deleteComment.rejected.type,
                    payload: errorMessage
                };

                const state = commentsReducer(customState, action);

                expect(state.submitting).toBe(false);
                expect(state.error).toBe(errorMessage);
            });
        });
    });

    describe('async thunks integration', () => {
        let store: any;

        beforeEach(() => {
            store = configureStore({
                reducer: {
                    comments: commentsReducer
                },
                middleware: (getDefaultMiddleware) =>
                    getDefaultMiddleware({
                        serializableCheck: false,
                    }),
            });
        });

        describe('fetchComments', () => {
            it('должен диспатчить fetchComments и обновлять стейт', async () => {
                const mockMovie = {
                    title: 'Test Movie'
                };

                const mockComments = [
                    {
                        id: '1',
                        movie_id: 'movie-1',
                        user_id: 'user-1',
                        comment: 'Great!',
                        created_at: '2023-01-01',
                        updated_at: '2023-01-01',
                        user: { name: 'John' }
                    }
                ];
                (supabase.from as jest.Mock)
                    .mockReturnValueOnce({
                        select: () => ({
                            eq: () => ({
                                single: () => Promise.resolve({
                                    data: mockMovie,
                                    error: null
                                })
                            })
                        })
                    })
                    .mockReturnValueOnce({
                        select: () => ({
                            eq: () => ({
                                order: () => Promise.resolve({
                                    data: mockComments,
                                    error: null
                                })
                            })
                        })
                    });

                await store.dispatch(fetchComments('movie-1'));

                const state = store.getState().comments;
                expect(state.loading).toBe(false);
                expect(state.currentMovieTitle).toBe('Test Movie');
                expect(state.comments).toHaveLength(1);
            });

            it('должен обрабатывать ошибку fetchComments', async () => {
                (supabase.from as jest.Mock)
                    .mockReturnValueOnce({
                        select: () => ({
                            eq: () => ({
                                single: () => Promise.resolve({
                                    data: null,
                                    error: { message: 'Movie not found' }
                                })
                            })
                        })
                    });

                await store.dispatch(fetchComments('movie-1'));

                const state = store.getState().comments;
                expect(state.loading).toBe(false);
                expect(state.error).toBeDefined();
            });
        });

        describe('addComment', () => {
            it('должен диспатчить addComment и обновлять стейт', async () => {
                const newComment = {
                    id: '123',
                    movie_id: 'movie-1',
                    user_id: 'user-1',
                    comment: 'New comment',
                    created_at: '2023-01-01',
                    updated_at: '2023-01-01',
                    user: { name: 'Test User' }
                };

                (supabase.from as jest.Mock)
                    .mockReturnValueOnce({
                        insert: () => ({
                            select: () => ({
                                single: () => Promise.resolve({
                                    data: newComment,
                                    error: null
                                })
                            })
                        })
                    });

                await store.dispatch(addComment({
                    movieId: 'movie-1',
                    userId: 'user-1',
                    comment: 'New comment'
                }));

                const state = store.getState().comments;
                expect(state.submitting).toBe(false);
                expect(state.comments).toContainEqual(newComment);
            });

            it('должен обрабатывать ошибку addComment', async () => {
                (supabase.from as jest.Mock)
                    .mockReturnValueOnce({
                        insert: () => ({
                            select: () => ({
                                single: () => Promise.resolve({
                                    data: null,
                                    error: { message: 'Insert failed' }
                                })
                            })
                        })
                    });

                await store.dispatch(addComment({
                    movieId: 'movie-1',
                    userId: 'user-1',
                    comment: 'New comment'
                }));

                const state = store.getState().comments;
                expect(state.submitting).toBe(false);
                expect(state.comments).toHaveLength(0);
            });
        });

        describe('editComment', () => {
            it('должен диспатчить editComment и обновлять стейт', async () => {
                const existingComments = [{
                    id: '123',
                    movie_id: 'movie-1',
                    user_id: 'user-1',
                    comment: 'Old text',
                    created_at: '2023-01-01',
                    updated_at: '2023-01-01',
                    user: { name: 'User' }
                }];
                const preloadedState = {
                    comments: {
                        comments: existingComments,
                        currentMovieTitle: '',
                        loading: false,
                        submitting: false,
                        error: null,
                        editingCommentId: '123'
                    }
                };

                store = configureStore({
                    reducer: {
                        comments: commentsReducer
                    },
                    preloadedState,
                    middleware: (getDefaultMiddleware) =>
                        getDefaultMiddleware({
                            serializableCheck: false,
                        }),
                });

                (supabase.from as jest.Mock)
                    .mockReturnValueOnce({
                        update: () => ({
                            eq: () => Promise.resolve({
                                error: null
                            })
                        })
                    });

                await store.dispatch(editComment({
                    commentId: '123',
                    newCommentText: 'Updated text'
                }));

                const state = store.getState().comments;
                expect(state.submitting).toBe(false);
                expect(state.editingCommentId).toBeNull();
                expect(state.comments[0].comment).toBe('Updated text');
            });
        });

        describe('deleteComment', () => {
            it('должен диспатчить deleteComment с подтверждением и обновлять стейт', async () => {
                const existingComments = [
                    {
                        id: '123',
                        movie_id: 'movie-1',
                        user_id: 'user-1',
                        comment: 'To delete',
                        created_at: '2023-01-01',
                        updated_at: '2023-01-01',
                        user: { name: 'User' }
                    },
                    {
                        id: '456',
                        movie_id: 'movie-1',
                        user_id: 'user-2',
                        comment: 'Keep this',
                        created_at: '2023-01-02',
                        updated_at: '2023-01-02',
                        user: { name: 'User 2' }
                    }
                ];
                const preloadedState = {
                    comments: {
                        comments: existingComments,
                        currentMovieTitle: '',
                        loading: false,
                        submitting: false,
                        error: null,
                        editingCommentId: null
                    }
                };

                store = configureStore({
                    reducer: {
                        comments: commentsReducer
                    },
                    preloadedState,
                    middleware: (getDefaultMiddleware) =>
                        getDefaultMiddleware({
                            serializableCheck: false,
                        }),
                });

                (global.confirm as jest.Mock).mockReturnValue(true);

                (supabase.from as jest.Mock)
                    .mockReturnValueOnce({
                        delete: () => ({
                            eq: () => Promise.resolve({
                                error: null
                            })
                        })
                    });

                await store.dispatch(deleteComment('123'));

                const state = store.getState().comments;
                expect(state.submitting).toBe(false);
                expect(state.comments).toHaveLength(1);
                expect(state.comments[0].id).toBe('456');
            });

            it('должен обрабатывать отмену deleteComment', async () => {
                (global.confirm as jest.Mock).mockReturnValue(false);

                await store.dispatch(deleteComment('123'));

                const state = store.getState().comments;
                expect(state.submitting).toBe(false);
                expect(state.error).toBeNull();
            });
        });
    });

    describe('edge cases', () => {
        it('должен корректно обрабатывать пустой стейт', () => {
            const emptyState = commentsReducer(undefined, { type: 'unknown' });
            expect(emptyState).toEqual(initialState);
        });

        it('должен обрабатывать неизвестный экшен без ошибок', () => {
            const state = commentsReducer(initialState, { type: 'UNKNOWN_ACTION' });
            expect(state).toEqual(initialState);
        });

        it('должен обрабатывать пустой массив комментариев', () => {
            const action = {
                type: fetchComments.fulfilled.type,
                payload: {
                    comments: [],
                    movieTitle: 'Test Movie'
                }
            };

            const state = commentsReducer(initialState, action);

            expect(state.comments).toEqual([]);
            expect(state.currentMovieTitle).toBe('Test Movie');
        });

        it('должен корректно обрабатывать дубликаты ID комментариев', () => {
            const duplicateComments = [
                {
                    id: '1',
                    movie_id: 'movie-1',
                    user_id: 'user-1',
                    comment: 'Comment 1',
                    created_at: '2023-01-01',
                    updated_at: '2023-01-01',
                    user: { name: 'User' }
                },
                {
                    id: '1',
                    movie_id: 'movie-1',
                    user_id: 'user-2',
                    comment: 'Comment 2',
                    created_at: '2023-01-02',
                    updated_at: '2023-01-02',
                    user: { name: 'User 2' }
                }
            ];

            const action = {
                type: fetchComments.fulfilled.type,
                payload: {
                    comments: duplicateComments,
                    movieTitle: 'Test Movie'
                }
            };

            const state = commentsReducer(initialState, action);

            expect(state.comments).toHaveLength(2);
            expect(state.comments[0].id).toBe('1');
            expect(state.comments[1].id).toBe('1');
        });

        it('должен обрабатывать параллельные операции', () => {
            let state = commentsReducer(initialState, { type: fetchComments.pending.type });
            expect(state.loading).toBe(true);

            const mockComments = [
                {
                    id: '1',
                    movie_id: 'movie-1',
                    user_id: 'user-1',
                    comment: 'First',
                    created_at: '2023-01-01',
                    updated_at: '2023-01-01',
                    user: { name: 'User' }
                }
            ];

            state = commentsReducer(state, {
                type: fetchComments.fulfilled.type,
                payload: {
                    comments: mockComments,
                    movieTitle: 'Movie'
                }
            });
            expect(state.loading).toBe(false);
            expect(state.comments).toHaveLength(1);

            state = commentsReducer(state, { type: addComment.pending.type });
            expect(state.submitting).toBe(true);

            const newComment = {
                id: '2',
                movie_id: 'movie-1',
                user_id: 'user-2',
                comment: 'Second',
                created_at: '2023-01-02',
                updated_at: '2023-01-02',
                user: { name: 'User 2' }
            };

            state = commentsReducer(state, {
                type: addComment.fulfilled.type,
                payload: newComment
            });
            expect(state.submitting).toBe(false);
            expect(state.comments).toHaveLength(2);
        });

        it('должен корректно обрабатывать переполнение пагинации', () => {
            const stateWithManyComments = {
                ...initialState,
                comments: Array.from({ length: 100 }, (_, i) => ({
                    id: `${i + 1}`,
                    movie_id: 'movie-1',
                    user_id: `user-${i + 1}`,
                    comment: `Comment ${i + 1}`,
                    created_at: '2023-01-01',
                    updated_at: '2023-01-01',
                    user: { name: `User ${i + 1}` }
                }))
            };
            const action = {
                type: deleteComment.fulfilled.type,
                payload: '50'
            };

            const state = commentsReducer(stateWithManyComments, action);

            expect(state.comments).toHaveLength(99);
            expect(state.comments.find(c => c.id === '50')).toBeUndefined();
        });

        it('должен обрабатывать null/undefined значения в стейте', () => {
            const stateWithNulls = {
                ...initialState,
                error: null,
                editingCommentId: null
            };

            const action = { type: 'unknown' };
            const state = commentsReducer(stateWithNulls, action);

            expect(state.error).toBeNull();
            expect(state.editingCommentId).toBeNull();
        });

        it('должен соблюдать порядок сортировки (новые комментарии первыми)', () => {
            const comments = [
                {
                    id: '1',
                    movie_id: 'movie-1',
                    user_id: 'user-1',
                    comment: 'Old comment',
                    created_at: '2023-01-01',
                    updated_at: '2023-01-01',
                    user: { name: 'User 1' }
                },
                {
                    id: '2',
                    movie_id: 'movie-1',
                    user_id: 'user-2',
                    comment: 'New comment',
                    created_at: '2023-01-02',
                    updated_at: '2023-01-02',
                    user: { name: 'User 2' }
                }
            ];
            const fetchAction = {
                type: fetchComments.fulfilled.type,
                payload: {
                    comments: comments,
                    movieTitle: 'Test Movie'
                }
            };

            let state = commentsReducer(initialState, fetchAction);
            expect(state.comments[0].id).toBe('1');
            const newComment = {
                id: '3',
                movie_id: 'movie-1',
                user_id: 'user-3',
                comment: 'Latest comment',
                created_at: '2023-01-03',
                updated_at: '2023-01-03',
                user: { name: 'User 3' }
            };

            const addAction = {
                type: addComment.fulfilled.type,
                payload: newComment
            };

            state = commentsReducer(state, addAction);
            expect(state.comments[0].id).toBe('3');
            expect(state.comments).toHaveLength(3);
        });

        it('должен очищать состояние ошибки', () => {
            const stateWithError = {
                ...initialState,
                error: 'Previous error'
            };

            const pendingAction = { type: fetchComments.pending.type };
            const state = commentsReducer(stateWithError, pendingAction);

            expect(state.error).toBeNull();
            expect(state.loading).toBe(true);
        });
    });
});