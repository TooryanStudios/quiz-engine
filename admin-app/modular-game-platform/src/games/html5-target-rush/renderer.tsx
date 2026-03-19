import React from 'react';
import type { GameRendererProps } from '../../core/types';
import './renderer.css';

interface LoopState {
    targetX: number;
    targetY: number;
    velocityX: number;
    velocityY: number;
    radius: number;
    hits: number;
    misses: number;
    timeLeftSec: number;
    running: boolean;
    lastTickMs: number;
    lastHudPublishMs: number;
}

interface HudState {
    hits: number;
    misses: number;
    timeLeftSec: number;
    running: boolean;
}

const GAME_DURATION_SEC = 30;

function randomInRange(min: number, max: number): number {
    return Math.random() * (max - min) + min;
}

function createLoopState(canvasWidth: number, canvasHeight: number): LoopState {
    return {
        targetX: canvasWidth / 2,
        targetY: canvasHeight / 2,
        velocityX: randomInRange(130, 200),
        velocityY: randomInRange(100, 170),
        radius: 26,
        hits: 0,
        misses: 0,
        timeLeftSec: GAME_DURATION_SEC,
        running: true,
        lastTickMs: performance.now(),
        lastHudPublishMs: performance.now(),
    };
}

const Html5TargetRushRenderer: React.FC<GameRendererProps> = ({ gameState, dispatch, isEmbed }) => {
    const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
    const frameRef = React.useRef<number | null>(null);
    const stateRef = React.useRef<LoopState | null>(null);
    const [hud, setHud] = React.useState<HudState>({
        hits: 0,
        misses: 0,
        timeLeftSec: GAME_DURATION_SEC,
        running: true,
    });

    const syncHud = React.useCallback((runtime: LoopState) => {
        setHud({
            hits: runtime.hits,
            misses: runtime.misses,
            timeLeftSec: Math.ceil(runtime.timeLeftSec),
            running: runtime.running,
        });
    }, []);

    const resetRuntime = React.useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) {
            return;
        }

        stateRef.current = createLoopState(canvas.width, canvas.height);
        if (stateRef.current) {
            syncHud(stateRef.current);
        }
        dispatch({ type: 'reset', note: 'Runtime reset' });
    }, [dispatch, syncHud]);

    React.useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) {
            return;
        }

        const context = canvas.getContext('2d');
        if (!context) {
            return;
        }

        const resize = () => {
            const dpr = window.devicePixelRatio || 1;
            const maxWidth = Math.min(window.innerWidth - 32, 920);
            const targetWidth = Math.max(280, maxWidth);
            const targetHeight = Math.min(Math.max(360, Math.round(window.innerHeight * 0.62)), 520);

            canvas.style.width = `${targetWidth}px`;
            canvas.style.height = `${targetHeight}px`;
            canvas.width = Math.floor(targetWidth * dpr);
            canvas.height = Math.floor(targetHeight * dpr);
            context.setTransform(dpr, 0, 0, dpr, 0, 0);

            stateRef.current = createLoopState(targetWidth, targetHeight);
            if (stateRef.current) {
                syncHud(stateRef.current);
            }
        };

        resize();
        window.addEventListener('resize', resize);

        const renderFrame = (nowMs: number) => {
            const runtime = stateRef.current;
            if (!runtime) {
                frameRef.current = requestAnimationFrame(renderFrame);
                return;
            }

            const deltaSec = Math.min(0.06, (nowMs - runtime.lastTickMs) / 1000);
            runtime.lastTickMs = nowMs;

            if (runtime.running) {
                runtime.timeLeftSec = Math.max(0, runtime.timeLeftSec - deltaSec);
                if (runtime.timeLeftSec <= 0) {
                    runtime.running = false;
                    dispatch({ type: 'advance', note: 'Target Rush complete' });
                }

                runtime.targetX += runtime.velocityX * deltaSec;
                runtime.targetY += runtime.velocityY * deltaSec;

                const width = canvas.clientWidth;
                const height = canvas.clientHeight;

                if (runtime.targetX - runtime.radius <= 0 || runtime.targetX + runtime.radius >= width) {
                    runtime.velocityX *= -1;
                }

                if (runtime.targetY - runtime.radius <= 0 || runtime.targetY + runtime.radius >= height) {
                    runtime.velocityY *= -1;
                }

                runtime.targetX = Math.max(runtime.radius, Math.min(width - runtime.radius, runtime.targetX));
                runtime.targetY = Math.max(runtime.radius, Math.min(height - runtime.radius, runtime.targetY));
            }

            if (nowMs - runtime.lastHudPublishMs > 120) {
                runtime.lastHudPublishMs = nowMs;
                syncHud(runtime);
            }

            const width = canvas.clientWidth;
            const height = canvas.clientHeight;

            const background = context.createLinearGradient(0, 0, width, height);
            background.addColorStop(0, '#e8f5cf');
            background.addColorStop(1, '#cae7ff');
            context.fillStyle = background;
            context.fillRect(0, 0, width, height);

            context.strokeStyle = 'rgba(19, 42, 56, 0.16)';
            for (let x = 0; x < width; x += 40) {
                context.beginPath();
                context.moveTo(x, 0);
                context.lineTo(x, height);
                context.stroke();
            }
            for (let y = 0; y < height; y += 40) {
                context.beginPath();
                context.moveTo(0, y);
                context.lineTo(width, y);
                context.stroke();
            }

            context.beginPath();
            context.arc(runtime.targetX, runtime.targetY, runtime.radius, 0, Math.PI * 2);
            context.fillStyle = '#ed6a5e';
            context.fill();
            context.lineWidth = 4;
            context.strokeStyle = '#1f2a30';
            context.stroke();

            context.beginPath();
            context.arc(runtime.targetX, runtime.targetY, runtime.radius * 0.4, 0, Math.PI * 2);
            context.fillStyle = '#fff7d6';
            context.fill();

            frameRef.current = requestAnimationFrame(renderFrame);
        };

        frameRef.current = requestAnimationFrame(renderFrame);

        return () => {
            if (frameRef.current !== null) {
                cancelAnimationFrame(frameRef.current);
            }
            window.removeEventListener('resize', resize);
        };
    }, [dispatch, syncHud]);

    const onCanvasClick = React.useCallback(
        (event: React.MouseEvent<HTMLCanvasElement>) => {
            const runtime = stateRef.current;
            const canvas = canvasRef.current;
            if (!runtime || !canvas || !runtime.running) {
                return;
            }

            const bounds = canvas.getBoundingClientRect();
            const clickX = event.clientX - bounds.left;
            const clickY = event.clientY - bounds.top;
            const distance = Math.hypot(clickX - runtime.targetX, clickY - runtime.targetY);

            if (distance <= runtime.radius) {
                runtime.hits += 1;
                runtime.targetX = randomInRange(runtime.radius, canvas.clientWidth - runtime.radius);
                runtime.targetY = randomInRange(runtime.radius, canvas.clientHeight - runtime.radius);
                runtime.velocityX += randomInRange(-20, 20);
                runtime.velocityY += randomInRange(-20, 20);

                dispatch({ type: 'submit', success: true, note: `Hit ${runtime.hits}` });
                if (runtime.hits % 5 === 0) {
                    dispatch({ type: 'advance', note: `Milestone ${runtime.hits}` });
                }
            } else {
                runtime.misses += 1;
                dispatch({ type: 'hint', note: `Miss ${runtime.misses}` });
            }

            syncHud(runtime);
        },
        [dispatch, syncHud],
    );

    const accuracy = hud.hits + hud.misses === 0
        ? 100
        : Math.round((hud.hits / (hud.hits + hud.misses)) * 100);

    return (
        <div className="target-rush-page">
            {!isEmbed && (
                <div className="target-rush-topbar">
                    <div>
                        <h2>Target Rush</h2>
                        <p>Tap or click the moving target before time runs out.</p>
                    </div>
                    <button className="target-rush-reset" onClick={resetRuntime}>إعادة تشغيل</button>
                </div>
            )}

            <div className="target-rush-hud">
                <div className="stat-card">
                    <strong>{hud.timeLeftSec}s</strong>
                    <span>الوقت المتبقي</span>
                </div>
                <div className="stat-card">
                    <strong>{hud.hits}</strong>
                    <span>الإصابات</span>
                </div>
                <div className="stat-card">
                    <strong>{accuracy}%</strong>
                    <span>الدقة</span>
                </div>
                <div className="stat-card">
                    <strong>{gameState.score}</strong>
                    <span>النقاط</span>
                </div>
            </div>

            <canvas
                ref={canvasRef}
                className="target-rush-canvas"
                onClick={onCanvasClick}
            />

            <div className="target-rush-meta">
                <span>الجولة {gameState.round} / {gameState.totalRounds}</span>
                <span>التلميحات المستخدمة: {gameState.hintsUsed}</span>
                <span>قيد التشغيل: {hud.running ? 'نعم' : 'لا'}</span>
            </div>
        </div>
    );
};

export default Html5TargetRushRenderer;
