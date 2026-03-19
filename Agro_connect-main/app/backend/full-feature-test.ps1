$ErrorActionPreference = 'Continue'
$base = 'http://localhost:5055'

function Invoke-Api {
  param(
    [string]$Method,
    [string]$Path,
    [object]$Body = $null,
    [string]$Token = ''
  )

  try {
    $headers = @{}
    if ($Token) { $headers['Authorization'] = "Bearer $Token" }

    $params = @{
      Uri = "$base$Path"
      Method = $Method
      Headers = $headers
      SkipHttpErrorCheck = $true
      TimeoutSec = 30
    }

    if ($null -ne $Body) {
      $params['ContentType'] = 'application/json'
      $params['Body'] = ($Body | ConvertTo-Json -Depth 15)
    }

    $resp = Invoke-WebRequest @params
    $parsed = $null
    if ($resp.Content) {
      try { $parsed = $resp.Content | ConvertFrom-Json -Depth 50 } catch { $parsed = $resp.Content }
    }

    return [pscustomobject]@{
      status = [int]$resp.StatusCode
      ok = ([int]$resp.StatusCode -ge 200 -and [int]$resp.StatusCode -lt 300)
      data = $parsed
    }
  } catch {
    return [pscustomobject]@{
      status = 0
      ok = $false
      data = @{ message = $_.Exception.Message }
    }
  }
}

$results = New-Object System.Collections.Generic.List[object]

function Add-Result {
  param(
    [string]$feature,
    [object]$response,
    [bool]$expectedOk = $true,
    [string]$note = ''
  )

  $pass = $false
  if ($expectedOk) {
    $pass = [bool]$response.ok
  } else {
    $pass = -not [bool]$response.ok
  }

  $detail = $note
  if (-not $detail -and $response.data -and $response.data.message) {
    $detail = [string]$response.data.message
  }

  [void]$results.Add([pscustomobject]@{
    feature = $feature
    expected = $(if ($expectedOk) { 'success' } else { 'error' })
    status = $response.status
    actualOk = [bool]$response.ok
    pass = $pass
    note = $detail
  })
}

$stamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()

$adminEmail = "full.admin.$stamp@example.com"
$aEmail = "full.a.$stamp@example.com"
$bEmail = "full.b.$stamp@example.com"
$cEmail = "full.c.$stamp@example.com"

$adminPass = 'Admin@123456'
$aPass = 'FarmerA@123456'
$bPass = 'FarmerB@123456'
$cPass = 'FarmerC@123456'
$newAPass = 'FarmerA@654321'

# Basic API checks
$health = Invoke-Api -Method 'GET' -Path '/api/health'
Add-Result -feature 'health' -response $health -expectedOk $true

$rootApi = Invoke-Api -Method 'GET' -Path '/api'
Add-Result -feature 'api.root' -response $rootApi -expectedOk $true

$notFound = Invoke-Api -Method 'GET' -Path '/api/unknown-route'
Add-Result -feature 'api.404' -response $notFound -expectedOk $false

# Register users
$regAdmin = Invoke-Api -Method 'POST' -Path '/api/auth/register' -Body @{
  username = "FullAdmin$stamp"
  email = $adminEmail
  password = $adminPass
  role = 'admin'
}
Add-Result -feature 'auth.register.admin' -response $regAdmin -expectedOk $true
$adminToken = if ($regAdmin.ok) { $regAdmin.data.token } else { '' }

$regA = Invoke-Api -Method 'POST' -Path '/api/auth/register' -Body @{
  username = "FullFarmerA$stamp"
  email = $aEmail
  password = $aPass
  role = 'farmer'
  phone = '+919111111111'
  location = 'Pune'
  farmName = 'Farm A'
  farmSize = 4.2
  preferredLanguage = 'en'
}
Add-Result -feature 'auth.register.A' -response $regA -expectedOk $true
$aToken = if ($regA.ok) { $regA.data.token } else { '' }
$aId = if ($regA.ok) { $regA.data.user._id } else { '' }

