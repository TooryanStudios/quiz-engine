import React, { useEffect, useState } from 'react';
import { vfx, type VFXConfig } from '../lib/vfx';

// This is a minimal implementation. In a real app, you can use canvas, 
// libraries like 'canvas-confetti', or CSS animations.
export const VFXContainer: React.FC = () => {
    const [activeVfxs, setActiveVfxs] = useState<(VFXConfig & { id: number })[]>([]);

    useEffect(() => {
        let counter = 0;
        const unsubscribe = vfx.subscribe((config) => {
            const id = ++counter;
            const newVfx = { ...config, id };
            setActiveVfxs(prev => [...prev, newVfx]);

            // For non-persistent VFX, remove them after duration
            if (config.duration) {
                setTimeout(() => {
                    setActiveVfxs(prev => prev.filter(v => v.id !== id));
                }, config.duration);
            }
        });

        return () => {
            unsubscribe();
        };
    }, []);

    const renderVFX = (v: VFXConfig & { id: number }) => {
        // Shared container styles based on position
        const style: React.CSSProperties = {
            position: 'fixed',
            pointerEvents: 'none',
            zIndex: 9999,
        };

        if (v.position) {
            style.left = `${v.position.x}px`;
            style.top = `${v.position.y}px`;
        } else {
            // Default center or full screen
            style.left = '50%';
            style.top = '50%';
            style.transform = 'translate(-50%, -50%)';
        }

        switch (v.type) {
            case 'floatText':
                return (
                    <div
                        key={v.id}
                        className="vfx-float-text"
                        style={{
                            ...style,
                            color: typeof v.color === 'string' ? v.color : '#fff',
                            fontWeight: 'bold',
                            fontSize: '1.5rem',
                        }}
                    >
                        {v.payload?.text}
                    </div>
                );
            case 'shake':
                // For shake, we might want to shake the app-container instead
                // But for now, just a placeholder
                return null;
            case 'confetti':
                // Note: Confetti usually uses canvas-confetti library
                // We just mark its presence here if we want a React component to handle it
                return null; 
            default:
                return null;
        }
    };

    return (
        <div className="vfx-stage-portal">
            {activeVfxs.map(renderVFX)}
            <style>{`
                .vfx-float-text {
                    animation: vfxFloatUp 1s ease-out forwards;
                }
                @keyframes vfxFloatUp {
                    0% { opacity: 1; transform: translateY(0); }
                    100% { opacity: 0; transform: translateY(-50px); }
                }

                @keyframes vfxShake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
                .vfx-shaking {
                    animation: vfxShake 0.1s infinite;
                }
            `}</style>
        </div>
    );
};
