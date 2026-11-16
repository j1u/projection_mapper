# Tiny static web server for Projection Mapper (no dependencies).
# YouTube embeds won't play from file://, so this serves the folder at http://localhost.
param([int]$Port = 8080, [switch]$NoBrowser)

$root = (Resolve-Path $PSScriptRoot).Path
$mime = @{
  '.html' = 'text/html; charset=utf-8'; '.js' = 'text/javascript'; '.css' = 'text/css'; '.json' = 'application/json'
  '.png' = 'image/png'; '.jpg' = 'image/jpeg'; '.jpeg' = 'image/jpeg'; '.gif' = 'image/gif'; '.svg' = 'image/svg+xml'; '.webp' = 'image/webp'
  '.mp4' = 'video/mp4'; '.webm' = 'video/webm'; '.mov' = 'video/quicktime'
}

$listener = $null
for ($p = $Port; $p -lt $Port + 20; $p++) {
  try {
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://localhost:$p/")
    $listener.Start()
    $Port = $p
    break
  } catch { $listener = $null }
}
if (-not $listener) { Write-Error "No free port found."; exit 1 }

$url = "http://localhost:$Port/"
Write-Host "Projection Mapper running at $url"
Write-Host "Keep this window open while you use it. Close it to stop the server."
if (-not $NoBrowser) { Start-Process $url }

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $res = $ctx.Response
    try {
      $rel = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart('/'))
      if ([string]::IsNullOrEmpty($rel)) { $rel = 'index.html' }
      $file = [IO.Path]::GetFullPath((Join-Path $root $rel))
      if ($file.StartsWith($root, [StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $file -PathType Leaf)) {
        $ext = [IO.Path]::GetExtension($file).ToLower()
        $res.ContentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
        $bytes = [IO.File]::ReadAllBytes($file)
        $res.ContentLength64 = $bytes.Length
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
      } else {
        $res.StatusCode = 404
      }
    } catch {
      # client disconnected etc.
    } finally {
      $res.Close()
    }
  }
} finally {
  $listener.Stop()
}
