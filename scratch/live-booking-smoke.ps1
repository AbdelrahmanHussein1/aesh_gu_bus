param(
  [Parameter(Mandatory=$true)][string]$ApiBaseUrl,
  [Parameter(Mandatory=$true)][string]$VmPassword,
  [Parameter(Mandatory=$true)][string]$CredentialFile
)

$ErrorActionPreference = 'Stop'
$base = $ApiBaseUrl.TrimEnd('/')
$parsedApiUrl = $null
if (-not [Uri]::TryCreate($base, [UriKind]::Absolute, [ref]$parsedApiUrl) -or $parsedApiUrl.Scheme -notin @('http', 'https')) {
  throw 'ApiBaseUrl must be an absolute http:// or https:// URL'
}
$email = 'codex-qa-20261014@gu.edu.eg'
$date = '2027-01-09'
$vbox = 'C:\Program Files\Oracle\VirtualBox\VBoxManage.exe'
$passwordFile = Join-Path $env:TEMP ('galala-qa-vm-' + [guid]::NewGuid().ToString('N') + '.txt')
$tripId = $null
$accountCreated = $false

function Invoke-Psql([string]$sql) {
  $output = & $vbox guestcontrol 'Galala Clone' run --username=abdelrahman --passwordfile=$passwordFile --cwd=/home/abdelrahman/aesh_gu_bus --timeout=60000 --exe=/usr/bin/docker --wait-stdout -- compose exec -T postgres psql -U aesh_user -d aesh_db -At -c $sql
  if ($LASTEXITCODE -ne 0) { throw 'Guest database command failed' }
  return ($output -join "`n")
}

function Invoke-Api([string]$method, [string]$path, $body, [string]$token) {
  $headers = @{}
  if ($token) { $headers.Authorization = 'Bearer ' + $token }
  $json = if ($null -ne $body) { $body | ConvertTo-Json -Depth 10 -Compress } else { $null }
  return Invoke-RestMethod -Uri ($base + $path) -Method $method -Headers $headers -ContentType 'application/json' -Body $json -TimeoutSec 30
}

