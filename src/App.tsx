import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import MovieList from './pages/MovieList';
import EditMovie from './pages/EditMovie';
import AddMovie from './pages/AddMovie';
import Favorites from './pages/Favorites';
import CommentsPage from './pages/CommentsPage';
import './App.css';

import { useSelector, useDispatch } from 'react-redux';
import { logout } from './redux/authSlice';
import type { RootState, AppDispatch } from './redux/store';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
};

const App: React.FC = () => {
    const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
    const dispatch = useDispatch<AppDispatch>();
    const handleLogout = () => {
        dispatch(logout());
        window.location.href = '/login';
    };

    useEffect(() => {
    }, []);


    return (
        <Routes>
            <Route path="/login" element={
                isAuthenticated ? (
                    <Navigate to="/" replace />
                ) : (
                    <Login />
                )
            } />

                        <Route path="/" element={
                <ProtectedRoute>
                    <MovieList onLogout={handleLogout} />
                </ProtectedRoute>
            } />

            <Route path="/favorites" element={
                <ProtectedRoute>
                    <Favorites onLogout={handleLogout} />
                </ProtectedRoute>
            } />

            <Route path="/edit/:id" element={
                <ProtectedRoute>
                    <EditMovie onLogout={handleLogout} />
                </ProtectedRoute>
            } />

            <Route path="/add" element={
                <ProtectedRoute>
                    <AddMovie onLogout={handleLogout} />
                </ProtectedRoute>
            } />

            <Route path="/comments/:movieId" element={
                <ProtectedRoute>
                    <CommentsPage onLogout={handleLogout} />
                </ProtectedRoute>
            } />

                        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

export default App;