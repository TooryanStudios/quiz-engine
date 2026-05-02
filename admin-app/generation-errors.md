

## Problem Description
The main problem I have now is that when we generate videos it doesn't use the reference images to guide the generation about the art style the character the location the mood board and the color It doesn't follow the  references for the generations

## Error Messages
There is no error message but the generated video didn't even follow the art style and the reference images that we attached

## Steps to Reproduce
The error happens with the jason file that we are sending to the API there the problem not because of the API itself because of how our software send the jason file and how did it structure it

## Expected Behavior
The expected behavior is to get a video using my own characters and my allocations not something generated randomly 

---
## Example of working generation
Example of working generation:
Continuity lock for the full clip: keep one consistent character identity (face geometry, age, hair, outfit, key props) across every shot and camera change unless explicitly changed in the prompt.
Do not drift visual style between shots. Keep one coherent style, palette, and world design for the entire clip.
Use image references throughout the full clip for consistency, not only the opening frame.

Reference routing:
- [Image1] is the source-frame/scene anchor.
- Wisam: [Image1], [Image2]

anamorphic, multi-shot cinematic, ARRI ALEXA, heavy 35mm film grain, photorealistic, extreme depth of field, Dutch angles, whip-pan transitions, crash rack focus pulls, amber warm window light vs cold blue desk lamp split tone, vignette crush, lens breathing, handheld drift. Secondary motion throughout: drifting dust particles, rolling pencils at desk edge, pages lifting from breath, poster corners curling, lamp flicker, fabric shift on clothing, loose sheets sliding, pencil vibrating from surface contact.

Prompt note (1-6):

Segment 2/2. Generate only Shot 4 through Shot 6 and keep continuity with prior segments.

Shot 4 (28mm, handheld over-shoulder): Hands dominate foreground. Room bends behind. Hair moves. "The rules have to be clear…"

Shot 5 (100mm macro, desk-level rack focus): Each page flip sends vibrations through the stack. "The gems can't just be rewards…"

Shot 6 (40mm, slow push Dutch): Face emerges from soft focus. Poster sways behind. Page slides off stack. "They need a real role."

