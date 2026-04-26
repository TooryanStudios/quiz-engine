const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const outputDir = __dirname;

const buttons = [
    { name: 'but_exit', icon: '✕', size: 100, gradient: ['#ff6b6b', '#ee5a6f'] },
    { name: 'but_restart', icon: '↻', size: 120, gradient: ['#4ecdc4', '#44a08d'] },
    { name: 'but_restart_small', icon: '↻', size: 80, gradient: ['#4ecdc4', '#44a08d'] },
    { name: 'but_yes', icon: '✓', size: 110, gradient: ['#51cf66', '#37b24d'] },
    { name: 'but_no', icon: '✕', size: 110, gradient: ['#ff8787', '#f03e3e'] },
    { name: 'but_home', icon: '⌂', size: 110, gradient: ['#748ffc', '#5c7cfa'] },
    { name: 'but_arrow_left', icon: '◀', size: 90, gradient: ['#ffd43b', '#fab005'] },
    { name: 'but_arrow_right', icon: '▶', size: 90, gradient: ['#ffd43b', '#fab005'] },
    { name: 'but_play', icon: '▶', size: 110, gradient: ['#51cf66', '#37b24d'] },
    { name: 'but_next', icon: '→', size: 110, gradient: ['#ffd43b', '#fab005'] }
];

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function createButton(config) {
    const canvas = createCanvas(config.size, config.size);
    const ctx = canvas.getContext('2d');
    const size = config.size;

    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, size);
    gradient.addColorStop(0, config.gradient[0]);
    gradient.addColorStop(1, config.gradient[1]);

    // Draw outer glow
    ctx.shadowColor = config.gradient[0];
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Draw circle background
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 10, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw inner highlight
    ctx.shadowBlur = 0;
    const highlightGradient = ctx.createRadialGradient(
        size / 2 - size / 6, size / 2 - size / 6, 0,
        size / 2, size / 2, size / 2
    );
    highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 10, 0, Math.PI * 2);
    ctx.fillStyle = highlightGradient;
    ctx.fill();

    // Draw border
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 10, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw icon
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${size * 0.5}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 5;
    
    // Adjust position for arrow symbols to center them properly
    let offsetX = 0;
    let offsetY = 0;
    if (config.icon === '◀') {
        offsetX = -size * 0.02;
    } else if (config.icon === '▶') {
        offsetX = size * 0.02;
    } else if (config.icon === '→') {
        offsetY = size * 0.01;
    }
    
    ctx.fillText(config.icon, size / 2 + offsetX, size / 2 + offsetY);

    return canvas;
}

function createBackgroundGradient(width, height, name) {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Create radial gradient from center
    const gradient = ctx.createRadialGradient(
        width / 2, height / 2, 0,
        width / 2, height / 2, Math.max(width, height) / 1.5
    );
    
    if (name === 'bg_menu') {
        gradient.addColorStop(0, '#1a1f3a');
        gradient.addColorStop(0.5, '#0f1729');
        gradient.addColorStop(1, '#030915');
    } else if (name === 'bg_game') {
        gradient.addColorStop(0, '#1e2a47');
        gradient.addColorStop(0.5, '#141d33');
        gradient.addColorStop(1, '#030915');
    } else {
        gradient.addColorStop(0, '#252d47');
        gradient.addColorStop(0.5, '#1a2138');
        gradient.addColorStop(1, '#0d1220');
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Add subtle circuit pattern overlay
    ctx.strokeStyle = 'rgba(100, 150, 255, 0.05)';
    ctx.lineWidth = 2;
    
    for (let i = 0; i < 20; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const size = 50 + Math.random() * 100;
        
        ctx.strokeRect(x, y, size, size);
        ctx.beginPath();
        ctx.moveTo(x + size / 2, y);
        ctx.lineTo(x + size / 2, y + size);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y + size / 2);
        ctx.lineTo(x + size, y + size / 2);
        ctx.stroke();
    }

    return canvas;
}

// Generate buttons
console.log('Generating button graphics...');
buttons.forEach(config => {
    const canvas = createButton(config);
    const buffer = canvas.toBuffer('image/png');
    const filename = path.join(outputDir, `${config.name}.png`);
    fs.writeFileSync(filename, buffer);
    console.log(`✓ Created ${config.name}.png`);
});

// Generate backgrounds
const backgrounds = [
    { name: 'bg_menu', width: 768, height: 1400 },
    { name: 'bg_game', width: 768, height: 1400 },
    { name: 'bg_end_panel', width: 768, height: 1400 }
];

console.log('\nGenerating background graphics...');
backgrounds.forEach(config => {
    const canvas = createBackgroundGradient(config.width, config.height, config.name);
    const buffer = canvas.toBuffer('image/jpeg', { quality: 0.9 });
    const filename = path.join(outputDir, `${config.name}.jpg`);
    fs.writeFileSync(filename, buffer);
    console.log(`✓ Created ${config.name}.jpg`);
});

console.log('\n✅ All graphics generated successfully!');