$regB = Invoke-Api -Method 'POST' -Path '/api/auth/register' -Body @{
  username = "FullFarmerB$stamp"
  email = $bEmail
  password = $bPass
  role = 'farmer'
  phone = '+919222222222'
  location = 'Nashik'
  farmName = 'Farm B'
  farmSize = 3.4
  preferredLanguage = 'hi'
}
Add-Result -feature 'auth.register.B' -response $regB -expectedOk $true
$bToken = if ($regB.ok) { $regB.data.token } else { '' }
$bId = if ($regB.ok) { $regB.data.user._id } else { '' }

$regC = Invoke-Api -Method 'POST' -Path '/api/auth/register' -Body @{
  username = "FullFarmerC$stamp"
  email = $cEmail
  password = $cPass
  role = 'farmer'
}
Add-Result -feature 'auth.register.C' -response $regC -expectedOk $true
$cToken = if ($regC.ok) { $regC.data.token } else { '' }
$cId = if ($regC.ok) { $regC.data.user._id } else { '' }

# Duplicate register should fail
$dupReg = Invoke-Api -Method 'POST' -Path '/api/auth/register' -Body @{
  username = "Dup$stamp"
  email = $aEmail
  password = $aPass
}
Add-Result -feature 'auth.register.duplicate' -response $dupReg -expectedOk $false

# Login tests
$loginAOk = Invoke-Api -Method 'POST' -Path '/api/auth/login' -Body @{ email = $aEmail; password = $aPass }
Add-Result -feature 'auth.login.valid' -response $loginAOk -expectedOk $true

$loginABad = Invoke-Api -Method 'POST' -Path '/api/auth/login' -Body @{ email = $aEmail; password = 'wrong-pass' }
Add-Result -feature 'auth.login.invalid' -response $loginABad -expectedOk $false

# auth/me
$meA = Invoke-Api -Method 'GET' -Path '/api/auth/me' -Token $aToken
Add-Result -feature 'auth.me' -response $meA -expectedOk $true

# forgot/reset password flow
$forgot = Invoke-Api -Method 'POST' -Path '/api/auth/forgot-password' -Body @{ email = $aEmail }
Add-Result -feature 'auth.forgot-password' -response $forgot -expectedOk $true

$resetToken = ''
if ($forgot.data -and $forgot.data.devResetLink) {
  $uri = [Uri]$forgot.data.devResetLink
  $pairs = $uri.Query.TrimStart('?').Split('&')
  foreach ($pair in $pairs) {
    $kv = $pair.Split('=', 2)
    if ($kv.Count -eq 2 -and $kv[0] -eq 'token') {
      $resetToken = [Uri]::UnescapeDataString($kv[1])
    }
  }
}

if ($resetToken) {
  $reset = Invoke-Api -Method 'POST' -Path '/api/auth/reset-password' -Body @{ token = $resetToken; newPassword = $newAPass }
  Add-Result -feature 'auth.reset-password' -response $reset -expectedOk $true

  $loginAfterReset = Invoke-Api -Method 'POST' -Path '/api/auth/login' -Body @{ email = $aEmail; password = $newAPass }
  Add-Result -feature 'auth.login.after-reset' -response $loginAfterReset -expectedOk $true

  if ($loginAfterReset.ok) { $aToken = $loginAfterReset.data.token }
} else {
  [void]$results.Add([pscustomobject]@{ feature='auth.reset-password'; expected='success'; status=0; actualOk=$false; pass=$false; note='No devResetLink returned (SMTP config may differ)' })
}

# Search users
$search = Invoke-Api -Method 'GET' -Path '/api/users/search?q=FullFarmer' -Token $aToken
$searchCount = if ($search.data -and $search.data.users) { $search.data.users.Count } else { 0 }
Add-Result -feature 'users.search' -response $search -expectedOk $true -note "count=$searchCount"

# Follow flow (accept + reject)
$followAB = Invoke-Api -Method 'POST' -Path '/api/follow-request' -Token $aToken -Body @{ receiverId = $bId }
Add-Result -feature 'follow.send.AtoB' -response $followAB -expectedOk $true

