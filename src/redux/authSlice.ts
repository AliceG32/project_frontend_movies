import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '../config/supabase';
import { showErrorToast } from '../utils/notifications';

interface AuthState {
    isAuthenticated: boolean;
    userId: string | null;
    username: string | null;
    loading: boolean;
    error: string | null;
}
const initialState: AuthState = {
    isAuthenticated: localStorage.getItem('isAuthenticated') === 'true',
    userId: localStorage.getItem('userId'),
    username: localStorage.getItem('username'),
    loading: false,
    error: null,
};
export const loginUser = createAsyncThunk<
    { userId: string; username: string }, 
    { username: string; password: string }, 
    { rejectValue: string } 
>('auth/loginUser', async ({ username, password }, { rejectWithValue }) => {
    try {
        const { data, error: supabaseError } = await supabase
            .rpc('authenticate_user', {
                username_param: username,
                password_param: password
            });

        if (supabaseError) {
            console.error('Supabase RPC error:', supabaseError);
            throw new Error(`Ошибка сервера: ${supabaseError.message}`);
        }

        if (!data || data.length === 0) {
            throw new Error('Неверное имя пользователя или пароль');
        }
        const user = data[0];
        const userId = String(user.id); 
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('userId', userId);
        localStorage.setItem('username', user.name);

        return { userId, username: user.name };

    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка входа';
        showErrorToast('Ошибка входа', errorMessage);
        return rejectWithValue(errorMessage);
    }
});

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        logout: (state) => {
            localStorage.removeItem('isAuthenticated');
            localStorage.removeItem('userId');
            localStorage.removeItem('username');
            state.isAuthenticated = false;
            state.userId = null;
            state.username = null;
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(loginUser.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(loginUser.fulfilled, (state, action) => {
                state.loading = false;
                state.isAuthenticated = true;
                state.userId = action.payload.userId;
                state.username = action.payload.username;
                state.error = null;
            })
            .addCase(loginUser.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload || 'Ошибка аутентификации';
                state.isAuthenticated = false;
                state.userId = null;
                state.username = null;
            });
    },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;