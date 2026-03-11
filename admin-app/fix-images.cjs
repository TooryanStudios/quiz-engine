const fs = require('fs');
let code = fs.readFileSync('C:/Projects/quiz-engine/admin-app/src/pages/DashboardPage.tsx', 'utf8');

// Replace top featured media
code = code.replace(
  /<div\s+className="gameplay-top-feature-media"\s+style=\{coverImage \? \{ backgroundImage: `url\("\\\$\{coverImage\}"\)` \} : \{ backgroundImage: fallbackGradient \}\}\s*\/>/g,
  `{coverImage ? (
                      <img src={coverImage} className="gameplay-top-feature-media" style={{ objectFit: 'cover', width: '100%', height: '100%' }} alt="" />
                    ) : (
                      <div className="gameplay-top-feature-media" style={{ background: fallbackGradient }} />
                    )}`
);

// Replace side featured media
code = code.replace(
  /<div\s+className="gameplay-featured-media"\s+style=\{sideCover \? \{ backgroundImage: `url\("\\\$\{sideCover\}"\)` \} : \{ backgroundImage: sideFallback \}\}\s*\/>/g,
  `{sideCover ? (
                            <img src={sideCover} className="gameplay-featured-media" style={{ objectFit: 'cover', width: '100%', height: '100%' }} alt="" />
                          ) : (
                            <div className="gameplay-featured-media" style={{ background: sideFallback }} />
                          )}`
);

// Replace curated and vertical featured media
code = code.replace(
  /<div\s+className="gameplay-featured-media"\s+style=\{coverImage \? \{ backgroundImage: `url\("\\\$\{coverImage\}"\)` \} : \{ backgroundImage: fallbackGradient \}\}\s*\/>/g,
  `{coverImage ? (
                        <img src={coverImage} className="gameplay-featured-media" style={{ objectFit: 'cover', width: '100%', height: '100%' }} alt="" />
                      ) : (
                        <div className="gameplay-featured-media" style={{ background: fallbackGradient }} />
                      )}`
);

fs.writeFileSync('C:/Projects/quiz-engine/admin-app/src/pages/DashboardPage.tsx', code);
console.log('Done!');
