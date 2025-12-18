import { useEffect, useMemo, type ReactElement, useCallback } from 'react';
import {
    Table, Pagination, Spinner, Alert, Badge, Container,
    Button
} from 'react-bootstrap';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

import { useSelector, useDispatch } from 'react-redux';
import {
    fetchFavoriteMovies,
    removeFromFavorites,
    setFavoritesPage,
    setFavoritesSort,
    clearFavoritesSort,
    type SortField,
    type SortDirection
} from '../redux/moviesSlice';
import type { RootState, AppDispatch } from '../redux/store';

const ITEMS_PER_PAGE: number = 10;

interface FavoritesProps {
    onLogout: () => void;
}

interface RemoveFavoriteButtonProps {
    movieId: string;
    movieTitle: string;
    isLoading: boolean;
    onRemove: (movieId: string, movieTitle: string) => void;
}

const RemoveFavoriteButton: React.FC<RemoveFavoriteButtonProps> = ({
                                                                       movieId,
                                                                       movieTitle,
                                                                       isLoading,
                                                                       onRemove
                                                                   }) => {
    return (
        <Button
            variant="danger"
            size="sm"
            onClick={() => onRemove(movieId, movieTitle)}
            disabled={isLoading}
            className="d-flex align-items-center gap-1"
            title={`Удалить "${movieTitle}" из избранного`}
        >
            {isLoading ? (
                <>
                    <span className="spinner-border spinner-border-sm text-white" role="status" />
                    Удаление...
                </>
            ) : (
                <>
                    ❌ Удалить
                </>
            )}
        </Button>
    );
};