Story bible constraints: { "projectRules": "Cinematic short documentary style. Camera always feels intentional — every lens choice and movement serves character psychology. No random cuts. Secondary motion must always be present in background an

Characters:
- 1. Wisam

Render settings:
- quality: 720p
- audio: on

API payload:
{
  "prompt": "Continuity lock for the full clip: keep one consistent character identity (face geometry, age, hair, outfit, key props) across every shot and camera change unless explicitly changed in the prompt.\nDo not drift visual style between shots. Keep one coherent style, palette, and world design for the entire clip.\nUse image references throughout the full clip for consistency, not only the opening frame.\n\nReference routing:\n- [Image1] is the source-frame/scene anchor.\n- Wisam: [Image1], [Image2]\n\nanamorphic, multi-shot cinematic, ARRI ALEXA, heavy 35mm film grain, photorealistic, extreme depth of field, Dutch angles, whip-pan transitions, crash rack focus pulls, amber warm window light vs cold blue desk lamp split tone, vignette crush, lens breathing, handheld drift. Secondary motion throughout: drifting dust particles, rolling pencils at desk edge, pages lifting from breath, poster corners curling, lamp flicker, fabric shift on clothing, loose sheets sliding, pencil vibrating from surface contact.\n\nPrompt note (1-6):\n\nSegment 2/2. Generate only Shot 4 through Shot 6 and keep continuity with prior segments.\n\nShot 4 (28mm, handheld over-shoulder): Hands dominate foreground. Room bends behind. Hair moves. \"The rules have to be clear…\"\n\nShot 5 (100mm macro, desk-level rack focus): Each page flip sends vibrations through the stack. \"The gems can't just be rewards…\"\n\nShot 6 (40mm, slow push Dutch): Face emerges from soft focus. Poster sways behind. Page slides off stack. \"They need a real role.\"\n\nStory bible constraints: { \"projectRules\": \"Cinematic short documentary style. Camera always feels intentional — every lens choice and movement serves character psychology. No random cuts. Secondary motion must always be present in background an\n\nCharacters:\n- 1. Wisam\n\nRender settings:\n- quality: 720p\n- audio: on",
  "model": "seedance-2.0-fast",
  "duration": 5,
  "aspect_ratio": "16:9",
  "images": [
    "https://firebasestorage.googleapis.com/v0/b/qyan-om.firebasestorage.app/o/seedance-references%2F1777321928143-2x1gcefpv4a.jpg?alt=media&token=5b47c47a-80f1-44c7-b2ca-1a166bcdf421",
    "https://firebasestorage.googleapis.com/v0/b/qyan-om.firebasestorage.app/o/seedance-references%2F1777321965705-c1nwvr1qhgp.jpg?alt=media&token=7befa2bf-22f8-43c9-8c40-d555465f762c"
  ]
}




## Example of non-working generation
Example of non-working generation:

anamorphic, multi-shot cinematic, ARRI ALEXA, heavy 35mm film grain, photorealistic, extreme depth of field, Dutch angles, whip-pan transitions, crash rack focus pulls, amber warm window light vs cold blue desk lamp split tone, vignette crush, lens breathing, handheld drift. Secondary motion throughout: drifting dust particles, rolling pencils at desk edge, pages lifting from breath, poster corners curling, lamp flicker, fabric shift on clothing, loose sheets sliding, pencil vibrating from surface contact.

Prompt note (1-6): 
Shot 1 (14mm ultra-wide, extreme low angle, creeping push-in): Room warps at edges. Posters tower. Papers flutter. Dust drifts through light shaft.

Shot 2 (50mm anamorphic, whip-glide, crash rack focus): Posters snap in and out of focus. Pages curl. Marker rolls. Sketches breathe.

Shot 3 (135mm macro, Dutch tilt, rapid cuts): Gems saturated, symbols abstract. Pages lift from breath. Pencil vibrates. Fingers tap twice and freeze.

Shot 4 (28mm, handheld over-shoulder): Hands dominate foreground. Room bends behind. Hair moves. "The rules have to be clear…"

Shot 5 (100mm macro, desk-level rack focus): Each page flip sends vibrations through the stack. "The gems can't just be rewards…"

Shot 6 (40mm, slow push Dutch): Face emerges from soft focus. Poster sways behind. Page slides off stack. "They need a real role."


API payload:
{
  "prompt": "anamorphic, multi-shot cinematic, ARRI ALEXA, heavy 35mm film grain, photorealistic, extreme depth of field, Dutch angles, whip-pan transitions, crash rack focus pulls, amber warm window light vs cold blue desk lamp split tone, vignette crush, lens breathing, handheld drift. Secondary motion throughout: drifting dust particles, rolling pencils at desk edge, pages lifting from breath, poster corners curling, lamp flicker, fabric shift on clothing, loose sheets sliding, pencil vibrating from surface contact.\n\nPrompt note (1-6): \nShot 1 (14mm ultra-wide, extreme low angle, creeping push-in): Room warps at edges. Posters tower. Papers flutter. Dust drifts through light shaft.\n\nShot 2 (50mm anamorphic, whip-glide, crash rack focus): Posters snap in and out of focus. Pages curl. Marker rolls. Sketches breathe.\n\nShot 3 (135mm macro, Dutch tilt, rapid cuts): Gems saturated, symbols abstract. Pages lift from breath. Pencil vibrates. Fingers tap twice and freeze.\n\nShot 4 (28mm, handheld over-shoulder): Hands dominate foreground. Room bends behind. Hair moves. \"The rules have to be clear…\"\n\nShot 5 (100mm macro, desk-level rack focus): Each page flip sends vibrations through the stack. \"The gems can't just be rewards…\"\n\nShot 6 (40mm, slow push Dutch): Face emerges from soft focus. Poster sways behind. Page slides off stack. \"They need a real role.\"",
  "model": "seedance-2.0-fast",
  "duration": 5,
  "aspect_ratio": "16:9",
  "images": [
    "https://firebasestorage.googleapis.com/v0/b/qyan-om.firebasestorage.app/o/seedance-references%2F1777321928143-2x1gcefpv4a.jpg?alt=media&token=5b47c47a-80f1-44c7-b2ca-1a166bcdf421",
    "https://firebasestorage.googleapis.com/v0/b/qyan-om.firebasestorage.app/o/seedance-references%2F1777321951969-3a3inm63ohg.jpg?alt=media&token=646c58bc-5403-48cb-bcc0-4384100a0cc4",
    "https://firebasestorage.googleapis.com/v0/b/qyan-om.firebasestorage.app/o/seedance-references%2F1777321965705-c1nwvr1qhgp.jpg?alt=media&token=7befa2bf-22f8-43c9-8c40-d555465f762c"
  ]
}
