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

# 3. Web Public Assets Generation
$webPublic = "d:\Work\Galala_BOOKING\apps\web\public"
if (Test-Path $webPublic) {
    # Generate 256x256 web logo
    $logoBmp = New-Object System.Drawing.Bitmap(256, 256, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $gl = [System.Drawing.Graphics]::FromImage($logoBmp)
    $gl.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $gl.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $gl.Clear([System.Drawing.Color]::Transparent)
    $gl.DrawImage($srcImg, 0, 0, 256, 256)
    $gl.Dispose()
    $logoBmp.Save((Join-Path $webPublic "app-logo.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $logoBmp.Dispose()
    Write-Output "Optimized apps/web/public/app-logo.png (256x256)"

    # Generate 192x192 icon.png
    $iconBmp = New-Object System.Drawing.Bitmap(192, 192, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $gi = [System.Drawing.Graphics]::FromImage($iconBmp)
    $gi.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $gi.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $gi.Clear([System.Drawing.Color]::Transparent)
    $gi.DrawImage($srcImg, 0, 0, 192, 192)
    $gi.Dispose()
    $iconBmp.Save((Join-Path $webPublic "icon.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $iconBmp.Dispose()
    Write-Output "Optimized apps/web/public/icon.png (192x192)"

    # Generate 180x180 apple-touch-icon.png
    $appleBmp = New-Object System.Drawing.Bitmap(180, 180, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $ga = [System.Drawing.Graphics]::FromImage($appleBmp)
    $ga.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $ga.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $ga.Clear([System.Drawing.Color]::White)
    $ga.DrawImage($srcImg, 10, 10, 160, 160)
    $ga.Dispose()
    $appleBmp.Save((Join-Path $webPublic "apple-touch-icon.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $appleBmp.Dispose()
    Write-Output "Generated apps/web/public/apple-touch-icon.png (180x180)"

    # Generate 1200x630 OpenGraph social share card
    $ogBmp = New-Object System.Drawing.Bitmap(1200, 630, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $gog = [System.Drawing.Graphics]::FromImage($ogBmp)
    $gog.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $gog.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    
    # Background: Institutional deep navy #0f172a
    $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 15, 23, 42))
    $gog.FillRectangle($bgBrush, 0, 0, 1200, 630)
    $bgBrush.Dispose()

    # Draw centered emblem and text
    $gog.DrawImage($srcImg, 100, 165, 300, 300)
    
    $fontTitle = New-Object System.Drawing.Font("Arial", 42, [System.Drawing.FontStyle]::Bold)
    $fontSub = New-Object System.Drawing.Font("Arial", 22, [System.Drawing.FontStyle]::Regular)
    $fontAr = New-Object System.Drawing.Font("Arial", 24, [System.Drawing.FontStyle]::Bold)
    
    $textBrushWhite = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 248, 250, 252))
    $textBrushGold = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 245, 158, 11))
    $textBrushMuted = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 148, 163, 184))

    $gog.DrawString("Galala University Transport", $fontTitle, $textBrushWhite, 440, 190)
    $gog.DrawString("Bus Aesh - Official Seat Reservation Platform", $fontSub, $textBrushGold, 445, 260)
    $gog.DrawString("Smart Transit Management - Galala University", $fontAr, $textBrushMuted, 445, 310)
    $gog.DrawString("Daily Synchronized Transit - 29 Official Lines - Verified GU SSO", $fontSub, $textBrushWhite, 445, 370)

    $fontTitle.Dispose()
    $fontSub.Dispose()
    $fontAr.Dispose()
    $textBrushWhite.Dispose()
    $textBrushGold.Dispose()
    $textBrushMuted.Dispose()
    $gog.Dispose()

    $ogBmp.Save((Join-Path $webPublic "og-image.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $ogBmp.Dispose()
    Write-Output "Generated apps/web/public/og-image.png (1200x630)"
}

$srcImg.Dispose()
Write-Output "All icons and web social preview assets generated successfully!"
