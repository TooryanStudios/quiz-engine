$f = "src\pages\workhub\components\WorkhubDocEditor.tsx"
$content = [System.IO.File]::ReadAllText($f, [System.Text.Encoding]::UTF8)

$startMarker = "                <button" + [char]13 + [char]10 + "                  className=""workhub-primary-btn workhub-doc-tool-btn""" + [char]13 + [char]10 + "                  title=""Save document"""
$endMarker = "              </div>" + [char]13 + [char]10 + "            </div>" + [char]13 + [char]10 + [char]13 + [char]10 + "            {selectedDocument ? ("

$startIdx = $content.IndexOf($startMarker)
$endIdx = $content.IndexOf($endMarker, $startIdx)

Write-Host "Start=$startIdx End=$endIdx"

if ($startIdx -lt 0 -or $endIdx -lt 0) {
    Write-Host "ERROR: markers not found"
    exit 1
}

$oldBlock = $content.Substring($startIdx, $endIdx - $startIdx)
Write-Host "=== OLD BLOCK (length=$($oldBlock.Length)) ==="
Write-Host $oldBlock
