$file = "C:\Projects\quiz-engine\public\js\game.js"
$c = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)

# 1. Expose state and key functions on window for debug tools
$oldEnd = @"
if (!document.querySelector('.view.active')) {
  showView('view-home');
  updateDiagnose({ event: 'startup:view_recovered', error: 'Recovered from empty active view' });
}"@
$newEnd = @"
if (!document.querySelector('.view.active')) {
  showView('view-home');
  updateDiagnose({ event: 'startup:view_recovered', error: 'Recovered from empty active view' });
}

// ── Expose debug surface on window (v54) ──────────────────────────────────
// Allows the inline debug bar buttons to call these directly.
window._qState = state;
window._renderHostQuestion = renderHostQuestion;
window._renderPlayerQuestion = renderPlayerQuestion;
window._showView = showView;
console.log('[game.js v54] Debug surface exposed: window._qState, window._renderHostQuestion');
"@

$c2 = $c.Replace($oldEnd, $newEnd)
if ($c2 -eq $c) {
    Write-Host "ERROR: end-of-file anchor not found. Length $($c.Length) vs $($c2.Length)"
    # Try with \r\n
    $oldEnd2 = $oldEnd -replace "`n", "`r`n"
    $c2 = $c.Replace($oldEnd2, $newEnd)
    if ($c2 -eq $c) { Write-Host "Also failed with CRLF. Trying indexOf..."; $idx = $c.IndexOf("Recovered from empty active view"); Write-Host "indexOf=$idx"; exit 1 }
    else { Write-Host "SUCCESS with CRLF version" }
} else {
    Write-Host "SUCCESS: End-of-file anchor replaced"
}

# 2. Add console.log trace to renderHostQuestion (at entry and exit)
$oldRender = "function renderHostQuestion(data) {`r`n  try {`r`n    if (!data || !data.question) {"
$newRender = "function renderHostQuestion(data) {`r`n  try {`r`n    console.log('[v54] renderHostQuestion called, data:', JSON.stringify(data).substring(0,120));`r`n    if (window.__dbgLog) window.__dbgLog('renderHostQ start type=' + (data && data.question ? data.question.type : 'NO-DATA'));`r`n    if (!data || !data.question) {"
$c3 = $c2.Replace($oldRender, $newRender)
if ($c3 -eq $c2) {
    # Try Unix line endings
    $oldRenderUnix = "function renderHostQuestion(data) {`n  try {`n    if (!data || !data.question) {"
    $newRenderUnix = "function renderHostQuestion(data) {`n  try {`n    console.log('[v54] renderHostQuestion called, data:', JSON.stringify(data).substring(0,120));`n    if (window.__dbgLog) window.__dbgLog('renderHostQ start type=' + (data && data.question ? data.question.type : 'NO-DATA'));`n    if (!data || !data.question) {"
    $c3 = $c2.Replace($oldRenderUnix, $newRenderUnix)
    if ($c3 -eq $c2) { Write-Host "WARNING: renderHostQuestion anchor not found, skipping trace injection" }
    else { Write-Host "SUCCESS: renderHostQuestion trace injected (Unix LF)" }
} else {
    Write-Host "SUCCESS: renderHostQuestion trace injected (CRLF)"
}

[System.IO.File]::WriteAllText($file, $c3, [System.Text.Encoding]::UTF8)
Write-Host "game.js saved. Line count: $(($c3 -split "`n").Count)"
