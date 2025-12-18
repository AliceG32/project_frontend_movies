import { useEffect, useMemo, type ReactElement, useRef, useCallback } from 'react';
import {
    Table, Pagination, Form, Dropdown, Spinner, Alert, Badge, Container,
    Button, InputGroup
} from 'react-bootstrap';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import Navbar from '../components/Navbar';
import { useSelector, useDispatch } from 'react-redux';
import {
    fetchMovies, fetchFavoriteIds, addToFavorites, removeFromFavorites, deleteMovie,
    setSearchText, setCurrentSearchText, setCurrentPage, setSort, clearSort, clearSearch,
    type SortField, type SortDirection, type MovieWithRank 
} from '../redux/moviesSlice';
import type { RootState, AppDispatch } from '../redux/store';

const ITEMS_PER_PAGE: number = 10;
interface MovieListProps {
    onLogout: () => void;
}

const MovieList: React.FC<MovieListProps> = ({ onLogout }) => {
    const location = useLocation();
    useNavigate();
    const username = localStorage.getItem('username') || 'Пользователь';
    const userId = localStorage.getItem('userId');
    const searchInputRef = useRef<HTMLInputElement>(null);
    const dispatch = useDispatch<AppDispatch>();

    const {
        movies, loading, error, totalCount,
        favoriteIds, favoritesLoading,
        searchText, currentSearchText, currentPage,
        sortField, sortDirection
    } = useSelector((state: RootState) => state.movies);
    const favoriteIdsSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);
    const favoritesLoadingSet = useMemo(() => new Set(favoritesLoading), [favoritesLoading]);
    const currentFetchArgs = useMemo(() => ({
        currentPage,
        currentSearchText,
        sortField,
        sortDirection
    }), [currentPage, currentSearchText, sortField, sortDirection]);
    useEffect(() => {
        dispatch(fetchMovies(currentFetchArgs));
        if (userId) {
            dispatch(fetchFavoriteIds(userId));
        }
    }, [dispatch, currentFetchArgs, userId]);
    const handleDeleteMovieMemo = useCallback((movieId: string, movieTitle: string) => {
        dispatch(deleteMovie({ movieId, movieTitle, fetchMoviesArgs: currentFetchArgs }));
    }, [dispatch, currentFetchArgs]);
    const handleAddToFavoritesMemo = useCallback((movieId: string, movieTitle: string) => {
        if (!userId) {
            alert('Пользователь не авторизован');
            return;
        }
        dispatch(addToFavorites({ movieId, movieTitle, userId }));
    }, [dispatch, userId]);
    const handleRemoveFromFavoritesMemo = useCallback((movieId: string, movieTitle: string) => {
        if (!userId) {
            alert('Пользователь не авторизован');
            return;
        }
        dispatch(removeFromFavorites({ movieId, movieTitle, userId }));
    }, [dispatch, userId]);
    const totalPages: number = Math.ceil(totalCount / ITEMS_PER_PAGE);
    const handleSort = (field: SortField) => {
        if (sortField === field) {
            const newDirection: SortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
            dispatch(setSort({ field, direction: newDirection }));
        } else {
            dispatch(setSort({ field, direction: 'asc' }));
        }
    };

    const handleClearSort = () => {
        dispatch(clearSort());
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
                    onClick={() => dispatch(setCurrentPage(number))}
                >
                    {number}
                </Pagination.Item>,
            );
        }
        return items;
    }, [totalPages, currentPage, dispatch]);

    const handlePrevious = (): void => {
        dispatch(setCurrentPage(Math.max(1, currentPage - 1)));
    };

    const handleNext = (): void => {
        dispatch(setCurrentPage(Math.min(totalPages, currentPage + 1)));
    };
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        dispatch(setSearchText(e.target.value));
    };

    const handleSearchSubmit = () => {
        if (searchText.trim() !== currentSearchText) {
            dispatch(setCurrentSearchText(searchText.trim()));
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSearchSubmit();
        }
    };

    const handleClearSearch = () => {
        dispatch(clearSearch());
        if (searchInputRef.current) {
            searchInputRef.current.focus();
        }
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
            case 'updated_at': return 'Дате обновления';
            default: return 'Дате обновления';
        }
    };
    const FavoriteIcon = useCallback(({ movieId, movieTitle }: {
        movieId: string;
        movieTitle: string;
    }) => {
        const isFavorite = favoriteIdsSet.has(movieId);
        const isLoading = favoritesLoadingSet.has(movieId);

        const tooltipText = isFavorite
            ? `Удалить "${movieTitle}" из избранного`
            : `Добавить "${movieTitle}" в избранное`;

        const handleClick = isFavorite
            ? () => handleRemoveFromFavoritesMemo(movieId, movieTitle)
            : () => handleAddToFavoritesMemo(movieId, movieTitle);

        return (
            <button
                className={`btn btn-sm ${isFavorite ? 'btn-warning' : 'btn-outline-warning'} p-1`}
                onClick={handleClick}
                disabled={isLoading || !userId}
                style={{
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
                title={tooltipText}
                aria-label={tooltipText}
            >
                {isLoading ? (
                    <span className="spinner-border spinner-border-sm" role="status" />
                ) : isFavorite ? (
                    <span>⭐</span>
                ) : (
                    <span style={{ opacity: 0.6 }}>☆</span>
                )}
            </button>
        );
    }, [favoriteIdsSet, favoritesLoadingSet, userId, handleAddToFavoritesMemo, handleRemoveFromFavoritesMemo]);
    const CommentsIconColumn = useCallback(({ movieId, commentCount }: {
        movieId: string;
        movieTitle: string;
        commentCount: number;
    }) => {
        const tooltipText = 'Просмотреть';

        if (commentCount === 0) {
            return (
                <div className="d-flex align-items-center justify-content-center">
                    <Link
                        to={`/comments/${movieId}`}
                        className="btn btn-sm btn-outline-info"
                        style={{
                            width: '40px',
                            height: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            textDecoration: 'none'
                        }}
                        title={tooltipText}
                        aria-label={tooltipText}
                    >
                        💬
                    </Link>
                </div>
            );
        }

        return (
            <div className="d-flex align-items-center justify-content-center">
                <Link
                    to={`/comments/${movieId}`}
                    className="btn btn-sm btn-outline-info"
                    style={{
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        textDecoration: 'none'
                    }}
                    title={tooltipText}
                    aria-label={tooltipText}
                >
                    💬
                    <Badge
                        bg="primary"
                        style={{
                            position: 'absolute',
                            top: '-5px',
                            right: '-5px',
                            fontSize: '0.7em',
                            padding: '2px 5px',
                            minWidth: '18px'
                        }}
                    >
                        {commentCount}
                    </Badge>
                </Link>
            </div>
        );
    }, []);
    const EditButton = useCallback(({ movieId, movieTitle }: {
        movieId: string;
        movieTitle: string;
    }) => {
        return (
            <Link
                to={`/edit/${movieId}`}
                className="btn btn-sm btn-outline-info"
                style={{
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
                title={`Редактировать "${movieTitle}"`}
                aria-label={`Редактировать ${movieTitle}`}
            >
                ✏️
            </Link>
        );
    }, []);
    const DeleteButton = useCallback(({ movieId, movieTitle }: {
        movieId: string;
        movieTitle: string;
    }) => {
        return (
            <button
                className="btn btn-sm btn-outline-danger"
                onClick={() => handleDeleteMovieMemo(movieId, movieTitle)}
                style={{
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
                title={`Удалить "${movieTitle}"`}
                aria-label={`Удалить ${movieTitle}`}
            >
                🗑️
            </button>
        );
    }, [handleDeleteMovieMemo]);


    return (
        <>
            <Navbar username={username} onLogout={onLogout} currentPath={location.pathname} />

            <Container fluid className="p-3 p-md-5">
                                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h1 className="mb-0">Список фильмов 🎬</h1>
                        <small className="text-muted">
                            Вы вошли как: <strong>{username}</strong> •
                            {userId && (
                                <> Ваших избранных: <strong>{favoriteIds.length}</strong> •</> 
                            )}
                            Всего фильмов: <strong>{totalCount}</strong>
                        </small>
                    </div>
                    <div className="d-flex gap-2">
                        {userId && (
                            <Link
                                to="/favorites"
                                className="btn btn-warning"
                            >
                                ⭐ Избранное ({favoriteIds.length})
                            </Link> 
                        )}
                        <Link
                            to="/add"
                            className="btn btn-primary"
                        >
                            ➕ Добавить фильм
                        </Link>
                    </div>
                </div>

                                <div className="row mb-4">
                    <div className="col-md-8">
                        <Form.Group>
                            <Form.Label visuallyHidden>Поиск фильмов</Form.Label>
                            <InputGroup>
                                <Form.Control
                                    ref={searchInputRef}
                                    type="text"
                                    placeholder="Поиск по названию, описанию и субтитрам фильмов..."
                                    value={searchText}
                                    onChange={handleSearchChange}
                                    onKeyPress={handleKeyPress}
                                    className="shadow-sm"
                                    disabled={loading}
                                />
                                <Button
                                    variant="primary"
                                    onClick={handleSearchSubmit}
                                    disabled={loading}
                                >
                                    🔍 Поиск
                                </Button>
                                {currentSearchText && (
                                    <Button
                                        variant="outline-secondary"
                                        onClick={handleClearSearch}
                                        disabled={loading}
                                    >
                                        ❌ Очистить
                                    </Button>
                                )}
                            </InputGroup>
                            <Form.Text className="text-muted">
                                {currentSearchText
                                    ? `Поиск по запросу: "${currentSearchText}" • Найдено фильмов: ${totalCount}`
                                    : 'Введите текст и нажмите кнопку "Поиск" или клавишу Enter'}
                            </Form.Text>
                        </Form.Group>
                    </div>
                    <div className="col-md-4">
                                                <Dropdown className="w-100">
                            <Dropdown.Toggle variant="outline-secondary" className="w-100" disabled={loading}>
                                {getSortFieldName(sortField)} {sortDirection === 'asc' ? '↑' : '↓'}
                            </Dropdown.Toggle>
                            <Dropdown.Menu className="w-100">
                                {(['title', 'release_year', 'duration_minutes', 'rating', 'updated_at'] as SortField[]).map(field => (
                                    <Dropdown.Item key={field} onClick={() => handleSort(field)}>
                                        По {getSortFieldName(field)} {getSortIcon(field)}
                                    </Dropdown.Item>
                                ))}
                                <Dropdown.Divider />
                                <Dropdown.Item onClick={handleClearSort}>
                                    ❌ Сбросить сортировку
                                </Dropdown.Item>
                            </Dropdown.Menu>
                        </Dropdown>
                    </div>
                </div>

                                {currentSearchText && (
                    <Alert variant="info" className="mb-4">
                        <div className="d-flex justify-content-between align-items-center">
                            <div>
                                <strong>Активный поиск:</strong> "{currentSearchText}"
                                <Badge bg="light" text="dark" className="ms-2">
                                    Расширенный поиск
                                </Badge>
                            </div>
                            <Button
                                variant="outline-info"
                                size="sm"
                                onClick={handleClearSearch}
                            >
                                ❌ Очистить поиск
                            </Button>
                        </div>
                    </Alert>
                )}

                                {!loading && totalCount > 0 && (
                    <div className="alert alert-info d-flex justify-content-between align-items-center">
                        <span>
                            Сортировка по: <strong>{getSortFieldName(sortField)}</strong>
                            ({sortDirection === 'asc' ? 'по возрастанию' : 'по убыванию'})
                        </span>
                        <button className="btn btn-sm btn-outline-secondary" onClick={handleClearSort}>
                            Сбросить
                        </button>
                    </div>
                )}

                                {loading && (
                    <div className="text-center my-5">
                        <Spinner animation="border" variant="primary" />
                        <p className="mt-2">Загрузка фильмов...</p>
                    </div>
                )}

                                {error && !loading && (
                    <Alert variant="danger" className="my-4">
                        <Alert.Heading>Ошибка загрузки данных</Alert.Heading>
                        <p>{error}</p>
                        <button
                            className="btn btn-outline-danger"
                            onClick={() => dispatch(fetchMovies(currentFetchArgs))} 
                        >
                            Повторить попытку
                        </button>
                    </Alert>
                )}

                                {!loading && !error && movies.length === 0 && (
                    <div className="alert alert-warning text-center">
                        {currentSearchText
                            ? <>Поиск по запросу "<strong>{currentSearchText}</strong>" не дал результатов.</>
                            : 'Фильмы не найдены. Добавьте первый фильм!'}
                    </div>
                )}

                                {!loading && !error && movies.length > 0 && (
                    <>
                        <div className="table-responsive">
                            <Table striped bordered hover className="shadow-sm w-100">
                                <thead>
                                <tr>
                                    <th style={{ width: '50px' }}>Избранное</th>
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
                                    <th className="text-center" style={{ width: '80px' }}>Комментарии</th>
                                    <th className="text-center" style={{ width: '100px' }}>Действия</th>
                                </tr>
                                </thead>
                                <tbody>
                                {movies.map((movie: MovieWithRank, index) => {
                                    const commentCount = movie.comment_count || 0;

                                    return (
                                        <tr key={`movie-${movie.id}-${index}`}>
                                            <td className="text-center">
                                                <FavoriteIcon
                                                    movieId={movie.id}
                                                    movieTitle={movie.title}
                                                />
                                            </td>
                                            <td>
                                                <div className="d-flex align-items-center">
                                                    <strong>{movie.title}</strong>
                                                    {movie.subtitles && (
                                                        <Badge bg="info" className="ms-2" title="Есть субтитры">
                                                            SRT
                                                        </Badge>
                                                    )}
                                                    {currentSearchText && movie.rank !== undefined && movie.rank > 0 && (
                                                        <Badge bg="light" text="dark" className="ms-2" title="Релевантность">
                                                            {movie.rank?.toFixed(3) || '0.000'}
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
                                                <CommentsIconColumn
                                                    movieId={movie.id}
                                                    movieTitle={movie.title}
                                                    commentCount={commentCount}
                                                />
                                            </td>
                                            <td className="text-center">
                                                <div className="d-flex justify-content-center gap-2">
                                                    <EditButton
                                                        movieId={movie.id}
                                                        movieTitle={movie.title}
                                                    />
                                                    <DeleteButton
                                                        movieId={movie.id}
                                                        movieTitle={movie.title}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </Table>
                        </div>

                                                {totalPages > 1 && (
                            <div className="d-flex justify-content-between align-items-center mt-4">
                                <div className="text-muted">
                                    Показано {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, totalCount)}-
                                    {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} из {totalCount} фильмов
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

                                {!loading && !error && movies.length === 0 && (
                    <div className="text-center my-5">
                        <Link to="/add" className="btn btn-primary btn-lg">
                            ➕ Добавить первый фильм
                        </Link>
                    </div>
                )}

                                {!loading && movies.length > 0 && (
                    <div className="alert alert-light mt-4">
                        <small className="text-muted d-flex flex-wrap gap-3">
                            <span className="d-inline-flex align-items-center">
                                <button className="btn btn-sm btn-warning p-1 me-1" style={{ width: '20px', height: '20px' }} disabled>⭐</button>
                                — фильм в избранном
                            </span>
                            <span className="d-inline-flex align-items-center">
                                <button className="btn btn-sm btn-outline-warning p-1 me-1" style={{ width: '20px', height: '20px' }} disabled>☆</button>
                                — добавить в избранное
                            </span>
                            <span className="d-inline-flex align-items-center">
                                <button className="btn btn-sm btn-outline-info p-1 me-1" style={{ width: '20px', height: '20px' }} disabled>💬</button>
                                <Badge bg="primary" className="ms-1" style={{ fontSize: '0.7em' }}>3</Badge>
                                — комментарии (клик для просмотра)
                            </span>
                            <span className="d-inline-flex align-items-center">
                                <button className="btn btn-sm btn-outline-info p-1 me-1" style={{ width: '20px', height: '20px' }} disabled>✏️</button>
                                — редактировать фильм
                            </span>
                            <span className="d-inline-flex align-items-center">
                                <button className="btn btn-sm btn-outline-danger p-1 me-1" style={{ width: '20px', height: '20px' }} disabled>🗑️</button>
                                — удалить фильм
                            </span>
                            {currentSearchText && (
                                <span className="d-inline-flex align-items-center">
                                    <Badge bg="light" text="dark" className="me-1">0.123</Badge>
                                    — релевантность (чем выше, тем лучше)
                                </span>
                            )}
                            {!userId && (
                                <span className="d-inline-flex align-items-center text-danger">
                                    ⚠️ Войдите в систему, чтобы добавлять фильмы в избранное
                                </span>
                            )}
                        </small>
                    </div>
                )}
            </Container>
        </>
    );
};

export default MovieList;