const Favorites: React.FC<FavoritesProps> = ({ onLogout }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const username = localStorage.getItem('username') || 'Пользователь';
    const userId = localStorage.getItem('userId');

    const dispatch = useDispatch<AppDispatch>();

    const {
        favoriteMovies,
        loading,
        error,
        favoritesTotalCount: totalCount,
        favoritesCurrentPage: currentPage,
        favoritesSortField: sortField,
        favoritesSortDirection: sortDirection,
        favoritesLoading,
    } = useSelector((state: RootState) => state.movies);
    const favoritesLoadingSet = useMemo(() => new Set(favoritesLoading), [favoritesLoading]);
    const currentFetchArgs = useMemo(() => ({
        userId: userId!,
        currentPage,
        sortField: sortField as SortField,
        sortDirection: sortDirection as SortDirection,
    }), [userId, currentPage, sortField, sortDirection]);
    useEffect(() => {
        if (userId) {
            dispatch(fetchFavoriteMovies(currentFetchArgs));
        }
    }, [dispatch, currentFetchArgs, userId]);
    const handleRemoveFromFavoritesMemo = useCallback((movieId: string, movieTitle: string) => {
        if (!userId) {
            alert('Пользователь не авторизован');
            return;
        }
        dispatch(removeFromFavorites({
            movieId,
            movieTitle,
            userId,
            shouldRefreshList: true,
            fetchFavoritesArgs: currentFetchArgs
        }));
    }, [dispatch, userId, currentFetchArgs]);
    const totalPages: number = Math.ceil(totalCount / ITEMS_PER_PAGE);
    const handleSort = (field: SortField) => {
        if (sortField === field) {
            const newDirection: SortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
            dispatch(setFavoritesSort({ field, direction: newDirection }));
        } else {
            dispatch(setFavoritesSort({ field, direction: 'asc' }));
        }
    };

    const handleClearSort = () => {
        dispatch(clearFavoritesSort());
    };
    const paginationItems = useMemo(() => {
        const items: ReactElement[] = [];

        let startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, startPage + 4);

        if (endPage === totalPages) {
            startPage = Math.max(1, endPage - 4);
        }

        for (let number: number = startPage; number <= endPage; number++) {
            items.push(
                <Pagination.Item
                    key={number}
                    active={number === currentPage}
                    onClick={() => dispatch(setFavoritesPage(number))}
                >
                    {number}
                </Pagination.Item>,
            );
        }
        return items;
    }, [totalPages, currentPage, dispatch]);

    const handlePrevious = (): void => {
        dispatch(setFavoritesPage(Math.max(1, currentPage - 1)));
    };

    const handleNext = (): void => {
        dispatch(setFavoritesPage(Math.min(totalPages, currentPage + 1)));
    };
    const formatDuration = (minutes: number): string => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}ч ${mins}м`;
    };

    const formatRating = (rating: number): string => {
        return rating.toFixed(1);
    };

    const getSortIcon = (field: SortField): string => {
        if (sortField !== field) return '↕️';
        return sortDirection === 'asc' ? '⬆️' : '⬇️';
    };

    const getSortFieldName = (field: SortField): string => {
        switch (field) {
            case 'title': return 'Названию';
            case 'release_year': return 'Году';
            case 'duration_minutes': return 'Продолжительности';
            case 'rating': return 'Рейтингу';
            case 'created_at': return 'Дате добавления';
            case 'updated_at': return 'Дате обновления';
            default: return 'Дате добавления';
        }
    };
    if (!userId) {
        return (
            <>
                <Navbar username={username} onLogout={onLogout} currentPath={location.pathname} />
                <Container className="mt-5 text-center">
                    <Alert variant="warning">
                        <h4>Требуется авторизация</h4>
                        <p>Для просмотра избранных фильмов необходимо войти в систему</p>
                        <Button variant="primary" onClick={() => navigate('/login')} className="mt-2">
                            Войти
                        </Button>
                    </Alert>
                </Container>
            </>
        );
    }

    return (
        <>
            <Navbar username={username} onLogout={onLogout} currentPath={location.pathname} />

            <Container fluid className="p-3 p-md-5">
                                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h1 className="mb-0">⭐ Избранные фильмы</h1>
                        <small className="text-muted">
                            Вы вошли как: <strong>{username}</strong> •
                            Всего избранных: <strong>{totalCount}</strong>
                        </small>
                    </div>
                    <div className="d-flex gap-2">
                        <Link to="/" className="btn btn-outline-primary">
                            ← Назад к списку фильмов
                        </Link>
                    </div>
                </div>

                                <div className="row mb-4">
                    <div className="col-md-12">
                        <div className="d-flex justify-content-between align-items-center">
                            <div className="text-muted">
                                Найдено избранных фильмов: <strong>{totalCount}</strong>
                            </div>
                            <div className="d-flex gap-2">
                                <Button
                                    variant={sortField === 'created_at' && sortDirection === 'desc' ? 'primary' : 'outline-primary'}
                                    size="sm"
                                    onClick={() => dispatch(setFavoritesSort({ field: 'created_at', direction: 'desc' }))}
                                    disabled={loading}
                                >
                                    {sortField === 'created_at' && sortDirection === 'desc' ? '🆕 Новые сначала' : 'Сначала новые'}
                                </Button>
                                <Button
                                    variant={sortField === 'title' && sortDirection === 'asc' ? 'primary' : 'outline-primary'}
                                    size="sm"
                                    onClick={() => dispatch(setFavoritesSort({ field: 'title', direction: 'asc' }))}
                                    disabled={loading}
                                >
                                    {sortField === 'title' && sortDirection === 'asc' ? '🔤 А-Я' : 'По названию'}
                                </Button>
                                <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    onClick={handleClearSort}
                                    disabled={loading}
                                >
                                    Сбросить
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                                {loading && (
                    <div className="text-center my-5">
                        <Spinner animation="border" variant="primary" />
                        <p className="mt-2">Загрузка избранных фильмов...</p>
                    </div>
                )}

                                {error && !loading && (
                    <Alert variant="danger" className="my-4">
                        <Alert.Heading>Ошибка загрузки данных</Alert.Heading>
                        <p>{error}</p>
                        <button className="btn btn-outline-danger" onClick={() => dispatch(fetchFavoriteMovies(currentFetchArgs))}>
                            Повторить попытку
                        </button>
                    </Alert>
                )}

                                {!loading && totalCount > 0 && (
                    <div className="alert alert-info d-flex justify-content-between align-items-center">
                        <span>
                            Сортировка по: <strong>{getSortFieldName(sortField as SortField)}</strong>
                            ({sortDirection === 'asc' ? 'по возрастанию' : 'по убыванию'})
                            {sortField === 'created_at' && sortDirection === 'desc' && ' (новые сначала)'}
                        </span>
                        <button className="btn btn-sm btn-outline-secondary" onClick={handleClearSort}>
                            Сбросить
                        </button>
                    </div>
                )}

                                {!loading && !error && favoriteMovies.length === 0 && (
                    <div className="alert alert-warning text-center">
                        У вас пока нет избранных фильмов. Добавьте фильмы в избранное со страницы со списком фильмов!
                        <div className="mt-3">
                            <Link to="/" className="btn btn-primary">
                                Перейти к списку фильмов
                            </Link>
                        </div>
                    </div>
                )}

                                {!loading && !error && favoriteMovies.length > 0 && (
                    <>
                        <div className="table-responsive">
                            <Table striped bordered hover className="shadow-sm w-100">
                                <thead>
                                <tr>
                                    <th
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => handleSort('title')}
                                        className="user-select-none"
                                    >
                                        Название {getSortIcon('title')}
                                    </th>
                                    <th
                                        style={{ cursor: 'pointer', width: '100px' }}
                                        onClick={() => handleSort('release_year')}
                                        className="user-select-none"
                                    >
                                        Год {getSortIcon('release_year')}
                                    </th>
                                    <th
                                        style={{ cursor: 'pointer', width: '150px' }}
                                        onClick={() => handleSort('duration_minutes')}
                                        className="user-select-none"
                                    >
                                        Длительность {getSortIcon('duration_minutes')}
                                    </th>
                                    <th
                                        style={{ cursor: 'pointer', width: '100px' }}
                                        onClick={() => handleSort('rating')}
                                        className="user-select-none"
                                    >
                                        Рейтинг {getSortIcon('rating')}
                                    </th>
                                    <th className="text-center" style={{ width: '300px' }}>Действия</th>
                                </tr>
                                </thead>
                                <tbody>
                                {favoriteMovies.map((movie) => (
                                    <tr key={movie.id}>
                                        <td>
                                            <div className="d-flex align-items-center">
                                                <span className="me-2 text-warning">⭐</span>
                                                <strong>{movie.title}</strong>
                                                {movie.subtitles && (
                                                    <Badge bg="info" className="ms-2" title="Есть субтитры">
                                                        SRT
                                                    </Badge>
                                                )}
                                            </div>
                                        </td>
                                        <td>{movie.release_year}</td>
                                        <td>{formatDuration(movie.duration_minutes)}</td>
                                        <td>
                                            <span className="badge bg-warning text-dark">
                                                {formatRating(movie.rating)}
                                            </span>
                                        </td>
                                        <td className="text-center">
                                            <div className="d-flex justify-content-center gap-2">
                                                <Link
                                                    to={`/edit/${movie.id}`}
                                                    className="btn btn-sm btn-outline-info"
                                                    title="Редактировать"
                                                >
                                                    ✏️ Редактировать
                                                </Link>
                                                <RemoveFavoriteButton
                                                    movieId={movie.id}
                                                    movieTitle={movie.title}
                                                    isLoading={favoritesLoadingSet.has(String(movie.id))}
                                                    onRemove={handleRemoveFromFavoritesMemo}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </Table>
                        </div>

                                                {totalPages > 1 && (
                            <div className="d-flex justify-content-between align-items-center mt-4">
                                <div className="text-muted">
                                    Показано {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, totalCount)}-
                                    {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} из {totalCount} избранных фильмов
                                </div>
                                <Pagination size="lg">
                                    <Pagination.Prev
                                        onClick={handlePrevious}
                                        disabled={currentPage === 1 || loading}
                                    />
                                    {paginationItems}
                                    <Pagination.Next
                                        onClick={handleNext}
                                        disabled={currentPage === totalPages || loading}
                                    />
                                </Pagination>
                            </div>
                        )}
                    </>
                )}

                                {!loading && favoriteMovies.length > 0 && (
                    <div className="alert alert-light mt-4">
                        <small className="text-muted d-flex align-items-center">
                            <span>
                                ❌ — удалить из избранного • ✏️ — редактировать информацию о фильме
                            </span>
                        </small>
                    </div>
                )}
            </Container>

                        <style>{`
        .toast {
          z-index: 9999;
          min-width: 300px;
        }
        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .text-warning {
          color: #ffc107 !important;
        }
        .btn-sm {
          transition: all 0.2s;
        }
        .btn-sm:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
      `}</style>
        </>
    );
};

export default Favorites;