$pendingB1 = Invoke-Api -Method 'GET' -Path '/api/follow-requests' -Token $bToken
Add-Result -feature 'follow.pending.B' -response $pendingB1 -expectedOk $true
$requestAB = if ($pendingB1.ok -and $pendingB1.data.requests.Count -gt 0) { $pendingB1.data.requests[0]._id } else { '' }
if ($requestAB) {
  $acceptAB = Invoke-Api -Method 'POST' -Path '/api/follow-request/accept' -Token $bToken -Body @{ requestId = $requestAB }
  Add-Result -feature 'follow.accept' -response $acceptAB -expectedOk $true
} else {
  [void]$results.Add([pscustomobject]@{ feature='follow.accept'; expected='success'; status=0; actualOk=$false; pass=$false; note='No pending request id found' })
}

$followCB = Invoke-Api -Method 'POST' -Path '/api/follow-request' -Token $cToken -Body @{ receiverId = $bId }
Add-Result -feature 'follow.send.CtoB' -response $followCB -expectedOk $true

$pendingB2 = Invoke-Api -Method 'GET' -Path '/api/follow-requests' -Token $bToken
$requestCB = ''
if ($pendingB2.ok -and $pendingB2.data.requests) {
  foreach ($req in $pendingB2.data.requests) {
    if ($req.senderId._id -eq $cId) { $requestCB = $req._id }
  }
}
if ($requestCB) {
  $rejectCB = Invoke-Api -Method 'POST' -Path '/api/follow-request/reject' -Token $bToken -Body @{ requestId = $requestCB }
  Add-Result -feature 'follow.reject' -response $rejectCB -expectedOk $true
} else {
  [void]$results.Add([pscustomobject]@{ feature='follow.reject'; expected='success'; status=0; actualOk=$false; pass=$false; note='No pending C->B request id found' })
}

# Chat
$msgSend = Invoke-Api -Method 'POST' -Path '/api/messages' -Token $aToken -Body @{ receiverId = $bId; message = 'hello from full test' }
Add-Result -feature 'chat.send' -response $msgSend -expectedOk $true

$msgRead = Invoke-Api -Method 'GET' -Path "/api/messages/$aId" -Token $bToken
$msgCount = if ($msgRead.ok -and $msgRead.data.messages) { $msgRead.data.messages.Count } else { 0 }
Add-Result -feature 'chat.read' -response $msgRead -expectedOk $true -note "count=$msgCount"

$convos = Invoke-Api -Method 'GET' -Path '/api/conversations' -Token $aToken
$convoCount = if ($convos.ok -and $convos.data.conversations) { $convos.data.conversations.Count } else { 0 }
Add-Result -feature 'chat.conversations' -response $convos -expectedOk $true -note "count=$convoCount"

# Listings
$createListing = Invoke-Api -Method 'POST' -Path '/api/listings' -Token $aToken -Body @{
  category = 'tool'
  title = "Full Test Tractor $stamp"
  description = 'Test listing for full feature run'
  location = 'Pune'
  pricePerUnit = 1500
  unit = 'day'
  quantity = 1
  media = @()
  metadata = @{ rating = 4.5 }
}
$listingId = if ($createListing.ok) { $createListing.data.listing._id } else { '' }
Add-Result -feature 'listings.create' -response $createListing -expectedOk $true

$getListings = Invoke-Api -Method 'GET' -Path '/api/listings?category=tool&q=Full%20Test&location=Pune&minPrice=100&maxPrice=5000&minRating=4&sortBy=ratingDesc'
$listCount = if ($getListings.ok -and $getListings.data.listings) { $getListings.data.listings.Count } else { 0 }
Add-Result -feature 'listings.get.filtered' -response $getListings -expectedOk $true -note "count=$listCount"

$myListings = Invoke-Api -Method 'GET' -Path '/api/listings/me' -Token $aToken
$myListCount = if ($myListings.ok -and $myListings.data.listings) { $myListings.data.listings.Count } else { 0 }
Add-Result -feature 'listings.me' -response $myListings -expectedOk $true -note "count=$myListCount"

