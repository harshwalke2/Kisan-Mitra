$ErrorActionPreference = 'Continue'
$base = 'http://localhost:5055/api'

function Invoke-Api {
  param([string]$Method,[string]$Path,[object]$Body = $null,[string]$Token = '')
  try {
    $headers = @{}
    if ($Token) { $headers['Authorization'] = "Bearer $Token" }
    $params = @{ Uri = "$base$Path"; Method = $Method; Headers = $headers; SkipHttpErrorCheck = $true; TimeoutSec = 25 }
    if ($null -ne $Body) { $params['ContentType']='application/json'; $params['Body']=($Body | ConvertTo-Json -Depth 12) }
    $resp = Invoke-WebRequest @params
    $data = $null
    if ($resp.Content) { try { $data = $resp.Content | ConvertFrom-Json -Depth 30 } catch { $data = $resp.Content } }
    return [pscustomobject]@{ status=[int]$resp.StatusCode; ok=([int]$resp.StatusCode -ge 200 -and [int]$resp.StatusCode -lt 300); data=$data }
  } catch {
    return [pscustomobject]@{ status=0; ok=$false; data=@{ message = $_.Exception.Message } }
  }
}

$stamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$userAEmail = "smoketest.a.$stamp@example.com"
$userBEmail = "smoketest.b.$stamp@example.com"
$pass = 'Pass@123456'
$rows = New-Object System.Collections.Generic.List[object]

function Add-Row($name,$res,$note='') {
  $msg = $note
  if (-not $msg -and $res.data -and $res.data.message) { $msg = $res.data.message }
  [void]$rows.Add([pscustomobject]@{ feature=$name; status=$res.status; ok=$res.ok; note=$msg })
}

$regA = Invoke-Api 'POST' '/auth/register' @{ username="SmokeA_$stamp"; email=$userAEmail; password=$pass; role='farmer'; phone='+919000000001'; location='Pune'; farmName='FarmA'; farmSize=2.5; preferredLanguage='en' }
Add-Row 'auth.register.A' $regA
$tokenA = if ($regA.ok) { $regA.data.token } else { '' }
$userAId = if ($regA.ok) { $regA.data.user._id } else { '' }

$regB = Invoke-Api 'POST' '/auth/register' @{ username="SmokeB_$stamp"; email=$userBEmail; password=$pass; role='farmer'; phone='+919000000002'; location='Nashik'; farmName='FarmB'; farmSize=3.1; preferredLanguage='hi' }
Add-Row 'auth.register.B' $regB
$tokenB = if ($regB.ok) { $regB.data.token } else { '' }
$userBId = if ($regB.ok) { $regB.data.user._id } else { '' }

$meA = Invoke-Api 'GET' '/auth/me' $null $tokenA; Add-Row 'auth.me.A' $meA ($meA.data.user.email)
$meB = Invoke-Api 'GET' '/auth/me' $null $tokenB; Add-Row 'auth.me.B' $meB ($meB.data.user.email)

$search = Invoke-Api 'GET' '/users/search?q=Smoke' $null $tokenA
$searchCount = if ($search.data.users) { $search.data.users.Count } else { 0 }
Add-Row 'users.search' $search "count=$searchCount"

$listing = Invoke-Api 'POST' '/listings' @{ category='tool'; title="Tractor $stamp"; description='Test listing'; location='Pune'; pricePerUnit=900; unit='day'; quantity=1; media=@(); metadata=@{} } $tokenA
$listingId = if ($listing.ok) { $listing.data.listing._id } else { '' }
Add-Row 'listings.create' $listing ($listingId)

$listings = Invoke-Api 'GET' '/listings?category=tool&q=Tractor'
$listCount = if ($listings.data.listings) { $listings.data.listings.Count } else { 0 }
Add-Row 'listings.get' $listings "count=$listCount"

$sendFollow = Invoke-Api 'POST' '/follow-request' @{ receiverId=$userBId } $tokenA
Add-Row 'follow.send' $sendFollow
$pending = Invoke-Api 'GET' '/follow-requests' $null $tokenB
$pendingCount = if ($pending.data.requests) { $pending.data.requests.Count } else { 0 }
$requestId = if ($pendingCount -gt 0) { $pending.data.requests[0]._id } else { '' }
Add-Row 'follow.pending' $pending "count=$pendingCount"

