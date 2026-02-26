export const handleInput = (event: KeyboardEvent) => {
    switch (event.key) {
        case 'ArrowUp':
            // Logic for moving up
            break;
        case 'ArrowDown':
            // Logic for moving down
            break;
        case 'ArrowLeft':
            // Logic for moving left
            break;
        case 'ArrowRight':
            // Logic for moving right
            break;
        case 'Space':
            // Logic for action (e.g., jump, shoot)
            break;
        default:
            break;
    }
};

export const initializeControls = () => {
    window.addEventListener('keydown', handleInput);
};

export const cleanupControls = () => {
    window.removeEventListener('keydown', handleInput);
};