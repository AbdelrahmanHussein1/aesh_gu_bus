Add-Type -AssemblyName System.Drawing

$srcPath = "d:\Work\Galala_BOOKING\Images\App Icon Logo.png"
if (-not (Test-Path $srcPath)) {
    Write-Error "Source image not found: $srcPath"
    exit 1
}

# 1. Create mobile assets directory
$assetsDir = "d:\Work\Galala_BOOKING\apps\mobile\assets"
if (-not (Test-Path $assetsDir)) {
    New-Item -ItemType Directory -Path $assetsDir -Force | Out-Null
}

Copy-Item -Path $srcPath -Destination "$assetsDir\icon.png" -Force
Copy-Item -Path $srcPath -Destination "$assetsDir\adaptive-icon.png" -Force
Write-Output "Copied to $assetsDir\icon.png"

# 2. Resizing for Android mipmaps
$densities = @{
    "mipmap-mdpi"    = 48
    "mipmap-hdpi"    = 72
    "mipmap-xhdpi"   = 96
    "mipmap-xxhdpi"  = 144
    "mipmap-xxxhdpi" = 192
}

$resBase = "d:\Work\Galala_BOOKING\apps\mobile\android\app\src\main\res"
$srcImg = [System.Drawing.Image]::FromFile($srcPath)

foreach ($folder in $densities.Keys) {
    $size = $densities[$folder]
    $targetDir = Join-Path $resBase $folder
    if (-not (Test-Path $targetDir)) {
        New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
    }

    # Standard Square / Rounded Launcher Icon
    $destBmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($destBmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($srcImg, 0, 0, $size, $size)
    $g.Dispose()

    $launcherPath = Join-Path $targetDir "ic_launcher.png"
    $destBmp.Save($launcherPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $destBmp.Dispose()

    # Circular Round Launcher Icon
    $roundBmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $gr = [System.Drawing.Graphics]::FromImage($roundBmp)
    $gr.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $gr.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $gr.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $gr.Clear([System.Drawing.Color]::Transparent)

    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddEllipse(0, 0, $size, $size)
    $gr.SetClip($path)
    $gr.DrawImage($srcImg, 0, 0, $size, $size)
    $path.Dispose()
    $gr.Dispose()

    $roundPath = Join-Path $targetDir "ic_launcher_round.png"
    $roundBmp.Save($roundPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $roundBmp.Dispose()

    Write-Output "Generated icons for $folder ($size x $size)"
}

$srcImg.Dispose()
Write-Output "All Android icons generated successfully!"
