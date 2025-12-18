import { useState, useEffect, useCallback, useMemo } from 'react';
import { Container, Card, Button, Form, Spinner, Alert, Badge } from 'react-bootstrap';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useSelector, useDispatch } from 'react-redux';
import {
    fetchComments,
    addComment,
    editComment,
    deleteComment,
    setEditingCommentId
} from '../redux/commentsSlice';
import type { RootState, AppDispatch } from '../redux/store';

interface CommentsPageProps {
    onLogout: () => void;
}

const CommentsPage: React.FC<CommentsPageProps> = ({ onLogout }) => {
    const { movieId } = useParams<{ movieId: string }>();
    const navigate = useNavigate();

    const username = localStorage.getItem('username') || 'Пользователь';
    const userId = localStorage.getItem('userId');

    const dispatch = useDispatch<AppDispatch>();
    const {
        comments,
        currentMovieTitle,
        loading,
        submitting, 
        error,
        editingCommentId
    } = useSelector((state: RootState) => state.comments);
    const [newComment, setNewComment] = useState('');
    const [editText, setEditText] = useState('');
    const editingComment = useMemo(() => {
        return comments.find(c => c.id === editingCommentId);
    }, [comments, editingCommentId]);
    useEffect(() => {
        if (movieId) {
            dispatch(fetchComments(movieId));
        }
    }, [dispatch, movieId]);
    useEffect(() => {
        if (editingComment) {
            setEditText(editingComment.comment);
        } else {
            setEditText('');
        }
    }, [editingComment]);
    const handleSubmitComment = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !userId || !movieId) return;

        dispatch(addComment({
            movieId: movieId,
            userId: userId,
            comment: newComment
        })).then(result => {
            if (addComment.fulfilled.match(result)) {
                setNewComment('');
            }
        });
    }, [newComment, userId, movieId, dispatch]);
    const handleDelete = useCallback((commentId: string) => {
        dispatch(deleteComment(commentId));
    }, [dispatch]);
    const handleEdit = useCallback((commentId: string) => {
        const commentToEdit = comments.find(c => c.id === commentId);
        if (commentToEdit) {
            setEditText(commentToEdit.comment);
            dispatch(setEditingCommentId(commentId));
        }
    }, [comments, dispatch]);
    const handleCancelEdit = useCallback(() => {
        dispatch(setEditingCommentId(null));
        setEditText('');
    }, [dispatch]);
    const handleSaveEdit = useCallback(() => {
        if (!editingCommentId || !editText.trim()) return;

        dispatch(editComment({
            commentId: editingCommentId,
            newCommentText: editText
        }));
    }, [editingCommentId, editText, dispatch]);
    const formatTimestamp = (timestamp: string | null) => {
        if (!timestamp) return 'Неизвестная дата';
        return new Date(timestamp).toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (!movieId) {
        return (
            <>
                <Navbar username={username} onLogout={onLogout} currentPath={`/comments/${movieId}`} />
                <Container className="mt-5 text-center">
                    <Alert variant="danger">
                        <h4>Ошибка маршрутизации</h4>
                        <p>ID фильма не указан.</p>
                        <Button variant="primary" onClick={() => navigate('/')} className="mt-2">
                            На главную
                        </Button>
                    </Alert>
                </Container>
            </>
        );
    }

    return (
        <>
            <Navbar username={username} onLogout={onLogout} currentPath={`/comments/${movieId}`} />

            <Container className="my-5">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h1>Комментарии к фильму</h1>
                    <Link to="/" className="btn btn-outline-secondary">
                        ← Назад к списку фильмов
                    </Link>
                </div>

                {currentMovieTitle && (
                    <Alert variant="info" className="text-center">
                        Вы комментируете: <strong>{currentMovieTitle}</strong>
                    </Alert>
                )}

                                {loading && (
                    <div className="text-center my-5">
                        <Spinner animation="border" variant="primary" />
                        <p className="mt-2">Загрузка комментариев...</p>
                    </div>
                )}

                                {error && !loading && (
                    <Alert variant="danger" className="my-4">
                        <Alert.Heading>Ошибка загрузки данных</Alert.Heading>
                        <p>{error}</p>
                        <Button variant="danger" onClick={() => dispatch(fetchComments(movieId))}>
                            Повторить загрузку
                        </Button>
                    </Alert>
                )}

                {!loading && !error && (
                    <>
                                                {userId ? (
                            <Card className="mb-4 shadow-sm">
                                <Card.Header as="h5" className="bg-light">
                                    Добавить комментарий как <strong>{username}</strong>
                                </Card.Header>
                                <Card.Body>
                                    <Form onSubmit={handleSubmitComment}>
                                        <Form.Group className="mb-3">
                                            <Form.Control
                                                as="textarea"
                                                rows={3}
                                                placeholder="Напишите ваш комментарий..."
                                                value={newComment}
                                                onChange={(e) => setNewComment(e.target.value)}
                                                required
                                                disabled={submitting}
                                            />
                                        </Form.Group>
                                        <Button
                                            variant="primary"
                                            type="submit"
                                            disabled={!newComment.trim() || submitting}
                                        >
                                            {submitting ? (
                                                <Spinner animation="border" size="sm" className="me-2" />
                                            ) : (
                                                'Отправить комментарий'
                                            )}
                                        </Button>
                                    </Form>
                                </Card.Body>
                            </Card>
                        ) : (
                            <Alert variant="warning" className="text-center">
                                <p className="mb-0">
                                    Пожалуйста, <Link to="/login">войдите в систему</Link>, чтобы оставлять комментарии.
                                </p>
                            </Alert>
                        )}

                        <h4 className="mt-5 mb-3">
                            {comments.length} Комментари{comments.length === 1 ? 'й' : comments.length > 4 ? 'ев' : 'я'}
                        </h4>

                                                {comments.length === 0 ? (
                            <Alert variant="secondary" className="text-center">
                                Пока нет комментариев. Будьте первым!
                            </Alert>
                        ) : (
                            <div className="d-grid gap-3">
                                {comments.map((comment) => {
                                    const isUserComment = comment.user_id === userId;
                                    const isEditing = editingCommentId === comment.id;

                                    return (
                                        <Card key={comment.id} className="shadow-sm">
                                            <Card.Header
                                                className={`d-flex justify-content-between align-items-center ${isUserComment ? 'bg-light-info' : 'bg-light'}`}
                                            >
                                                <div>
                                                    <strong>{comment.user.name}</strong>
                                                    <Badge pill bg="secondary" className="ms-2 fw-normal">
                                                        {formatTimestamp(comment.created_at)}
                                                    </Badge>
                                                    {comment.created_at !== comment.updated_at && (
                                                        <Badge pill bg="warning" className="ms-2 fw-normal">
                                                            (изменено)
                                                        </Badge>
                                                    )}
                                                </div>
                                                {isUserComment && (
                                                    <div>
                                                        {isEditing ? (
                                                            <>
                                                                <Button
                                                                    variant="success"
                                                                    size="sm"
                                                                    className="me-2"
                                                                    onClick={handleSaveEdit}
                                                                    disabled={submitting || !editText.trim()}
                                                                >
                                                                    {submitting ? <Spinner animation="border" size="sm" /> : 'Сохранить'}
                                                                </Button>
                                                                <Button
                                                                    variant="secondary"
                                                                    size="sm"
                                                                    onClick={handleCancelEdit}
                                                                    disabled={submitting}
                                                                >
                                                                    Отмена
                                                                </Button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Button
                                                                    variant="outline-info"
                                                                    size="sm"
                                                                    className="me-2"
                                                                    onClick={() => handleEdit(comment.id)}
                                                                    disabled={submitting}
                                                                >
                                                                    ✏️ Изменить
                                                                </Button>
                                                                <Button
                                                                    variant="outline-danger"
                                                                    size="sm"
                                                                    onClick={() => handleDelete(comment.id)}
                                                                    disabled={submitting}
                                                                >
                                                                    🗑️ Удалить
                                                                </Button>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </Card.Header>
                                            <Card.Body>
                                                {isEditing ? (
                                                    <Form.Control
                                                        as="textarea"
                                                        rows={3}
                                                        value={editText}
                                                        onChange={(e) => setEditText(e.target.value)}
                                                        disabled={submitting}
                                                    />
                                                ) : (
                                                    <p className="card-text mb-0">{comment.comment}</p>
                                                )}
                                            </Card.Body>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}

                                <div className="mt-4 text-center">
                    <Button
                        variant="secondary"
                        onClick={() => navigate('/')}
                        className="me-2"
                    >
                        ← Назад к списку фильмов
                    </Button>
                    {userId && (
                        <Button
                            variant="primary"
                            onClick={() => {
                                const textarea = document.querySelector('textarea');
                                if (textarea) {
                                    textarea.scrollIntoView({ behavior: 'smooth' });
                                    textarea.focus();
                                }
                            }}
                        >
                            💬 Добавить комментарий
                        </Button>
                    )}
                </div>
            </Container>
        </>
    );
};

export default CommentsPage;