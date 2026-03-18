// Run this script in the browser console on the generate-buttons.html page
// It will automatically download all the generated graphics

(function() {
    const canvases = document.querySelectorAll('canvas');
    let delay = 0;
    
    canvases.forEach((canvas, index) => {
        setTimeout(() => {
            // Get the label text to determine filename
            const label = canvas.nextElementSibling?.textContent || `image_${index}`;
            
            // Determine filename based on label
            let filename;
            if (label.includes('Exit')) filename = 'but_exit.png';
            else if (label.includes('Restart Small')) filename = 'but_restart_small.png';
            else if (label.includes('Restart')) filename = 'but_restart.png';
            else if (label.includes('Yes')) filename = 'but_yes.png';
            else if (label.includes('No')) filename = 'but_no.png';
            else if (label.includes('Home')) filename = 'but_home.png';
            else if (label.includes('Arrow Left')) filename = 'but_arrow_left.png';
            else if (label.includes('Arrow Right')) filename = 'but_arrow_right.png';
            else if (label.includes('Play')) filename = 'but_play.png';
            else if (label.includes('Next')) filename = 'but_next.png';
            else if (label.includes('Menu Background')) filename = 'bg_menu.png';
            else if (label.includes('Game Background')) filename = 'bg_game.png';
            else if (label.includes('End Panel')) filename = 'bg_end_panel.png';
            else filename = `graphic_${index}.png`;
            
            // Convert canvas to blob and download
            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                console.log(`Downloaded: ${filename}`);
            }, 'image/png');
        }, delay);
        
        delay += 500; // 500ms delay between downloads
    });
    
    console.log(`Downloading ${canvases.length} graphics...`);
})();