try {
  Set-Content -LiteralPath $passwordFile -Value $VmPassword -NoNewline -Encoding ascii
  $existing = Invoke-Psql "SELECT count(*) FROM users WHERE email='$email'"
  if ($existing.Trim() -ne '0') { throw 'QA rider already exists; refusing to overwrite it' }
  $existingTrips = Invoke-Api 'Get' ('/api/trips?date=' + $date) $null ''
  if ($null -ne $existingTrips -and @($existingTrips).Count -ne 0) { throw 'QA date already contains trips' }

  $adminRecord = Get-Content -LiteralPath $CredentialFile | Where-Object { $_ -like "admin@gu.edu.eg`t*" } | Select-Object -First 1
  if (-not $adminRecord) { throw 'Rotated administrator credential not found' }
  $adminPassword = ($adminRecord -split "`t",2)[1]
  $adminLogin = Invoke-Api 'Post' '/api/auth/login' @{ email='admin@gu.edu.eg'; password=$adminPassword } ''
  $adminToken = $adminLogin.token
  if (-not $adminToken) { throw 'Administrator login failed' }
  if ($adminLogin.user.PSObject.Properties.Name -contains 'password' -or $adminLogin.user.PSObject.Properties.Name -contains 'currentSessionId') { throw 'Login exposes credential fields' }

  $riderPassword = [guid]::NewGuid().ToString('N') + 'A1'
  $env:CODEX_QA_PASSWORD = $riderPassword
  try {
    $hash = & node -e "const c=require('crypto');const s=c.randomBytes(16).toString('hex');process.stdout.write(s+':'+c.scryptSync(process.env.CODEX_QA_PASSWORD,s,64).toString('hex'))"
  } finally { Remove-Item Env:CODEX_QA_PASSWORD -ErrorAction SilentlyContinue }
  if ($LASTEXITCODE -ne 0 -or $hash -notmatch '^[0-9a-f]{32}:[0-9a-f]{128}$') { throw 'Could not create QA credential hash' }
  $insert = Invoke-Psql "INSERT INTO users(email,full_name,role,password,is_sheerid_verified) VALUES ('$email','CODEX QA TEMP 2026-10-14','rider','$hash',true)"
  if ($insert -notmatch 'INSERT 0 1') { throw 'QA account insert failed' }
  $accountCreated = $true

  $created = Invoke-Api 'Post' '/api/admin/shifts/create-single-test-shift' @{date=$date;direction='to_campus';timeSlot='morning_1'} $adminToken
  $tripId = [int]$created.trip.id
  if ($tripId -le 0) { throw 'QA trip creation failed' }
  $riderToken = (Invoke-Api 'Post' '/api/auth/login' @{email=$email;password=$riderPassword} '').token
  if (-not $riderToken) { throw 'QA rider login failed' }

  $noReceiptBody = @{tripId=$tripId;seatNumber=50;paymentMethod='instapay';bookingType='one_way';legType='to_campus'} | ConvertTo-Json -Compress
  $noReceipt = Invoke-WebRequest -Uri ($base + '/api/bookings') -Method Post -Headers @{Authorization='Bearer ' + $riderToken} -ContentType 'application/json' -Body $noReceiptBody -SkipHttpErrorCheck -TimeoutSec 30
  if ($noReceipt.StatusCode -ne 400) { throw 'Paid booking without receipt evidence was accepted' }

  $booked = Invoke-Api 'Post' '/api/bookings' @{tripId=$tripId;seatNumber=50;paymentMethod='instapay';bookingType='one_way';legType='to_campus';receiptRef='CODEX-QA-NOT-A-PAYMENT'} $riderToken
  if (-not $booked.success) { throw 'QA booking failed' }
  $scan = Invoke-Api 'Post' '/api/scan/verify' @{token=$booked.qrToken;expectedLegType='to_campus'} $adminToken
  if ($scan.result -ne 'payment_pending') { throw 'Unverified QR was not blocked' }

  $manualBody = @{bookingId=$booked.bookingId} | ConvertTo-Json -Compress
  $manual = Invoke-WebRequest -Uri ($base + '/api/supervisor/board-passenger') -Method Post -Headers @{Authorization='Bearer ' + $adminToken} -ContentType 'application/json' -Body $manualBody -SkipHttpErrorCheck -TimeoutSec 30
  if ($manual.StatusCode -ne 409) { throw 'Unverified manual boarding was not blocked' }

  $publicTrips = Invoke-Api 'Get' ('/api/trips?date=' + $date) $null ''
  $qaTrip = @($publicTrips) | Where-Object { $_.id -eq $tripId } | Select-Object -First 1
  if (-not $qaTrip -or $qaTrip.bookedSeats -ne 1 -or ($qaTrip.passengers -and @($qaTrip.passengers).Count -ne 0)) { throw 'Public trip projection failed' }
  $riderBookings = Invoke-Api 'Get' '/api/bookings/my' $null $riderToken
  $qaBooking = @($riderBookings) | Where-Object { $_.id -eq $booked.bookingId } | Select-Object -First 1
  if (-not $qaBooking -or $qaBooking.paymentStatus -ne 'receipt_uploaded') { throw 'Rider booking history failed' }
  if ([datetime]$qaBooking.qrExpiresAt -le [datetime]$date) { throw 'Future trip QR expires before the trip' }

  $routes = Invoke-Api 'Get' '/api/routes' $null ''
  $devRoute = @($routes) | Where-Object { $_.nameEn -eq 'CODEX DEVELOPMENT TEST ROUTE - NO REAL SERVICE' } | Select-Object -First 1
  if (-not $devRoute) { throw 'Development route is missing' }
  $devTrips = Invoke-Api 'Get' '/api/trips?date=2026-10-15' $null ''
  $devTrip = @($devTrips) | Where-Object { $_.routeId -eq $devRoute.id -and $_.direction -eq 'to_campus' } | Select-Object -First 1
  if (-not $devTrip -or [decimal]$devTrip.priceEgp -ne 0) { throw 'Zero-fare development trip is missing' }
  $freeBooking = Invoke-Api 'Post' '/api/bookings' @{tripId=$devTrip.id;seatNumber=50;paymentMethod='instapay';bookingType='one_way';legType='to_campus'} $riderToken
  if (-not $freeBooking.success) { throw 'Free development booking failed' }
  $freeScan = Invoke-Api 'Post' '/api/scan/verify' @{token=$freeBooking.qrToken;expectedLegType='to_campus'} $adminToken
  if (-not $freeScan.success -or $freeScan.result -ne 'valid') { throw 'Free development booking could not board' }

  Write-Output 'PASS: admin shift creation, paid receipt requirement, paid rider booking, public PII redaction, login response sanitation, pending-payment boarding blocks, future QR expiry, free development booking and boarding'
} finally {
  if ($accountCreated -or $tripId) {
    $cleanup = @"
BEGIN;
DELETE FROM boarding_logs WHERE booking_id IN (SELECT id FROM bookings WHERE user_id IN (SELECT id FROM users WHERE email='$email'));
DELETE FROM swap_logs WHERE old_booking_id IN (SELECT id FROM bookings WHERE user_id IN (SELECT id FROM users WHERE email='$email')) OR new_booking_id IN (SELECT id FROM bookings WHERE user_id IN (SELECT id FROM users WHERE email='$email'));
DELETE FROM bookings WHERE user_id IN (SELECT id FROM users WHERE email='$email');
DELETE FROM trip_supervisors WHERE trip_id IN (SELECT id FROM trips WHERE trip_date='$date');
DELETE FROM trips WHERE trip_date='$date';
DELETE FROM audit_logs WHERE user_id IN (SELECT id FROM users WHERE email='$email');
DELETE FROM users WHERE email='$email';
COMMIT;
"@
    try { Invoke-Psql $cleanup | Out-Null; Write-Output 'CLEANUP: QA rider, booking, and shift removed' } catch { Write-Error ('CLEANUP FAILED: ' + $_.Exception.Message) }
  }
  Remove-Item -LiteralPath $passwordFile -ErrorAction SilentlyContinue
}