if ($listingId) {
  $statusInactive = Invoke-Api -Method 'PATCH' -Path "/api/listings/$listingId/status" -Token $aToken -Body @{ status='inactive' }
  Add-Result -feature 'listings.status.owner' -response $statusInactive -expectedOk $true

  $statusUnauthorized = Invoke-Api -Method 'PATCH' -Path "/api/listings/$listingId/status" -Token $bToken -Body @{ status='active' }
  Add-Result -feature 'listings.status.unauthorized' -response $statusUnauthorized -expectedOk $false

  $statusBackActive = Invoke-Api -Method 'PATCH' -Path "/api/listings/$listingId/status" -Token $aToken -Body @{ status='active' }
  Add-Result -feature 'listings.status.owner.revert' -response $statusBackActive -expectedOk $true
} else {
  [void]$results.Add([pscustomobject]@{ feature='listings.status'; expected='success'; status=0; actualOk=$false; pass=$false; note='listing not created' })
}

# Bookings
if ($listingId) {
  $bookingOwn = Invoke-Api -Method 'POST' -Path '/api/bookings' -Token $aToken -Body @{ listingId=$listingId; startDate='2026-03-25'; endDate='2026-03-26'; quantity=1 }
  Add-Result -feature 'bookings.create.own-listing' -response $bookingOwn -expectedOk $false

  $bookingCreate = Invoke-Api -Method 'POST' -Path '/api/bookings' -Token $bToken -Body @{ listingId=$listingId; startDate='2026-03-25'; endDate='2026-03-27'; quantity=1; notes='full test booking' }
  $bookingId = if ($bookingCreate.ok) { $bookingCreate.data.booking._id } else { '' }
  Add-Result -feature 'bookings.create' -response $bookingCreate -expectedOk $true

  $availability = Invoke-Api -Method 'GET' -Path "/api/bookings/availability/$listingId" -Token $aToken
  $ranges = if ($availability.ok -and $availability.data.unavailableRanges) { $availability.data.unavailableRanges.Count } else { 0 }
  Add-Result -feature 'bookings.availability' -response $availability -expectedOk $true -note "ranges=$ranges"

  $bookingsMeA = Invoke-Api -Method 'GET' -Path '/api/bookings/me' -Token $aToken
  Add-Result -feature 'bookings.me.owner' -response $bookingsMeA -expectedOk $true

  $bookingsMeB = Invoke-Api -Method 'GET' -Path '/api/bookings/me' -Token $bToken
  Add-Result -feature 'bookings.me.requester' -response $bookingsMeB -expectedOk $true

  if ($bookingId) {
    $acceptByOwner = Invoke-Api -Method 'PATCH' -Path "/api/bookings/$bookingId/status" -Token $aToken -Body @{ status='accepted' }
    Add-Result -feature 'bookings.accept' -response $acceptByOwner -expectedOk $true

    $requesterCannotRejectNow = Invoke-Api -Method 'PATCH' -Path "/api/bookings/$bookingId/status" -Token $bToken -Body @{ status='rejected' }
    Add-Result -feature 'bookings.requester.reject.forbidden' -response $requesterCannotRejectNow -expectedOk $false

    $completeByOwner = Invoke-Api -Method 'PATCH' -Path "/api/bookings/$bookingId/status" -Token $aToken -Body @{ status='completed'; paymentStatus='completed' }
    Add-Result -feature 'bookings.complete' -response $completeByOwner -expectedOk $true

    $createReview = Invoke-Api -Method 'POST' -Path '/api/reviews' -Token $bToken -Body @{ bookingId=$bookingId; revieweeId=$aId; rating=5; comment='Great experience' }
    Add-Result -feature 'reviews.create' -response $createReview -expectedOk $true
  }
}

# Reviews + profile
$getReviews = Invoke-Api -Method 'GET' -Path "/api/reviews/$aId"
$reviewTotal = if ($getReviews.ok -and $getReviews.data.summary) { $getReviews.data.summary.totalReviews } else { 0 }
Add-Result -feature 'reviews.get' -response $getReviews -expectedOk $true -note "total=$reviewTotal"

