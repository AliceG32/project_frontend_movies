import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { supabase } from '../config/supabase';
import type { Database } from '../config/supabase';
import { showSuccessToast, showErrorToast } from '../utils/notifications';

type CommentRow = Database['public']['Tables']['comments']['Row'];

export type Comment = CommentRow & {
    user: { name: string };
};

export interface CommentsState {
    comments: Comment[];
    currentMovieTitle: string;
    loading: boolean; 
    submitting: boolean; 
    error: string | null;
    editingCommentId: string | null; 
}
export const fetchComments = createAsyncThunk<
    { comments: Comment[]; movieTitle: string },
    string, 
    { rejectValue: string }
>('comments/fetchComments', async (movieId, { rejectWithValue }) => {
    try {
        const { data: movieData, error: movieError } = await supabase
            .from('movies')
            .select('title')
            .eq('id', movieId)
            .single();

        if (movieError) {
            throw new Error('Фильм не найден или ошибка базы данных.');
        }

        const movieTitle = movieData?.title || 'Неизвестный фильм';
        const { data: commentsData, error: commentsError } = await supabase
            .from('comments')
            .select(`
                *,
                user:user_id (
                    name
                )
            `)
            .eq('movie_id', movieId)
            .order('created_at', { ascending: false });

        if (commentsError) {
            throw new Error(`Ошибка при загрузке комментариев: ${commentsError.message}`);
        }

        const enrichedComments: Comment[] = (commentsData || []).map((comment: any) => ({
            ...comment,
            user: { name: comment.user?.name || 'Аноним' }
        }));

        return { comments: enrichedComments, movieTitle };

    } catch (err) {
        return rejectWithValue(err instanceof Error ? err.message : 'Неизвестная ошибка загрузки комментариев');
    }
});
interface AddCommentArgs { movieId: string; userId: string; comment: string; }

export const addComment = createAsyncThunk<
    Comment, 
    AddCommentArgs,
    { rejectValue: string }
>('comments/addComment', async ({ movieId, userId, comment }, { rejectWithValue }) => {
    try {
        const { data, error } = await supabase
            .from('comments')
            .insert({ movie_id: movieId, user_id: userId, comment: comment })
            .select(`*, user:user_id (name)`)
            .single();

        if (error) throw new Error(`Ошибка при добавлении: ${error.message}`);

        const newComment: Comment = {
            ...data!,
            user: { name: (data as any).user?.name || 'Аноним' }
        };

        showSuccessToast('Успех', 'Комментарий успешно добавлен!');
        return newComment;

    } catch (err) {
        showErrorToast('Ошибка', 'Не удалось добавить комментарий.');
        return rejectWithValue(err instanceof Error ? err.message : 'Неизвестная ошибка');
    }
});
interface EditCommentArgs { commentId: string; newCommentText: string; }

export const editComment = createAsyncThunk<
    { id: string; newComment: string }, 
    EditCommentArgs,
    { rejectValue: string }
>('comments/editComment', async ({ commentId, newCommentText }, { rejectWithValue }) => {
    try {
        const { error } = await supabase
            .from('comments')
            .update({ comment: newCommentText, updated_at: new Date().toISOString() })
            .eq('id', commentId);

        if (error) throw new Error(`Ошибка при обновлении: ${error.message}`);

        showSuccessToast('Успех', 'Комментарий успешно обновлен!');
        return { id: commentId, newComment: newCommentText };

    } catch (err) {
        showErrorToast('Ошибка', 'Не удалось обновить комментарий.');
        return rejectWithValue(err instanceof Error ? err.message : 'Неизвестная ошибка');
    }
});
export const deleteComment = createAsyncThunk<
    string, 
    string, 
    { rejectValue: string }
>('comments/deleteComment', async (commentId, { rejectWithValue }) => {
    try {
        if (!window.confirm('Вы уверены, что хотите удалить этот комментарий?')) {
            return rejectWithValue('Отмена удаления');
        }

        const { error } = await supabase
            .from('comments')
            .delete()
            .eq('id', commentId);

        if (error) throw new Error(`Ошибка при удалении: ${error.message}`);

        showSuccessToast('Успех', 'Комментарий удален.');
        return commentId;

    } catch (err) {
        showErrorToast('Ошибка', 'Не удалось удалить комментарий.');
        return rejectWithValue(err instanceof Error ? err.message : 'Неизвестная ошибка');
    }
});

export const initialState: CommentsState = {
    comments: [],
    currentMovieTitle: '',
    loading: false,
    submitting: false,
    error: null,
    editingCommentId: null,
};

const commentsSlice = createSlice({
    name: 'comments',
    initialState,
    reducers: {
        setEditingCommentId: (state, action: PayloadAction<string | null>) => {
            state.editingCommentId = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchComments.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchComments.fulfilled, (state, action) => {
                state.loading = false;
                state.comments = action.payload.comments;
                state.currentMovieTitle = action.payload.movieTitle;
            })
            .addCase(fetchComments.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload || 'Ошибка загрузки';
                state.comments = [];
            })
        builder
            .addCase(addComment.pending, (state) => { state.submitting = true; })
            .addCase(addComment.fulfilled, (state, action: PayloadAction<Comment>) => {
                state.submitting = false;
                state.comments.unshift(action.payload);
            })
            .addCase(addComment.rejected, (state) => { state.submitting = false; })
        builder
            .addCase(editComment.pending, (state) => { state.submitting = true; })
            .addCase(editComment.fulfilled, (state, action: PayloadAction<{ id: string; newComment: string }>) => {
                state.submitting = false;
                state.editingCommentId = null;
                const index = state.comments.findIndex(c => c.id === action.payload.id);
                if (index !== -1) {
                    state.comments[index].comment = action.payload.newComment;
                    state.comments[index].updated_at = new Date().toISOString();
                }
            })
            .addCase(editComment.rejected, (state) => { state.submitting = false; })
        builder
            .addCase(deleteComment.pending, (state) => { state.submitting = true; })
            .addCase(deleteComment.fulfilled, (state, action: PayloadAction<string>) => {
                state.submitting = false;
                state.comments = state.comments.filter(c => c.id !== action.payload);
            })
            .addCase(deleteComment.rejected, (state, action) => {
                state.submitting = false;
                if (action.payload !== 'Отмена удаления') {
                    state.error = action.payload || 'Ошибка удаления';
                }
            });
    },
});

export const { setEditingCommentId } = commentsSlice.actions;
export default commentsSlice.reducer;