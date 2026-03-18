const sharp = require('sharp');
const path = require('path');

const iconMappings = [
    { 
        source: 'kenney_ui/PNG/Blue/Default/icon_cross.png',
        dest: 'but_exit.png',
        size: 100
    },
    { 
        source: 'kenney_ui/PNG/Blue/Default/icon_cross.png',
        dest: 'but_no.png',
        size: 110
    },
    { 
        source: 'kenney_ui/PNG/Blue/Default/icon_checkmark.png',
        dest: 'but_yes.png',
        size: 110
    },
    { 
        source: 'kenney_ui/PNG/Blue/Default/arrow_basic_w.png',
        dest: 'but_arrow_left.png',
        size: 90
    },
    { 
        source: 'kenney_ui/PNG/Blue/Default/arrow_basic_e.png',
        dest: 'but_arrow_right.png',
        size: 90
    },
    { 
        source: 'kenney_ui/PNG/Blue/Default/arrow_basic_e.png',
        dest: 'but_next.png',
        size: 110
    },
    { 
        source: 'kenney_ui/PNG/Extra/Default/icon_play_light.png',
        dest: 'but_play.png',
        size: 110
    },
    { 
        source: 'kenney_ui/PNG/Extra/Default/icon_repeat_light.png',
        dest: 'but_restart.png',
        size: 120
    },
    { 
        source: 'kenney_ui/PNG/Extra/Default/icon_repeat_light.png',
        dest: 'but_restart_small.png',
        size: 80
    },
    { 
        source: 'kenney_ui/PNG/Blue/Default/button_round_depth_flat.png',
        dest: 'but_home.png',
        size: 110
    }
];

async function scaleIcons() {
    console.log('Scaling Kenney icons to proper button sizes...\n');
    
    for (const mapping of iconMappings) {
        try {
            const sourcePath = path.join(__dirname, mapping.source);
            const destPath = path.join('c:', 'Projects', 'quiz-engine', 'admin-app', 'modular-game-platform', 'public', 'lights-skill-game', 'sprites', mapping.dest);
            
            await sharp(sourcePath)
                .resize(mapping.size, mapping.size, {
                    fit: 'contain',
                    background: { r: 0, g: 0, b: 0, alpha: 0 }
                })
                .png()
                .toFile(destPath);
            
            console.log(`✓ Scaled ${mapping.dest} to ${mapping.size}x${mapping.size}px`);
        } catch (error) {
            console.error(`✗ Failed to scale ${mapping.dest}:`, error.message);
        }
    }
    
    console.log('\n✅ All icons scaled successfully!');
}

scaleIcons().catch(console.error);
