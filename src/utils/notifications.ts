export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
    title: string;
    message: string;
    type?: ToastType;
    duration?: number;
    position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export const showToast = (options: ToastOptions): void => {
    const {
        title,
        message,
        type = 'info',
        duration = 3000,
        position = 'bottom-right'
    } = options;
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = `position-fixed ${position === 'bottom-right' ? 'bottom-0 end-0' :
            position === 'bottom-left' ? 'bottom-0 start-0' :
                position === 'top-right' ? 'top-0 end-0' : 'top-0 start-0'} p-3`;
        container.style.zIndex = '9999';
        document.body.appendChild(container);
    }
    const typeStyles = {
        success: {
            headerClass: 'bg-success text-white',
            icon: '✅',
            titleColor: 'text-white'
        },
        error: {
            headerClass: 'bg-danger text-white',
            icon: '❌',
            titleColor: 'text-white'
        },
        warning: {
            headerClass: 'bg-warning text-dark',
            icon: '⚠️',
            titleColor: 'text-dark'
        },
        info: {
            headerClass: 'bg-info text-dark',
            icon: 'ℹ️',
            titleColor: 'text-dark'
        }
    };

    const style = typeStyles[type];
    const toastId = `toast-${Date.now()}`;
    const toast = document.createElement('div');
    toast.id = toastId;
    toast.className = 'toast show mb-2';
    toast.style.minWidth = '300px';
    toast.style.maxWidth = '400px';
    toast.role = 'alert';

    toast.innerHTML = `
        <div class="toast-header ${style.headerClass}">
            <strong class="me-auto ${style.titleColor}">
                ${style.icon} ${title}
            </strong>
            <small class="${style.titleColor}">только что</small>
            <button type="button" class="btn-close ${style.titleColor === 'text-white' ? 'btn-close-white' : ''}" 
                    data-bs-dismiss="toast" aria-label="Закрыть"></button>
        </div>
        <div class="toast-body">
            ${message}
        </div>
    `;

    container.appendChild(toast);
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    toast.style.transition = 'all 0.3s ease';

    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    }, 10);
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(20px)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }
    }, duration);
    const closeBtn = toast.querySelector('.btn-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            if (toast.parentNode) {
                toast.style.opacity = '0';
                toast.style.transform = 'translateY(20px)';
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                }, 300);
            }
        });
    }
};
export const showSuccessToast = (title: string, message: string, duration?: number) => {
    showToast({ title, message, type: 'success', duration });
};

export const showErrorToast = (title: string, message: string, duration?: number) => {
    showToast({ title, message, type: 'error', duration });
};

export const showInfoToast = (title: string, message: string, duration?: number) => {
    showToast({ title, message, type: 'info', duration });
};

export const showWarningToast = (title: string, message: string, duration?: number) => {
    showToast({ title, message, type: 'warning', duration });
};