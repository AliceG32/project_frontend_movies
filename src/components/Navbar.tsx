import { Navbar, Nav, Container, NavDropdown, Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';

interface NavbarProps {
    username: string;
    onLogout: () => void;
    currentPath?: string;
}

const NavbarComponent: React.FC<NavbarProps> = ({
                                                    username,
                                                    onLogout,
                                                    currentPath = '/'
                                                }) => {
    const [favoritesCount, setFavoritesCount] = useState<number>(0);

    const handleLogoutClick = () => {
        onLogout();
    };
    const isActive = (path: string) => currentPath === path;
    useEffect(() => {
        const loadFavoritesCount = async () => {
            const userId = localStorage.getItem('userId');
            if (!userId) {
                setFavoritesCount(0);
                return;
            }

            try {
                const { supabase } = await import('../config/supabase');

                const { data, error } = await supabase
                    .from('favorites')
                    .select('id', { count: 'exact', head: true })
                    .eq('user_id', userId);

                if (!error && data !== null) {
                    const count = typeof data === 'number' ? data : data?.length || 0;
                    setFavoritesCount(count);
                }
            } catch (error) {
                console.error('Ошибка при загрузке количества избранных:', error);
            }
        };

        loadFavoritesCount();
        const interval = setInterval(() => {
            loadFavoritesCount();
        }, 30000); 

        return () => clearInterval(interval);
    }, [currentPath]);

    return (
        <Navbar bg="dark" variant="dark" expand="lg" className="mb-4 shadow-sm">
            <Container fluid>
                <Navbar.Brand as={Link} to="/" className="fw-bold d-flex align-items-center">
                    <span className="me-2">🎬</span>
                    Кинотека
                    <Badge bg="light" text="dark" className="ms-2 fs-6">
                        Beta
                    </Badge>
                </Navbar.Brand>

                <Navbar.Toggle aria-controls="basic-navbar-nav" />

                <Navbar.Collapse id="basic-navbar-nav">
                    <Nav className="me-auto">
                        <Nav.Link
                            as={Link}
                            to="/"
                            active={isActive('/')}
                            className="d-flex align-items-center"
                        >
                            <span className="me-1">🏠</span>
                            Главная
                        </Nav.Link>

                        <Nav.Link
                            as={Link}
                            to="/favorites"
                            active={isActive('/favorites')}
                            className="d-flex align-items-center position-relative"
                        >
                            <span className="me-1">⭐</span>
                            Избранное
                            {favoritesCount > 0 && (
                                <Badge
                                    bg="warning"
                                    text="dark"
                                    pill
                                    className="position-absolute top-0 start-100 translate-middle"
                                    style={{ fontSize: '0.6rem', minWidth: '18px' }}
                                >
                                    {favoritesCount > 99 ? '99+' : favoritesCount}
                                </Badge>
                            )}
                        </Nav.Link>

                        <Nav.Link
                            as={Link}
                            to="/add"
                            className="d-flex align-items-center text-success"
                        >
                            <span className="me-1">➕</span>
                            Добавить фильм
                        </Nav.Link>
                    </Nav>

                    <Nav>
                        <NavDropdown
                            title={
                                <div className="d-flex align-items-center">
                                    <div className="d-flex align-items-center me-1">
                                        <span className="me-2">👤</span>
                                        <div className="text-start">
                                            <div className="fw-bold text-white" style={{ fontSize: '0.9rem' }}>
                                                {username}
                                            </div>
                                        </div>
                                    </div>
                                    <span className="dropdown-arrow ms-1">▼</span>
                                </div>
                            }
                            id="basic-nav-dropdown"
                            align="end"
                            className="nav-dropdown-custom"
                            menuVariant="dark"
                        >
                            <NavDropdown.Header className="text-white small py-2">
                                <div className="d-flex flex-column">
                                    <span className="text-light">Вы вошли как:</span>
                                    <strong className="mt-1 text-white">{username}</strong>
                                </div>
                            </NavDropdown.Header>

                            <NavDropdown.Divider className="my-1" />

                            <NavDropdown.Item
                                onClick={handleLogoutClick}
                                className="d-flex align-items-center text-danger"
                            >
                                <span className="me-2">🚪</span>
                                Выйти
                            </NavDropdown.Item>
                        </NavDropdown>
                    </Nav>
                </Navbar.Collapse>
            </Container>

                        <style>{`
        .nav-dropdown-custom {
          min-width: 220px;
        }
        .nav-dropdown-custom .dropdown-toggle {
          display: flex !important;
          align-items: center;
          padding: 0.375rem 0.75rem;
          border-radius: 0.375rem;
          transition: all 0.2s;
          position: relative;
        }
        .nav-dropdown-custom .dropdown-toggle::after {
          display: none;
        }
        .dropdown-arrow {
          font-size: 0.6rem;
          opacity: 0.7;
          transition: transform 0.2s;
          margin-top: 2px;
          color: rgba(255, 255, 255, 0.7);
        }
        .nav-dropdown-custom.show .dropdown-arrow {
          transform: rotate(180deg);
          color: #fff;
        }
        .nav-link {
          padding: 0.5rem 1rem;
          border-radius: 0.375rem;
          transition: all 0.2s;
        }
        .nav-link:hover, .nav-link.active {
          background-color: rgba(255, 255, 255, 0.1);
        }
        .dropdown-item {
          padding: 0.5rem 1rem;
          transition: all 0.2s;
        }
        .dropdown-item:hover {
          background-color: rgba(0, 123, 255, 0.1);
        }
        .navbar-dark .navbar-nav .nav-link {
          color: rgba(255, 255, 255, 0.85);
        }
        .navbar-dark .navbar-nav .nav-link:hover {
          color: #fff;
        }
        .navbar-dark .navbar-nav .nav-link.active {
          color: #fff;
          background-color: rgba(255, 255, 255, 0.15);
        }
        .navbar-dark .navbar-nav .dropdown-toggle:hover {
          background-color: rgba(255, 255, 255, 0.1);
          color: #fff;
        }
        .navbar-dark .navbar-nav .dropdown-toggle:hover .dropdown-arrow {
          color: #fff;
        }
        .badge-pill {
          padding: 0.25em 0.6em;
        }
        .dropdown-menu-dark {
          background-color: #343a40;
          border-color: rgba(255, 255, 255, 0.15);
        }
        .dropdown-menu-dark .dropdown-item {
          color: rgba(255, 255, 255, 0.85);
        }
        .dropdown-menu-dark .dropdown-item:hover {
          background-color: rgba(255, 255, 255, 0.1);
          color: #fff;
        }
        .dropdown-menu-dark .dropdown-header {
          color: #fff !important;
          background-color: rgba(255, 255, 255, 0.05);
        }
        .dropdown-menu-dark .dropdown-header .text-light {
          color: rgba(255, 255, 255, 0.8) !important;
        }
        .dropdown-menu-dark .dropdown-header .text-white {
          color: #fff !important;
        }
        @media (max-width: 991.98px) {
          .nav-dropdown-custom {
            min-width: auto;
          }
          .dropdown-arrow {
            margin-left: 4px;
          }
        }
      `}</style>
        </Navbar>
    );
};

export default NavbarComponent;