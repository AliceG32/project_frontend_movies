import { useState, type FormEvent } from 'react';
import { Form, Button, Card, Container, Alert, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { loginUser } from '../redux/authSlice';
import type { RootState, AppDispatch } from '../redux/store';

const Login: React.FC = () => {
    const [username, setUsername] = useState<string>('user');
    const [password, setPassword] = useState<string>('user');
    const navigate = useNavigate();
    const dispatch = useDispatch<AppDispatch>();
    const { loading, error} = useSelector((state: RootState) => state.auth);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const result = await dispatch(loginUser({ username, password }));
        if (loginUser.fulfilled.match(result)) {
            navigate('/', { replace: true });
        }
    };

    return (
        <Container
            className="d-flex align-items-center justify-content-center"
            style={{ minHeight: '100vh' }}
        >
            <Card style={{ width: '100%', maxWidth: '400px' }} className="shadow-lg">
                <Card.Header className="text-center bg-primary text-white">
                    <h2>Вход в систему</h2>
                </Card.Header>
                <Card.Body>
                                        {error && (
                        <Alert variant="danger" className="text-center">
                            {error}
                        </Alert>
                    )}

                    <Form onSubmit={handleSubmit}>
                        <Form.Group className="mb-3" controlId="formBasicUsername">
                            <Form.Label>Имя пользователя</Form.Label>
                            <Form.Control
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="user"
                                required
                                disabled={loading}
                            />
                        </Form.Group>

                        <Form.Group className="mb-4" controlId="formBasicPassword">
                            <Form.Label>Пароль</Form.Label>
                            <Form.Control
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="user"
                                required
                                disabled={loading}
                            />
                        </Form.Group>

                        <Button
                            variant="primary"
                            type="submit"
                            className="w-100"
                            disabled={loading || !username || !password}
                        >
                            {loading ? (
                                <>
                                    <Spinner size="sm" className="me-2" />
                                    Проверка...
                                </>
                            ) : (
                                'Войти в систему'
                            )}
                        </Button>
                    </Form>

                    <div className="text-center mt-4 pt-3 border-top">
                        <small className="text-muted">
                            <div className="mb-1">Тестовые учетные данные:</div>
                            <div><strong>Имя:</strong> user</div>
                            <div><strong>Пароль:</strong> user</div>
                        </small>
                    </div>
                </Card.Body>
            </Card>
        </Container>
    );
};

export default Login;