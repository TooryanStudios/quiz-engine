# Fix UTF-8 encoding corruption in game.js
# This script fixes corrupted Arabic text that was double-encoded

$file = "c:\Projects\quiz-engine\public\js\game.js"
$backup = "$file.backup"

# Create backup
Copy-Item $file $backup -Force
Write-Host "Created backup: $backup"

# Read file
$content = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)

# Fix the specific corrupted button text
# Search for the corrupted pattern and replace with correct Arabic
$pattern1 = [char]0x00e2 + [char]0x009c + [char]0x0094 + ' ' + # corrupted checkmark
           [char]0x00d8 + [char]0x00aa + [char]0x00d8 + [char]0x00a3 + [char]0x00d9 + [char]0x0083 + # corrupted Arabic
           [char]0x00d9 + [char]0x008a + [char]0x00d8 + [char]0x00af + ' ' +
           [char]0x00d8 + [char]0x00a7 + [char]0x00d9 + [char]0x0084 + [char]0x00d8 + [char]0x00a5 +
           [char]0x00d8 + [char]0x00ac + [char]0x00d8 + [char]0x00a7 + [char]0x00d8 + [char]0x00a8 + [char]0x00d8 + [char]0x00a9

$replacement1 = '✔ تأكيد الإجابة'

if ($content -match [regex]::Escape($pattern1)) {
    $content = $content.Replace($pattern1, $replacement1)
    Write-Host "Fixed Arabic button text"
} else {
    Write-Host "Arabic pattern not found - checking for alternate corruption..."
}

# Write back with proper UTF-8 encoding
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($file, $content, $utf8NoBom)

Write-Host "Processing complete"
Write-Host "Backup saved to: $backup"
