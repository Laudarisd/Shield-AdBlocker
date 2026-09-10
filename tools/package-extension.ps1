$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$manifest = Get-Content -LiteralPath (Join-Path $projectRoot "manifest.json") -Raw | ConvertFrom-Json
$output = Join-Path (Split-Path -Parent $projectRoot) ("shield-ad-blocker-" + $manifest.version + ".zip")

$files = @(
  "manifest.json",
  "background.js",
  "popup/popup.html",
  "popup/popup.css",
  "popup/popup.js",
  "content/protection-state.js",
  "content/restore-scroll-after-hiding-banner.js",
  "content/skip-youtube-ads.js",
  "content/hide-ad-elements.css",
  "content/hide-cookie-banners.css",
  "content/hide-youtube-ads.css",
  "icons/icon16.png",
  "icons/icon32.png",
  "icons/icon48.png",
  "icons/icon128.png",
  "rules/block-ads-and-trackers.json",
  "rules/block-third-party-cookies.json"
)

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

if (Test-Path -LiteralPath $output) {
  Remove-Item -LiteralPath $output -Force
}

# Entry names are written verbatim, keeping the forward slashes the ZIP format
# requires; Compress-Archive would store backslashes, which non-Windows unzip
# tools can misread as literal file names.
$zip = [System.IO.Compression.ZipFile]::Open($output, [System.IO.Compression.ZipArchiveMode]::Create)
try {
  foreach ($relativePath in $files) {
    $source = Join-Path $projectRoot $relativePath
    if (-not (Test-Path -LiteralPath $source)) {
      throw "Missing release file: $relativePath"
    }
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
      $zip, $source, $relativePath,
      [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
  }
}
finally {
  $zip.Dispose()
}
Write-Output "Created $output"
