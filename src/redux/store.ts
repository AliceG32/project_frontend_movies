import { configureStore } from '@reduxjs/toolkit';
import moviesReducer from './moviesSlice';
import commentsReducer from './commentsSlice';
import authReducer from './authSlice';
import movieDetailReducer from './movieDetailSlice';
import addMovieReducer from './addMovieSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        movies: moviesReducer,
        comments: commentsReducer,
        movieDetail: movieDetailReducer,
        addMovie: addMovieReducer,
    },
});
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;