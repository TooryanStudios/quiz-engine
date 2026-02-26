import React from 'react';

interface ButtonProps {
    onClick: () => void;
    children: React.ReactNode;
    className?: string;
}

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
}

interface NotificationProps {
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
}

export const Button: React.FC<ButtonProps> = ({ onClick, children, className = '' }) => {
    return (
        <button onClick={onClick} className={`btn ${className}`}>
            {children}
        </button>
    );
};

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <button className="modal-close" onClick={onClose}>Close</button>
                {children}
            </div>
        </div>
    );
};

export const Notification: React.FC<NotificationProps> = ({ message, type }) => {
    return (
        <div className={`notification ${type}`}>
            {message}
        </div>
    );
};