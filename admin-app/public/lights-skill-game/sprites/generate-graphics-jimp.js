const { Jimp } = require('jimp');
const path = require('path');

const outputDir = __dirname;

const buttons = [
    { name: 'but_exit', icon: 'X', size: 100, gradient: ['#ff6b6b', '#ee5a6f'] },
    { name: 'but_restart', icon: 'R', size: 120, gradient: ['#4ecdc4', '#44a08d'] },
    { name: 'but_restart_small', icon: 'R', size: 80, gradient: ['#4ecdc4', '#44a08d'] },
    { name: 'but_yes', icon: 'Y', size: 110, gradient: ['#51cf66', '#37b24d'] },
    { name: 'but_no', icon: 'N', size: 110, gradient: ['#ff8787', '#f03e3e'] },
    { name: 'but_home', icon: 'H', size: 110, gradient: ['#748ffc', '#5c7cfa'] },
    { name: 'but_arrow_left', icon: '<', size: 90, gradient: ['#ffd43b', '#fab005'] },
    { name: 'but_arrow_right', icon: '>', size: 90, gradient: ['#ffd43b', '#fab005'] },
    { name: 'but_play', icon: 'P', size: 110, gradient: ['#51cf66', '#37b24d'] },
    { name: 'but_next', icon: '>', size: 110, gradient: ['#ffd43b', '#fab005'] }
];

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
}

function interpolateColor(color1, color2, factor) {
    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);
    
    return {
        r: Math.round(rgb1.r + (rgb2.r - rgb1.r) * factor),
        g: Math.round(rgb1.g + (rgb2.g - rgb1.g) * factor),
        b: Math.round(rgb1.b + (rgb2.b - rgb1.b) * factor)
    };
}

async function createButton(config) {
    const size = config.size;
    const image = new Jimp(size, size, 0x00000000);
    const center = size / 2;
    const radius = size / 2 - 10;

    // Draw circle with gradient
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const dx = x - center;
            const dy = y - center;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= radius) {
                // Calculate gradient based on y position
                const gradientFactor = y / size;
                const color = interpolateColor(config.gradient[0], config.gradient[1], gradientFactor);
                
                // Add glow effect (fade at edges)
                const edgeFactor = 1 - (distance / radius);
                const glowFactor = Math.pow(edgeFactor, 0.3);
                
                // Add highlight effect (lighter at top-left)
                const highlightDist = Math.sqrt((x - center + size/6) ** 2 + (y - center + size/6) ** 2);
                const highlightFactor = Math.max(0, 1 - highlightDist / (size / 2)) * 0.3;
                
                const finalR = Math.min(255, color.r + highlightFactor * 255);
                const finalG = Math.min(255, color.g + highlightFactor * 255);
                const finalB = Math.min(255, color.b + highlightFactor * 255);
                
                // Add border
                const borderWidth = 3;
                const isBorder = distance > radius - borderWidth;
                const alpha = isBorder ? 180 : 255;
                
                const finalColor = Jimp.rgbaToInt(
                    isBorder ? 255 : finalR,
                    isBorder ? 255 : finalG,
                    isBorder ? 255 : finalB,
                    Math.round(alpha * glowFactor)
                );
                
                image.setPixelColor(finalColor, x, y);
            } else if (distance <= radius + 8) {
                // Outer glow
                const glowAlpha = Math.max(0, 1 - (distance - radius) / 8) * 100;
                const glowColor = hexToRgb(config.gradient[0]);
                image.setPixelColor(
                    Jimp.rgbaToInt(glowColor.r, glowColor.g, glowColor.b, Math.round(glowAlpha)),
                    x, y
                );
            }
        }
    }

    // Load font and print text
    const font = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
    const textSize = Math.floor(size * 0.4);
    
    // Calculate text position (centered)
    const textX = center - textSize / 2;
    const textY = center - textSize / 2;
    
    image.print(
        font,
        textX,
        textY,
        {
            text: config.icon,
            alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
            alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
        },
        size,
        size
    );

    return image;
}

async function createBackgroundGradient(width, height, name) {
    const image = new Jimp(width, height);
    
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.max(width, height) / 1.5;
    
    let colors;
    if (name === 'bg_menu') {
        colors = ['#1a1f3a', '#0f1729', '#030915'];
    } else if (name === 'bg_game') {
        colors = ['#1e2a47', '#141d33', '#030915'];
    } else {
        colors = ['#252d47', '#1a2138', '#0d1220'];
    }
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const dx = x - centerX;
            const dy = y - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const factor = Math.min(1, distance / maxRadius);
            
            let color;
            if (factor < 0.5) {
                color = interpolateColor(colors[0], colors[1], factor * 2);
            } else {
                color = interpolateColor(colors[1], colors[2], (factor - 0.5) * 2);
            }
            
            // Add subtle circuit pattern
            const patternFactor = (Math.sin(x / 50) + Math.sin(y / 50)) * 5;
            
            image.setPixelColor(
                Jimp.rgbaToInt(
                    Math.min(255, color.r + patternFactor),
                    Math.min(255, color.g + patternFactor),
                    Math.min(255, color.b + patternFactor),
                    255
                ),
                x, y
            );
        }
    }
    
    return image;
}

async function generateAll() {
    console.log('Generating button graphics...');
    
    for (const config of buttons) {
        try {
            const image = await createButton(config);
            const filename = path.join(outputDir, `${config.name}.png`);
            await image.writeAsync(filename);
            console.log(`✓ Created ${config.name}.png`);
        } catch (error) {
            console.error(`✗ Failed to create ${config.name}.png:`, error.message);
        }
    }
    
    const backgrounds = [
        { name: 'bg_menu', width: 768, height: 1400 },
        { name: 'bg_game', width: 768, height: 1400 },
        { name: 'bg_end_panel', width: 768, height: 1400 }
    ];
    
    console.log('\nGenerating background graphics...');
    
    for (const config of backgrounds) {
        try {
            const image = await createBackgroundGradient(config.width, config.height, config.name);
            const filename = path.join(outputDir, `${config.name}.jpg`);
            await image.quality(90).writeAsync(filename);
            console.log(`✓ Created ${config.name}.jpg`);
        } catch (error) {
            console.error(`✗ Failed to create ${config.name}.jpg:`, error.message);
        }
    }
    
    console.log('\n✅ All graphics generated successfully!');
}

generateAll().catch(console.error);
