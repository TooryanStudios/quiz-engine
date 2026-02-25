$file = "C:\Projects\quiz-engine\public\index.html"
$c = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)

$oldAnchor = "      dbg.appendChild(btnWrap);`r`n      document.body.appendChild(dbg);"
$oldAnchorUnix = "      dbg.appendChild(btnWrap);`n      document.body.appendChild(dbg);"

$insertion = @"

      // ── Separator
      var sep = document.createElement('span');
      sep.style.cssText = 'color:#444;padding:0 2px;';
      sep.textContent = '|';
      dbg.appendChild(sep);

      // ── Fake-Q button: calls renderHostQuestion with test data ──
      var fakeBtn = document.createElement('button');
      fakeBtn.textContent = 'TEST-Q';
      fakeBtn.style.cssText = 'background:#1a1a3a;color:#88f;border:1px solid #44f;padding:2px 5px;font-size:9px;cursor:pointer;border-radius:3px;';
      fakeBtn.title = 'Run renderHostQuestion with fake data';
      fakeBtn.onclick = function() {
        var fakeData = {
          questionIndex: 0, total: 3, duration: 30,
          question: { type: 'single', text: 'TEST: What is 2+2?', options: ['3','4','5','6'] },
          players: []
        };
        try {
          if (typeof window.state !== 'undefined') {
            window.state.questionStartTime = Date.now();
            window.state.questionDuration = 30;
            window.state.currentQuestionType = 'single';
          }
          if (typeof renderHostQuestion === 'function') {
            renderHostQuestion(fakeData);
            status.textContent = 'TEST-Q called OK';
          } else {
            status.textContent = 'ERR: no renderHostQuestion';
          }
        } catch(e) {
          status.textContent = 'CRASH: ' + e.message.substring(0,35);
          console.error('[v54] TEST-Q crash:', e);
        }
      };
      dbg.appendChild(fakeBtn);

      // ── Inspect button: logs active view dimensions ──
      var inspBtn = document.createElement('button');
      inspBtn.textContent = 'INSP';
      inspBtn.style.cssText = 'background:#2a1a1a;color:#f88;border:1px solid #f44;padding:2px 5px;font-size:9px;cursor:pointer;border-radius:3px;';
      inspBtn.title = 'Log active view dimensions';
      inspBtn.onclick = function() {
        var active = document.querySelector('.view.active');
        if (!active) { status.textContent = 'no active view'; return; }
        var r = active.getBoundingClientRect();
        var child = active.firstElementChild;
        var cr = child ? child.getBoundingClientRect() : null;
        status.textContent = active.id.replace('view-','') + ' ' + Math.round(r.width) + 'x' + Math.round(r.height) + (cr ? ' ch:'+Math.round(cr.width)+'x'+Math.round(cr.height) : ' no-children');
        console.log('[v54] INSP:', active.id, r, 'innerHTML.length:', active.innerHTML.length, 'children:', active.children.length);
      };
      dbg.appendChild(inspBtn);

"@

$replaced = $false
if ($c.Contains($oldAnchor)) {
    $c = $c.Replace($oldAnchor, "      dbg.appendChild(btnWrap);" + $insertion + "`r`n      document.body.appendChild(dbg);")
    $replaced = $true
} elseif ($c.Contains($oldAnchorUnix)) {
    $c = $c.Replace($oldAnchorUnix, "      dbg.appendChild(btnWrap);" + $insertion + "`n      document.body.appendChild(dbg);")
    $replaced = $true
}

if (-not $replaced) {
    Write-Host "ANCHOR NOT FOUND. Searching for partial match..."
    $idx = $c.IndexOf("dbg.appendChild(btnWrap)")
    Write-Host "btnWrap index: $idx"
    $idx2 = $c.IndexOf("document.body.appendChild(dbg)")
    Write-Host "body.appendChild index: $idx2"
    exit 1
}

# Fix log prefix from v53 to v54
$c = $c -replace "\[v53-dbg\]", "[v54]"

[System.IO.File]::WriteAllText($file, $c, [System.Text.Encoding]::UTF8)
Write-Host "SUCCESS: File saved"
