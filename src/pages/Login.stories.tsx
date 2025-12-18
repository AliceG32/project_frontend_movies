import type { Meta, StoryObj } from '@storybook/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { expect, within, userEvent } from '@storybook/test'; 
import Login from './Login';

const mockStore = configureStore({
    reducer: {
        auth: () => ({
            isAuthenticated: false,
            userId: null,
            username: null,
            loading: false,
            error: null,
        }),
    },
});
const meta: Meta<typeof Login> = {
    title: 'Pages/Login',
    component: Login,
    decorators: [
        (Story) => (
            <Provider store={mockStore}>
                <MemoryRouter>
                    <Story />
                </MemoryRouter>
            </Provider>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof Login>;

export const EmptyFields: Story = {
    name: 'Пустые поля',
    args: {}, 
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const usernameInput = canvas.getByLabelText(/Имя пользователя/i);
        const passwordInput = canvas.getByLabelText(/Пароль/i);

        await userEvent.clear(usernameInput);
        await userEvent.clear(passwordInput);

        await expect(usernameInput).toHaveValue('');
        await expect(passwordInput).toHaveValue('');

        const loginButton = canvas.getByRole('button', { name: /Войти в систему/i });

        await expect(loginButton).toBeDisabled();
    },
};

export const FilledFields: Story = {
    name: 'Поля заполнены',
    args: {},
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const usernameInput = canvas.getByLabelText(/Имя пользователя/i);
        const passwordInput = canvas.getByLabelText(/Пароль/i);

        const loginButton = canvas.getByRole('button', { name: /Войти в систему/i });
        await userEvent.type(usernameInput, 'admin', { delay: 100 });
        await userEvent.type(passwordInput, 'password123', { delay: 100 });
        await expect(loginButton).toBeEnabled();
    },
};