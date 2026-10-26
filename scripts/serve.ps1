$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$port = 8765

$types = @{
    '.html' = 'text/html; charset=utf-8'
    '.js'   = 'text/javascript; charset=utf-8'
    '.json' = 'application/json; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8'
    '.png'  = 'image/png'
    '.svg'  = 'image/svg+xml'
    '.ico'  = 'image/x-icon'
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Output "Serving $root on http://localhost:$port/"

while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $req = $ctx.Request
    $res = $ctx.Response
    try {
        $rel = [System.Uri]::UnescapeDataString($req.Url.AbsolutePath).TrimStart('/')
        if ($rel -eq '') { $rel = 'index.html' }
        $path = Join-Path $root $rel
        $full = [System.IO.Path]::GetFullPath($path)
        if (-not $full.StartsWith([System.IO.Path]::GetFullPath($root))) {
            $res.StatusCode = 403
        }
        elseif (Test-Path -LiteralPath $full -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($full).ToLower()
            $ct = $types[$ext]
            if (-not $ct) { $ct = 'application/octet-stream' }
            $bytes = [System.IO.File]::ReadAllBytes($full)
            $res.ContentType = $ct
            $res.Headers.Add('Cache-Control', 'no-cache')
            $res.ContentLength64 = $bytes.Length
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
        }
        else {
            $res.StatusCode = 404
        }
        Write-Output ("{0} {1} -> {2}" -f $req.HttpMethod, $rel, $res.StatusCode)
    }
    catch {
        Write-Output ("EROARE {0}: {1}" -f $req.Url.AbsolutePath, $_.Exception.Message)
        try { $res.StatusCode = 500 } catch {}
    }
    finally {
        try { $res.OutputStream.Close() } catch {}
    }
}
