# Servidor local simples (sem Node) para o Gestao Grafico Pro
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$log  = Join-Path $root 'iniciar-log.txt'
"[$(Get-Date)] Iniciando em $root" | Out-File $log -Encoding utf8
$mime = @{ '.html'='text/html; charset=utf-8'; '.js'='text/javascript; charset=utf-8'; '.css'='text/css; charset=utf-8';
  '.json'='application/json'; '.svg'='image/svg+xml'; '.png'='image/png'; '.jpg'='image/jpeg'; '.jpeg'='image/jpeg';
  '.gif'='image/gif'; '.ico'='image/x-icon'; '.webp'='image/webp'; '.woff2'='font/woff2'; '.pdf'='application/pdf' }
$port = 5173
$listener = $null
foreach ($p in 5173..5180) {
  try { $l = New-Object System.Net.HttpListener; $l.Prefixes.Add("http://localhost:$p/"); $l.Start(); $listener = $l; $port = $p; break }
  catch { "Porta $p ocupada: $($_.Exception.Message)" | Out-File $log -Append -Encoding utf8 }
}
if (-not $listener) { Write-Host 'Nao foi possivel abrir nenhuma porta.'; "ERRO: nenhuma porta" | Out-File $log -Append; exit 1 }
$url = "http://localhost:$port/"
"Rodando em $url" | Out-File $log -Append -Encoding utf8
Write-Host ""
Write-Host "  Gestao Grafico Pro rodando em $url" -ForegroundColor Green
Write-Host "  Deixe esta janela aberta. Feche para desligar." -ForegroundColor Yellow
Start-Process $url
while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  try {
    $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
    if ($path -eq '') { $path = 'index.html' }
    $file = [IO.Path]::GetFullPath((Join-Path $root $path))
    if (-not $file.StartsWith($root, [StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path $file -PathType Leaf)) {
      $ctx.Response.StatusCode = 404; $b = [Text.Encoding]::UTF8.GetBytes('404')
    } else {
      $ext = [IO.Path]::GetExtension($file).ToLower()
      $ctx.Response.ContentType = $(if ($mime[$ext]) { $mime[$ext] } else { 'application/octet-stream' })
      $ctx.Response.Headers.Add('Cache-Control','no-store')
      $b = [IO.File]::ReadAllBytes($file)
    }
    $ctx.Response.ContentLength64 = $b.Length
    $ctx.Response.OutputStream.Write($b, 0, $b.Length)
  } catch { "Erro: $($_.Exception.Message)" | Out-File $log -Append -Encoding utf8 }
  finally { $ctx.Response.OutputStream.Close() }
}
