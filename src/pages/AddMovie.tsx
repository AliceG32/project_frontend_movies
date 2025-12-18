import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container, Card, Form, Button, InputGroup,
    Alert, Badge, Spinner, ListGroup, Modal,
    FormCheck
} from 'react-bootstrap';
import Navbar from '../components/Navbar';
import { useSelector, useDispatch } from 'react-redux';
import {
    searchMovies,
    selectMovie,
    fetchSubtitlesForSelectedMovie,
    saveNewMovie,
    clearAddMovieState,
    updateTempFormData,
    setSearchSubtitles
} from '../redux/addMovieSlice';
import type { RootState, AppDispatch } from '../redux/store';
import type { Database } from '../config/supabase';

type MovieInsert = Database['public']['Tables']['movies']['Insert'];

interface AddMovieProps {
    onLogout: () => void;
}

interface KinopoiskMovie {
    nameRu: string;
    nameEn: string;
    year: string;
    filmLength: string;
    description: string;
    countries: { country: string }[];
    genres: { genre: string }[];
    rating: string;
    ratingVoteCount: string;
    kinopoiskId?: number;
}

const AddMovie: React.FC<AddMovieProps> = ({ onLogout }) => {
    const navigate = useNavigate();
    const dispatch = useDispatch<AppDispatch>();
    const {
        saving: isSubmitting,
        isFetchingMetadata: isLoading,
        isFetchingSubtitles: isLoadingSubtitles,
        tempFormData: reduxMovieData,
        subtitlesInfo,
        error: reduxError,
        searchResults,
        searchSubtitlesByDefault
    } = useSelector((state: RootState) => state.addMovie);

    const username = useSelector((state: RootState) => state.auth.username) || 'Пользователь';
    const userId = useSelector((state: RootState) => state.auth.userId);

    const [localTitleForSearch, setLocalTitleForSearch] = useState('');
    const [showMovieList, setShowMovieList] = useState(false);
    const [localSearchSubtitles, setLocalSearchSubtitles] = useState(searchSubtitlesByDefault);
    const [searchTimer, setSearchTimer] = useState(0);
    useEffect(() => {
        setLocalSearchSubtitles(searchSubtitlesByDefault);
    }, [searchSubtitlesByDefault]);
    useEffect(() => {
        return () => {
            dispatch(clearAddMovieState());
        };
    }, [dispatch]);
    useEffect(() => {
        let interval: number | undefined;

        if (isLoadingSubtitles && localSearchSubtitles) {
            setSearchTimer(0);
            interval = window.setInterval(() => {
                setSearchTimer(prev => prev + 1);
            }, 1000);
        }

        return () => {
            if (interval) clearInterval(interval);
            if (!isLoadingSubtitles) setSearchTimer(0);
        };
    }, [isLoadingSubtitles, localSearchSubtitles]);
    const handleSearchMovies = useCallback(() => {
        const titleToSearch = reduxMovieData?.title || localTitleForSearch;
        if (!titleToSearch.trim()) {
            alert('Введите название фильма для поиска');
            return;
        }
        dispatch(searchMovies(titleToSearch.trim())).then(() => {
            setShowMovieList(true);
        });
    }, [dispatch, reduxMovieData, localTitleForSearch]);
    const handleToggleSearchSubtitles = useCallback(() => {
        const newValue = !localSearchSubtitles;
        setLocalSearchSubtitles(newValue);
        dispatch(setSearchSubtitles(newValue));
        if (newValue && reduxMovieData?.title && reduxMovieData?.release_year && !subtitlesInfo) {
            dispatch(fetchSubtitlesForSelectedMovie());
        }
    }, [dispatch, localSearchSubtitles, reduxMovieData, subtitlesInfo]);
    const handleSelectMovie = useCallback((movie: KinopoiskMovie) => {
        dispatch(selectMovie(movie));
        setShowMovieList(false);
    }, [dispatch]);
    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        dispatch(updateTempFormData({
            [name]: name === 'release_year' || name === 'duration_minutes'
                ? (value ? Number(value) : null)
                : name === 'rating' ? (value ? parseFloat(value) : null)
                    : value
        }));
    }, [dispatch]);
    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();

        if (!userId) {
            alert('Ошибка: ID пользователя не найден. Пожалуйста, перезайдите.');
            return;
        }

        if (!reduxMovieData?.title || !reduxMovieData.description || !reduxMovieData.rating) {
            alert('Заполните все обязательные поля.');
            return;
        }

        const finalMovieData: MovieInsert = {
            ...reduxMovieData as MovieInsert,
            subtitles: subtitlesInfo?.content || null,
        };

        const result = await dispatch(saveNewMovie({ movieData: finalMovieData }));

        if (saveNewMovie.fulfilled.match(result)) {
            navigate('/');
        }
    }, [dispatch, reduxMovieData, userId, subtitlesInfo, navigate]);
    const handleFetchSubtitles = useCallback(() => {
        if (reduxMovieData?.title && reduxMovieData?.release_year) {
            dispatch(fetchSubtitlesForSelectedMovie());
        } else {
            alert('Для поиска субтитров необходимо сначала заполнить название фильма и год выпуска');
        }
    }, [dispatch, reduxMovieData]);
    const formatDurationPreview = (minutes: number | undefined | null): string => {
        const mins = Number(minutes);
        if (isNaN(mins) || mins <= 0) return 'Неверное значение';
        const hours = Math.floor(mins / 60);
        const remainingMins = mins % 60;
        return `${hours}ч ${remainingMins}м`;
    };

    const validateRating = (value: number | undefined | null): boolean => {
        const numValue = Number(value);
        return !isNaN(numValue) && numValue >= 0 && numValue <= 10;
    };

    const getSubtitlesPreview = (content: string): string =>
        content.length > 100 ? content.substring(0, 100) + '...' : content;

    const getSubtitleFileType = (fileName: string): string => {
        if (fileName.toLowerCase().endsWith('.srt')) return 'SRT';
        if (fileName.toLowerCase().endsWith('.ass')) return 'ASS';
        if (fileName.toLowerCase().endsWith('.ssa')) return 'SSA';
        if (fileName.toLowerCase().endsWith('.vtt')) return 'WebVTT';
        return 'Текст';
    };

    const { title = '', release_year, duration_minutes, description = '', rating = 0 } = reduxMovieData || {};
    const ratingString = rating?.toString() || '0';

    return (
        <>
            <Navbar username={username} onLogout={onLogout} currentPath="/add" />

            <Container className="my-5">
                <Card className="shadow-lg p-4">
                    <h3>Добавить новый фильм ➕</h3>
                    <hr />

                    {reduxError && (
                        <Alert variant="danger" className="mb-3">
                            <Alert.Heading>Ошибка!</Alert.Heading>
                            <p>{reduxError}</p>
                        </Alert>
                    )}

                    <Form onSubmit={handleSubmit}>
                                                <Form.Group className="mb-3">
                            <Form.Label>Название фильма</Form.Label>
                            <InputGroup>
                                <Form.Control
                                    type="text"
                                    value={reduxMovieData ? title : localTitleForSearch}
                                    onChange={(e) => {
                                        if (reduxMovieData) {
                                            handleChange(e);
                                        } else {
                                            setLocalTitleForSearch(e.target.value);
                                        }
                                    }}
                                    placeholder="Введите название фильма"
                                    required
                                    name="title"
                                    disabled={isSubmitting || isLoading}
                                />
                                <Button
                                    variant="outline-info"
                                    onClick={handleSearchMovies}
                                    disabled={isLoading || isSubmitting || !(reduxMovieData ? title.trim() : localTitleForSearch.trim())}
                                    title="Найти фильмы в Kinopoisk"
                                >
                                    {isLoading ? (
                                        <>
                                            <Spinner animation="border" size="sm" className="me-2" />
                                            Поиск...
                                        </>
                                    ) : (
                                        '🔍 Найти фильмы'
                                    )}
                                </Button>
                            </InputGroup>
                            <Form.Text className="text-muted">
                                Введите название фильма и нажмите кнопку для поиска
                            </Form.Text>
                        </Form.Group>

                                                <Form.Group className="mb-3">
                            <Form.Label>Год выпуска</Form.Label>
                            <Form.Control
                                type="number"
                                name="release_year"
                                value={release_year || ''}
                                onChange={handleChange}
                                min="1888"
                                max="2030"
                                placeholder="Введите год выпуска"
                                required
                                disabled={isSubmitting || isLoading}
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>
                                Продолжительность (минуты)
                                {duration_minutes && (
                                    <span className="text-muted ms-2">
                                        → {formatDurationPreview(duration_minutes)}
                                    </span>
                                )}
                            </Form.Label>
                            <Form.Control
                                type="number"
                                name="duration_minutes"
                                value={duration_minutes || ''}
                                onChange={handleChange}
                                min="1"
                                max="500"
                                placeholder="Введите продолжительность в минутах"
                                required
                                disabled={isSubmitting || isLoading}
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Описание фильма</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={4}
                                name="description"
                                value={description}
                                onChange={handleChange}
                                placeholder="Введите описание сюжета фильма..."
                                required
                                disabled={isSubmitting || isLoading}
                            />
                            <Form.Text className="text-muted">
                                {description.length} символов
                            </Form.Text>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Рейтинг <span className="text-danger">*</span></Form.Label>
                            <Form.Control
                                type="number"
                                step="0.1"
                                min="0"
                                max="10"
                                name="rating"
                                value={ratingString}
                                onChange={handleChange}
                                placeholder="Введите рейтинг от 0 до 10"
                                required
                                isInvalid={!validateRating(rating)}
                                disabled={isSubmitting || isLoading}
                            />
                            <Form.Control.Feedback type="invalid">
                                Рейтинг должен быть числом от 0 до 10
                            </Form.Control.Feedback>
                            <Form.Text className="text-muted">
                                Рейтинг фильма от 0 до 10 (обязательное поле)
                            </Form.Text>
                        </Form.Group>

                                                <div className="mb-4 p-3 border rounded">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <FormCheck
                                    type="switch"
                                    id="search-subtitles-switch"
                                    label={
                                        <span className="fw-bold">
                                            {localSearchSubtitles ? '✅ Поиск субтитров включен' : '❌ Поиск субтитров отключен'}
                                        </span>
                                    }
                                    checked={localSearchSubtitles}
                                    onChange={handleToggleSearchSubtitles}
                                    className="fs-5"
                                />

                                {localSearchSubtitles && !subtitlesInfo && reduxMovieData?.title && reduxMovieData?.release_year && (
                                    <Button
                                        variant="outline-primary"
                                        size="sm"
                                        onClick={handleFetchSubtitles}
                                        disabled={isLoadingSubtitles || isSubmitting}
                                    >
                                        {isLoadingSubtitles ? (
                                            <>
                                                <Spinner animation="border" size="sm" className="me-2" />
                                                Поиск...
                                            </>
                                        ) : (
                                            '🔍 Найти субтитры'
                                        )}
                                    </Button>
                                )}
                            </div>

                            <div className="text-muted small">
                                {localSearchSubtitles
                                    ? 'Будет выполнен поиск и скачивание русских субтитров (максимум 10 секунд)'
                                    : 'Субтитры искаться не будут'}
                            </div>

                                                        {isLoadingSubtitles && (
                                <Alert variant="info" className="mt-3 mb-0">
                                    <div className="d-flex align-items-center">
                                        <Spinner animation="border" size="sm" className="me-2" />
                                        <span>
                                            Идет поиск и скачивание субтитров...
                                            {searchTimer > 0 && (
                                                <Badge bg="secondary" className="ms-2">
                                                    {searchTimer} сек
                                                </Badge>
                                            )}
                                        </span>
                                    </div>
                                    {searchTimer >= 8 && (
                                        <div className="mt-2 small">
                                            ⏰ Поиск скоро будет прерван (максимум 10 секунд)
                                        </div>
                                    )}
                                </Alert>
                            )}

                                                        {!isLoadingSubtitles && subtitlesInfo && (
                                <Alert variant="success" className="mt-3 mb-0">
                                    <Alert.Heading>
                                        ✅ Субтитры найдены и скачаны!
                                        <Badge bg="info" className="ms-2">
                                            {getSubtitleFileType(subtitlesInfo.fileName)}
                                        </Badge>
                                    </Alert.Heading>
                                    <p>
                                        <strong>Файл:</strong> {subtitlesInfo.fileName}<br />
                                        <strong>Размер:</strong> <Badge bg="info">{subtitlesInfo.content.length} символов</Badge><br />
                                        <strong>Предпросмотр:</strong><br />
                                        <pre className="bg-light p-2 mt-2 rounded" style={{ fontSize: '0.8rem' }}>
                                            {getSubtitlesPreview(subtitlesInfo.content)}
                                        </pre>
                                    </p>
                                </Alert>
                            )}

                            {!isLoadingSubtitles && localSearchSubtitles && !subtitlesInfo && reduxMovieData?.title && reduxMovieData?.release_year && (
                                <Alert variant="warning" className="mt-3 mb-0">
                                    <Alert.Heading>
                                        ⚠️ Субтитры еще не найдены
                                    </Alert.Heading>
                                    <p className="mb-0">
                                        Нажмите кнопку "Найти субтитры" для начала поиска
                                    </p>
                                </Alert>
                            )}

                            {!isLoadingSubtitles && localSearchSubtitles && !reduxMovieData?.title && (
                                <Alert variant="secondary" className="mt-3 mb-0">
                                    <Alert.Heading>
                                        ℹ️ Заполните данные фильма
                                    </Alert.Heading>
                                    <p className="mb-0">
                                        Для поиска субтитров необходимо сначала заполнить название фильма и год выпуска
                                    </p>
                                </Alert>
                            )}
                        </div>

                        <div className="d-flex gap-2">
                            <Button
                                variant="success"
                                type="submit"
                                className="me-2"
                                disabled={isSubmitting || isLoading || isLoadingSubtitles || !validateRating(rating) || !title}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Spinner animation="border" size="sm" className="me-2" />
                                        Добавление...
                                    </>
                                ) : (
                                    <>
                                        ➕ Добавить фильм
                                        {subtitlesInfo?.content && ' с субтитрами'}
                                    </>
                                )}
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={() => navigate('/')}
                                disabled={isSubmitting || isLoading || isLoadingSubtitles}
                            >
                                ❌ Отмена
                            </Button>
                        </div>
                    </Form>
                </Card>
            </Container>

                        <Modal show={showMovieList} onHide={() => setShowMovieList(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Выберите фильм</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="mb-3 p-3 bg-light rounded">
                        <FormCheck
                            type="switch"
                            id="search-subtitles-switch-modal"
                            label={
                                <>
                                    <strong>Включить поиск субтитров</strong>
                                    <span className="text-muted ms-2">
                                        (можно изменить позже)
                                    </span>
                                </>
                            }
                            checked={localSearchSubtitles}
                            onChange={handleToggleSearchSubtitles}
                            className="fs-5"
                        />
                        <div className="text-muted small mt-1">
                            {localSearchSubtitles
                                ? 'После выбора фильма можно будет найти субтитры'
                                : 'Только данные фильма, без субтитров'}
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="text-center p-4">
                            <Spinner animation="border" />
                            <p className="mt-2">Поиск фильмов...</p>
                        </div>
                    ) : searchResults.length === 0 ? (
                        <Alert variant="info">
                            Фильмы не найдены. Попробуйте другой запрос.
                        </Alert>
                    ) : (
                        <ListGroup>
                            {searchResults.map((movie, index) => (
                                <ListGroup.Item
                                    key={movie.kinopoiskId || index}
                                    action
                                    onClick={() => handleSelectMovie(movie)}
                                    className="d-flex justify-content-between align-items-start"
                                >
                                    <div>
                                        <div className="fw-bold">
                                            {movie.nameRu || movie.nameEn || 'Без названия'}
                                            {movie.kinopoiskId && (
                                                <Badge bg="secondary" className="ms-2">
                                                    ID: {movie.kinopoiskId}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="text-muted small">
                                            {movie.year && `Год: ${movie.year}`}
                                            {movie.filmLength && ` · Длительность: ${movie.filmLength}`}
                                            {movie.rating && movie.rating !== 'null' && ` · Рейтинг: ${movie.rating}`}
                                        </div>
                                        {movie.genres && movie.genres.length > 0 && (
                                            <div className="mt-1">
                                                {movie.genres.slice(0, 3).map(genre => (
                                                    <Badge key={genre.genre} bg="info" className="me-1">
                                                        {genre.genre}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                        {movie.description && (
                                            <div className="mt-2 small">
                                                {movie.description.length > 150
                                                    ? `${movie.description.substring(0, 150)}...`
                                                    : movie.description}
                                            </div>
                                        )}
                                    </div>
                                    <div className="d-flex flex-column align-items-end gap-1">
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSelectMovie(movie);
                                            }}
                                        >
                                            Выбрать
                                        </Button>
                                        <small className="text-muted">
                                            {localSearchSubtitles ? 'Субтитры после выбора' : 'Без субтитров'}
                                        </small>
                                    </div>
                                </ListGroup.Item>
                            ))}
                        </ListGroup>
                    )}
                </Modal.Body>
            </Modal>
        </>
    );
};

export default AddMovie;