$profileMe = Invoke-Api -Method 'GET' -Path '/api/profile/me' -Token $aToken
Add-Result -feature 'profile.me' -response $profileMe -expectedOk $true

$profilePublic = Invoke-Api -Method 'GET' -Path "/api/users/$aId/profile" -Token $bToken
Add-Result -feature 'profile.public' -response $profilePublic -expectedOk $true

# Notifications
$notifList = Invoke-Api -Method 'GET' -Path '/api/notifications' -Token $aToken
$notifCount = if ($notifList.ok -and $notifList.data.notifications) { $notifList.data.notifications.Count } else { 0 }
Add-Result -feature 'notifications.list' -response $notifList -expectedOk $true -note "count=$notifCount"

$firstNotifId = ''
if ($notifList.ok -and $notifList.data.notifications.Count -gt 0) {
  $firstNotifId = $notifList.data.notifications[0]._id
}

if ($firstNotifId) {
  $markOne = Invoke-Api -Method 'PATCH' -Path "/api/notifications/$firstNotifId/read" -Token $aToken
  Add-Result -feature 'notifications.read.one' -response $markOne -expectedOk $true

  $deleteOne = Invoke-Api -Method 'DELETE' -Path "/api/notifications/$firstNotifId" -Token $aToken
  Add-Result -feature 'notifications.delete.one' -response $deleteOne -expectedOk $true
}

$readAll = Invoke-Api -Method 'PATCH' -Path '/api/notifications/read-all' -Token $aToken
Add-Result -feature 'notifications.read.all' -response $readAll -expectedOk $true

# Verification + admin review
$verStatus = Invoke-Api -Method 'GET' -Path '/api/verification/status' -Token $aToken
Add-Result -feature 'verification.status' -response $verStatus -expectedOk $true

$verSubmitAadhaar = Invoke-Api -Method 'POST' -Path '/api/verification/submit' -Token $aToken -Body @{ method='aadhaar'; aadhaarNumber='123456789012' }
Add-Result -feature 'verification.submit.aadhaar' -response $verSubmitAadhaar -expectedOk $true

$reviewVerification = Invoke-Api -Method 'POST' -Path '/api/verification/review' -Token $adminToken -Body @{ userId=$aId; status='verified' }
Add-Result -feature 'verification.review.admin' -response $reviewVerification -expectedOk $true

$reviewForbidden = Invoke-Api -Method 'POST' -Path '/api/verification/review' -Token $bToken -Body @{ userId=$aId; status='rejected'; reason='test' }
Add-Result -feature 'verification.review.non-admin' -response $reviewForbidden -expectedOk $false

# Admin insights
$adminInsights = Invoke-Api -Method 'GET' -Path '/api/admin/insights' -Token $adminToken
Add-Result -feature 'admin.insights.admin' -response $adminInsights -expectedOk $true

$adminForbidden = Invoke-Api -Method 'GET' -Path '/api/admin/insights' -Token $aToken
Add-Result -feature 'admin.insights.non-admin' -response $adminForbidden -expectedOk $false

# Crop recommendation
$cropOk = Invoke-Api -Method 'POST' -Path '/api/crop-recommend' -Body @{ nitrogen=90; phosphorus=42; potassium=43; temperature=20.9; humidity=82; ph=6.5; rainfall=202 }
Add-Result -feature 'crop.recommend.valid' -response $cropOk -expectedOk $true

$cropBad = Invoke-Api -Method 'POST' -Path '/api/crop-recommend' -Body @{ nitrogen='x'; phosphorus=42; potassium=43; temperature=20.9; humidity=82; ph=6.5; rainfall=202 }
Add-Result -feature 'crop.recommend.invalid' -response $cropBad -expectedOk $false

$failed = @($results | Where-Object { -not $_.pass })
$summary = [pscustomobject]@{
  total = $results.Count
  passed = ($results | Where-Object { $_.pass }).Count
  failed = $failed.Count
  failedFeatures = $failed
}

[pscustomobject]@{
  summary = $summary
  results = $results
} | ConvertTo-Json -Depth 8
