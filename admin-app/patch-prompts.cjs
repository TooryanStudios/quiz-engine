const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, 'src/pages/ToorGenLabPage/ToorGenPromptWorkbench.tsx');
let content = fs.readFileSync(target, 'utf-8');

const replacements = {
  'text-to-video': {
    promptTemplate: 'Wisam + [action with the magical book] + [his room] + [animation style/emotion]',
    examplePrompt: 'Wisam stands inside his messy room, jumping backward into a complex backflip as the magical book flies toward him. He acts surprised and afraid, dodging its glowing pages as small germs crawl across his computer screen in the background.',
    documentPrompt: 'Create a dynamic indoor action scene focusing on Wisam in his room. He is locked in a fast-paced, high-energy fight with a flying, sentient magical book. The animation should showcase complex acrobatics like a backflip dodge, capturing his expression of sudden fear and surprise. On a desk in the background, a few tiny germs can be seen moving across a glowing computer screen.'
  },
  'image-to-video': {
    promptTemplate: 'Use Image 1. Keep Wisam inside his room while adding [fight action / jump / flip].',
    examplePrompt: 'Use Image 1 as the reference. Start on Wisam in his room, then he suddenly leaps onto his bed, dodging the magical book that lunges at him. He looks excited and happy during the mid-air acrobatic flip.',
    documentPrompt: 'Use Image 1 to anchor the visual of Wisam in his bedroom. Add dynamic, complex motion as he engages in a playful fight with his magical book. He performs an impressive acrobatic jump onto his bed, looking happy and thrilled. Ensure the animation highlights fluid body mechanics and the book’s aggressive but playful swooping motion.'
  },
  'video-to-video': {
    promptTemplate: 'Use Video 1. Preserve [Wisam room layout] and change [book attack motion / acrobatics].',
    examplePrompt: 'Use Video 1 as the source. Keep Wisam’s room and original lighting, but transform the action so he performs a complex backflip over the magical book. The germs on his desktop paper should react to the motion.',
    documentPrompt: 'Use Video 1 as the source clip. Preserve the framing and environmental details of Wisam’s bedroom. Alter the core action to feature an exaggerated, highly animated fighting sequence where Wisam evades the magical book with a backward flip. Include tiny details like 2D germs drawn on piece of paper on his desk shivering from the impact.'
  },
  'text-rendering-slogans': {
    promptTemplate: '[Wisam room scene] + render the exact slogan + [reaction] + [style]',
    examplePrompt: 'Wisam mid-jump in his room dodging the book. Render the words "The Fight Begins" in the center, appearing with dynamic fast timing, comic book action style.',
    documentPrompt: 'Create an action-packed scene of Wisam inside his bedroom fighting a hovering magical book. He is frozen in a defensive stance, looking somewhat fearful. Render the exact slogan "The Fight Begins" forcefully appearing in the center of the frame, using a bold, dynamic comic-book font that matches the intense animation style.'
  },
  'text-rendering-subtitles': {
    promptTemplate: '[Wisam room scene] + render subtitles at [position] + time to [action/speech].',
    examplePrompt: 'Wisam argues with the flying book in his room. Render the subtitle "Stop chasing me!" at the bottom center, timed with his panicked backward step.',
    documentPrompt: 'Set the scene inside Wisam’s room where he is verbally arguing with the magical book hovering aggressively in front of him. He is panting and afraid. Render the exact subtitle "Stop chasing me!" at the bottom center. Ensure the subtitle timing corresponds exactly to his frantic movement and facial cadence.'
  },
  'text-rendering-speech-bubbles': {
    promptTemplate: '[Wisam room fight] + render a speech bubble + [placement] + [bubble style]',
    examplePrompt: 'Wisam looks confident and happy mid-backflip. Add a speech bubble near him that says "Missed me!" with a sharp, explosive comic aesthetic.',
    documentPrompt: 'Frame an intense acrobatic moment in Wisam’s room where he successfully backflips away from the magical book. He has a triumphant, happy expression. Add an explosive-style comic speech bubble near his head containing the exact text "Missed me!". Ensure the bubble fits the dynamic, complex animation aesthetic.'
  },
  'image-reference-subject': {
    promptTemplate: 'Use Image 1 as Wisam. Generate [new fight sequence in his room].',
    examplePrompt: 'Use Image 1 to maintain Wisam’s design. Generate a scene in his bedroom where he is playfully sparring with the magical book, demonstrating complex footwork and a happy smile.',
    documentPrompt: 'Use Image 1 exclusively to preserve the character design of Wisam. Place him inside a cluttered bedroom environment. Animate a highly complex sequence showcasing his agility as he dodges and weaves around the flying magical book, maintaining a joyful, excited expression throughout the fast-paced motion.'
  },
  'image-reference-multi': {
    promptTemplate: 'Use Image 1 for Wisam and Image 2 for [the book]. Combine them in a [room fight scenario].',
    examplePrompt: 'Use Image 1 for Wisam and Image 2 for the magical book. Show the book aggressively flying at him inside his room while he frantically flips backward in fear.',
    documentPrompt: 'Blend Image 1 (Wisam) and Image 2 (the magical book). Establish the setting inside his bedroom. Create a high-intensity animation where the book launches a sudden attack, forcing Wisam to perform a desperate, complex backflip to avoid it. His expression should read as pure panic, capturing advanced acrobatic physics.'
  },
  'image-reference-sequence': {
    promptTemplate: 'Use Images 1-3 to guide the sequence of a [room fight and acrobatics].',
    examplePrompt: 'Use Images 1 to 3 to map the choreography. Wisam starts on the floor, jumps onto his desk, and backflips to dodge the book, looking terrified then relieved.',
    documentPrompt: 'Utilize the provided image sequence to direct a complex combat animation inside Wisam’s room. He begins cornered on the floor, vaults onto his desk—disturbing a glowing computer screen showing small germs—and executes a dramatic backflip to evade the magical book. The character should transition dynamically from intense fear to breathless relief.'
  },
  'video-reference-motion': {
    promptTemplate: 'Extract motion from Video 1. Apply it to Wisam fighting the book in his room.',
    examplePrompt: 'Use Video 1 for the jumping choreography. Apply it to Wisam inside his bedroom as he performs a massive leaping dodge away from the magical book with a terrified face.',
    documentPrompt: 'Extract only the acrobatic motion data from Video 1. Map this complex jumping and flipping movement onto Wisam inside his bedroom environment. As he executes the motion, position the magical book as the aggressor he is dodging, and animate his face to express genuine fear of the flying object.'
  },
  'video-reference-camera': {
    promptTemplate: 'Use Video 1 for camera path. Frame [Wisam dodging the book in his room].',
    examplePrompt: 'Follow the energetic orbit of Video 1. Show Wisam in the center of his room performing a backflip over the charging magical book with a joyful expression.',
    documentPrompt: 'Replicate the aggressive, swirling camera move found in Video 1. The focus of the shot must be Wisam executing a highly skilled backflip directly over the attacking magical book. Keep the scene confined to his bedroom. His face should display happy, confident energy as he shows off his acrobatic abilities.'
  },
  'video-reference-vfx': {
    promptTemplate: 'Use Video 1 for magical/lighting effects. Apply them to [the book attacking Wisam in his room].',
    examplePrompt: 'Take the particle glow from Video 1. Attach it to the magical book as it chases Wisam through his room, causing him to dive out of the way in panic.',
    documentPrompt: 'Isolate the magical VFX from Video 1 and apply them to the sentient book in Wisam’s room. As the glowing, chaotic book swoops through the air, animate Wisam performing a complex, panicked diving maneuver to get out of the way, knocking over papers with little germ doodles on them.'
  },
  'video-edit-elements': {
    promptTemplate: 'Use Video 1. Replace or insert [an element] into [Wisam room fight].',
    examplePrompt: 'Use Video 1 as the base fight. Replace the background object with a computer monitor displaying crawling germs while Wisam happily flips away from the book.',
    documentPrompt: 'Edit the base footage of Wisam’s acrobatic room fight. Insert a computer monitor clearly into the background of his bedroom, displaying active, squirming microscopic germs. Do not alter Wisam’s joyful backflip or the flying magical book’s trajectory.'
  },
  'video-edit-extend': {
    promptTemplate: 'Extend Video 1 by adding [next acrobatic move in the room fight].',
    examplePrompt: 'Continue Video 1. After Wisam lands, the book swings back around, forcing him to do a complex backward flip in fear.',
    documentPrompt: 'Take the ending of Video 1 and logically extend the animation inside the bedroom. As soon as Wisam lands his initial dodge, the magical book rebounds for a second attack. Wisam must immediately string together a complex backflip, his face shifting to genuine panic as the fight continues.'
  },
  'video-edit-track': {
    promptTemplate: 'Use Video 1 to track [text/germs] onto [a surface in Wisam room].',
    examplePrompt: 'Track Video 1’s monitor. Overlay moving germs on the computer screen while Wisam fights the book in the foreground.',
    documentPrompt: 'Perform a precise surface track on the computer screen present in Wisam’s bedroom from Video 1. Composite a layer of moving, animated germs onto the screen so they stay locked during the camera movement. The foreground action—Wisam’s complex fight with the magical book—should remain untouched.'
  }
};

let match;
const regex = /id:\s*'([a-zA-Z0-9-]+)',([\s\S]*?)promptTemplate:\s*'([^']*)',([\s\S]*?)examplePrompt:\s*'([^']*)',([\s\S]*?)documentPrompt:\s*'([^']*)',/g;

content = content.replace(regex, (full, id, gap1, pTemp, gap2, eProm, gap3, dProm) => {
  if (replacements[id]) {
    return `id: '${id}',${gap1}promptTemplate: '${replacements[id].promptTemplate}',${gap2}examplePrompt: '${replacements[id].examplePrompt}',${gap3}documentPrompt: '${replacements[id].documentPrompt}',`;
  }
  return full;
});

fs.writeFileSync(target, content);
console.log('Patched templates');