if ($requestId) {
  $accept = Invoke-Api 'POST' '/follow-request/accept' @{ requestId=$requestId } $tokenB
  Add-Row 'follow.accept' $accept
} else {
  [void]$rows.Add([pscustomobject]@{feature='follow.accept';status=0;ok=$false;note='no pending request id'})
}

$msgSend = Invoke-Api 'POST' '/messages' @{ receiverId=$userBId; message='hello from smoke test' } $tokenA
Add-Row 'chat.send' $msgSend
$msgRead = Invoke-Api 'GET' "/messages/$userAId" $null $tokenB
$msgCount = if ($msgRead.data.messages) { $msgRead.data.messages.Count } else { 0 }
Add-Row 'chat.read' $msgRead "count=$msgCount"
$convos = Invoke-Api 'GET' '/conversations' $null $tokenA
$convoCount = if ($convos.data.conversations) { $convos.data.conversations.Count } else { 0 }
Add-Row 'chat.conversations' $convos "count=$convoCount"

$booking = Invoke-Api 'POST' '/bookings' @{ listingId=$listingId; startDate='2026-03-25'; endDate='2026-03-27'; quantity=1; notes='smoke booking' } $tokenB
$bookingId = if ($booking.ok) { $booking.data.booking._id } else { '' }
Add-Row 'bookings.create' $booking
$myBookings = Invoke-Api 'GET' '/bookings/me' $null $tokenA
$incomingCount = if ($myBookings.data.incoming) { $myBookings.data.incoming.Count } else { 0 }
Add-Row 'bookings.me.owner' $myBookings "incoming=$incomingCount"

if ($bookingId) {
  $acceptBooking = Invoke-Api 'PATCH' "/bookings/$bookingId/status" @{ status='accepted' } $tokenA
  Add-Row 'bookings.accept' $acceptBooking
  $completeBooking = Invoke-Api 'PATCH' "/bookings/$bookingId/status" @{ status='completed'; paymentStatus='completed' } $tokenA
  Add-Row 'bookings.complete' $completeBooking

  $review = Invoke-Api 'POST' '/reviews' @{ bookingId=$bookingId; revieweeId=$userAId; rating=5; comment='great experience' } $tokenB
  Add-Row 'reviews.create' $review
} else {
  [void]$rows.Add([pscustomobject]@{feature='bookings.accept';status=0;ok=$false;note='booking not created'})
  [void]$rows.Add([pscustomobject]@{feature='bookings.complete';status=0;ok=$false;note='booking not created'})
  [void]$rows.Add([pscustomobject]@{feature='reviews.create';status=0;ok=$false;note='booking not created'})
}

$reviews = Invoke-Api 'GET' "/reviews/$userAId"
$totalReviews = if ($reviews.data.summary) { $reviews.data.summary.totalReviews } else { 0 }
Add-Row 'reviews.get' $reviews "total=$totalReviews"

$profileMe = Invoke-Api 'GET' '/profile/me' $null $tokenA; Add-Row 'profile.me' $profileMe
$profilePublic = Invoke-Api 'GET' "/users/$userAId/profile" $null $tokenB; Add-Row 'profile.public' $profilePublic

$notif = Invoke-Api 'GET' '/notifications' $null $tokenA
$notifCount = if ($notif.data.notifications) { $notif.data.notifications.Count } else { 0 }
Add-Row 'notifications.list' $notif "count=$notifCount"
$readAll = Invoke-Api 'PATCH' '/notifications/read-all' $null $tokenA
Add-Row 'notifications.read-all' $readAll

$verStatus = Invoke-Api 'GET' '/verification/status' $null $tokenA
Add-Row 'verification.status' $verStatus
$verSubmit = Invoke-Api 'POST' '/verification/submit' @{ method='digilocker'; digilockerConsent=$true } $tokenA
Add-Row 'verification.submit' $verSubmit

$admin = Invoke-Api 'GET' '/admin/insights' $null $tokenA
Add-Row 'admin.insights' $admin

$crop = Invoke-Api 'POST' '/crop-recommend' @{ nitrogen=90; phosphorus=42; potassium=43; temperature=20.9; humidity=82; ph=6.5; rainfall=202 }
Add-Row 'crop.recommend' $crop

$rows | ConvertTo-Json -Depth 8
