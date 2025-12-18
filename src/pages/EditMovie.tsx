import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import Navbar from '../components/Navbar';
import { useSelector, useDispatch } from 'react-redux';
import { fetchMovieDetail, updateMovie, clearMovieDetail } from '../redux/movieDetailSlice';
import type { RootState, AppDispatch } from '../redux/store';
import type { Database } from '../config/supabase';
type Movie = Database['public']['Tables']['movies']['Row'];
type MovieUpdate = Database['public']['Tables']['movies']['Update'];

interface EditMovieProps {
    onLogout: () => void;
}

const EditMovie: React.FC<EditMovieProps> = ({ onLogout }) => {
    const { id: movieId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const username = useSelector((state: RootState) => state.auth.username) || 'Пользователь';
    const dispatch = useDispatch<AppDispatch>();
    const {
        currentMovie,
        loading,
        saving,
        error
    } = useSelector((state: RootState) => state.movieDetail);
    const [formData, setFormData] = useState<MovieUpdate>({});
    useEffect(() => {
        if (movieId) {
            dispatch(fetchMovieDetail(movieId));
        }
        return () => {
            dispatch(clearMovieDetail());
        };
    }, [dispatch, movieId]);
    useEffect(() => {
        if (currentMovie) {
            setFormData({
                title: currentMovie.title,
                release_year: currentMovie.release_year,
                duration_minutes: currentMovie.duration_minutes,
                description: currentMovie.description,
                rating: currentMovie.rating,
                subtitles: currentMovie.subtitles,
            });
        }
    }, [currentMovie]);
    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'release_year' || name === 'duration_minutes'
                ? (value ? parseInt(value) : null) 
                : name === 'rating' ? (value ? parseFloat(value) : null)
                    : value
        }));
    }, []);
    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();

        if (!movieId || !currentMovie) return;
        const updatedData: MovieUpdate = {};
        let hasChanges = false;

        const currentMovieTyped = currentMovie as Movie;

        const fields = ['title', 'release_year', 'duration_minutes', 'description', 'rating', 'subtitles'] as const;

        fields.forEach(field => {
            const currentValue = currentMovieTyped[field] === null ? '' : String(currentMovieTyped[field]);
            const formValue = formData[field] === null || formData[field] === undefined ? '' : String(formData[field]);

            if (currentValue !== formValue) {
                if (field === 'release_year' || field === 'duration_minutes') {
                    updatedData[field] = parseInt(formValue) || undefined;
                } else if (field === 'rating') {
                    updatedData[field] = parseFloat(formValue) || undefined;
                } else {
                    updatedData[field] = formValue;
                }
                hasChanges = true;
            }
        });

        if (!hasChanges) {
            alert('Нет изменений для сохранения.');
            return;
        }
        const result = await dispatch(updateMovie({
            movieId: movieId,
            movieData: updatedData
        }));

        if (updateMovie.fulfilled.match(result)) {
            navigate('/');
        }

    }, [movieId, currentMovie, formData, dispatch, navigate]);
    const isFormValid = useMemo(() => {
        const { title, release_year, duration_minutes, rating } = formData;
        return (
            !!title &&
            !!release_year &&
            !!duration_minutes &&
            !!rating &&
            parseInt(String(release_year)) >= 1888 &&
            parseInt(String(duration_minutes)) > 0 &&
            parseFloat(String(rating)) >= 0 && parseFloat(String(rating)) <= 10
        );
    }, [formData]);
    if (!movieId) {
        return (
            <Container className="mt-5 text-center">
                <Alert variant="danger">
                    <h4>Ошибка маршрутизации</h4>
                    <p>ID фильма для редактирования не указан.</p>
                </Alert>
            </Container>
        );
    }

    if (loading) {
        return (
            <>
                <Navbar username={username} onLogout={onLogout} currentPath={`/edit/${movieId}`} />
                <Container className="text-center my-5">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-2">Загрузка данных фильма...</p>
                </Container>
            </>
        );
    }

    if (error && !currentMovie) {
        return (
            <>
                <Navbar username={username} onLogout={onLogout} currentPath={`/edit/${movieId}`} />
                <Container className="mt-5">
                    <Alert variant="danger">
                        <Alert.Heading>Ошибка загрузки</Alert.Heading>
                        <p>{error}</p>
                        <Button variant="danger" onClick={() => dispatch(fetchMovieDetail(movieId))}>
                            Повторить попытку
                        </Button>
                    </Alert>
                </Container>
            </>
        );
    }

    if (!currentMovie) {
        return (
            <>
                <Navbar username={username} onLogout={onLogout} currentPath={`/edit/${movieId}`} />
                <Container className="mt-5">
                    <Alert variant="warning">Фильм с ID {movieId} не найден.</Alert>
                </Container>
            </>
        );
    }
    return (
        <>
            <Navbar username={username} onLogout={onLogout} currentPath={`/edit/${movieId}`} />

            <Container className="my-5">
                <Card className="shadow-lg">
                    <Card.Header className="bg-primary text-white">
                        <h2 className="mb-0">Редактирование: {currentMovie.title}</h2>
                    </Card.Header>
                    <Card.Body>
                        <p className="text-muted">ID фильма: {currentMovie.id}</p>

                        <Form onSubmit={handleSubmit}>
                                                        <Form.Group className="mb-3" controlId="formTitle">
                                <Form.Label>Название</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="title"
                                    value={formData.title || ''}
                                    onChange={handleChange}
                                    required
                                    disabled={saving}
                                    maxLength={255}
                                />
                            </Form.Group>

                                                        <Form.Group className="mb-3" controlId="formReleaseYear">
                                <Form.Label>Год выпуска</Form.Label>
                                <Form.Control
                                    type="number"
                                    name="release_year"
                                    value={formData.release_year || ''}
                                    onChange={handleChange}
                                    required
                                    disabled={saving}
                                    min="1888"
                                    max={new Date().getFullYear()}
                                />
                            </Form.Group>

                                                        <Form.Group className="mb-3" controlId="formDuration">
                                <Form.Label>Длительность (минуты)</Form.Label>
                                <Form.Control
                                    type="number"
                                    name="duration_minutes"
                                    value={formData.duration_minutes || ''}
                                    onChange={handleChange}
                                    required
                                    disabled={saving}
                                    min="1"
                                />
                            </Form.Group>

                                                        <Form.Group className="mb-3" controlId="formRating">
                                <Form.Label>Рейтинг (от 0 до 10)</Form.Label>
                                <Form.Control
                                    type="number"
                                    name="rating"
                                    value={formData.rating || ''}
                                    onChange={handleChange}
                                    required
                                    disabled={saving}
                                    step="0.1"
                                    min="0"
                                    max="10"
                                />
                            </Form.Group>

                                                        <Form.Group className="mb-3" controlId="formDescription">
                                <Form.Label>Описание</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={3}
                                    name="description"
                                    value={formData.description || ''}
                                    onChange={handleChange}
                                    disabled={saving}
                                />
                            </Form.Group>

                                                        <Form.Group className="mb-4" controlId="formSubtitles">
                                <Form.Label>Субтитры (языки)</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="subtitles"
                                    value={formData.subtitles || ''}
                                    onChange={handleChange}
                                    disabled={saving}
                                    maxLength={100}
                                />
                                <Form.Text className="text-muted">
                                    Укажите доступные языки субтитров через запятую
                                </Form.Text>
                            </Form.Group>

                            <div className="d-flex gap-2">
                                <Button
                                    variant="primary"
                                    type="submit"
                                    className="me-2"
                                    disabled={saving || !isFormValid}
                                >
                                    {saving ? (
                                        <>
                                            <Spinner animation="border" size="sm" className="me-2" />
                                            Сохранение...
                                        </>
                                    ) : (
                                        <>💾 Сохранить изменения</>
                                    )}
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={() => navigate('/')}
                                    disabled={saving}
                                >
                                    ❌ Отмена
                                </Button>
                            </div>
                        </Form>
                    </Card.Body>
                </Card>
            </Container>
        </>
    );
};

export default EditMovie;