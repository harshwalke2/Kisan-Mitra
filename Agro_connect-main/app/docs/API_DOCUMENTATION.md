# AgroConnect API Documentation

## Base URL
```
Development: http://localhost:5000/api
Production: https://api.agroconnect.com/api
```

## Authentication
All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Endpoints

### Authentication

#### POST /auth/register
Register a new user (farmer or admin).

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword",
  "phone": "+91 98765 43210",
  "role": "farmer",
  "farmName": "Green Valley Farm",
  "farmSize": 5.5,
  "location": "Pune, Maharashtra",
  "preferredLanguage": "en"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "farmer"
    },
    "token": "jwt_token_here"
  }
}
```

#### POST /auth/login
Login with email and password.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "farmer"
    },
    "token": "jwt_token_here"
  }
}
```

#### POST /auth/forgot-password
Request password reset link.

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

#### POST /auth/reset-password
Reset password with token.

**Request Body:**
```json
{
  "token": "reset_token",
  "password": "newpassword"
}
```

### Users

#### GET /users/profile
Get current user profile.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+91 98765 43210",
    "role": "farmer",
    "farmDetails": {
      "farmName": "Green Valley Farm",
      "farmSize": 5.5,
      "crops": ["Wheat", "Rice"],
      "soilType": "Loamy"
    },
    "location": {
      "latitude": 20.5937,
      "longitude": 78.9629,
      "address": "Pune, Maharashtra"
    },
    "preferredLanguage": "en"
  }
}
```

#### PUT /users/profile
Update user profile.

**Request Body:**
```json
{
  "name": "John Doe Updated",
  "phone": "+91 98765 43211",
  "farmDetails": {
    "farmName": "Updated Farm Name",
    "farmSize": 6.0
  }
}
```

### Farm Health

#### GET /farm/crops
Get all crops for the authenticated user.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "cropName": "Wheat",
      "healthScore": 85,
      "status": "healthy",
      "issues": [],
      "recommendations": ["Continue regular irrigation"],
      "lastChecked": "2024-03-15T10:00:00Z"
    }
  ]
}
```

#### POST /farm/crops/analyze
Analyze crop image using AI.

**Request:**
- Content-Type: multipart/form-data
- Body: image file

**Response:**
```json
{
  "success": true,
  "data": {
    "disease": "Leaf Rust",
    "confidence": 87,
    "severity": "moderate",
    "affectedArea": "15%",
    "recommendations": [
      "Apply fungicide containing propiconazole",
      "Remove infected leaves"
    ]
  }
}
```

#### GET /farm/weather
Get weather data for user's location.

**Response:**
```json
{
  "success": true,
  "data": {
    "temperature": 32,
    "humidity": 65,
    "rainfall": 2.5,
    "windSpeed": 12,
    "forecast": [
      {
        "date": "2024-03-16",
        "temp": 30,
        "condition": "Partly Cloudy"
      }
    ]
  }
}
```

#### GET /farm/alerts
Get active farm alerts.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "type": "fire",
      "severity": "critical",
      "message": "High temperature detected",
      "location": "Sector B",
      "timestamp": "2024-03-15T10:00:00Z"
    }
  ]
}
```

### Market Intelligence

#### GET /market/prices
Get current crop prices.

**Query Parameters:**
- `crop` (optional): Filter by crop name
- `location` (optional): Filter by location

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "cropName": "Wheat",
      "currentPrice": 2450,
      "priceUnit": "per quintal",
      "priceChange": 180,
      "priceChangePercent": 7.9,
      "demand": "high",
      "supply": "medium",
      "trend": "up"
    }
  ]
}
```

#### GET /market/listings
Get all crop listings.

**Query Parameters:**
- `crop` (optional): Filter by crop name
- `location` (optional): Filter by location
- `isOrganic` (optional): Filter organic crops
- `minPrice` (optional): Minimum price
- `maxPrice` (optional): Maximum price

#### POST /market/listings
Create a new crop listing.

**Request Body:**
```json
{
  "cropName": "Organic Wheat",
  "variety": "HD-2967",
  "quantity": 50,
  "quantityUnit": "quintals",
  "pricePerUnit": 2600,
  "minOrderQuantity": 5,
  "quality": "Grade A",
  "isOrganic": true,
  "harvestDate": "2024-04-15",
  "description": "Premium quality organic wheat"
}
```

### Tools & Equipment

#### GET /tools
Get all available tools.

**Query Parameters:**
- `category` (optional): Filter by category
- `location` (optional): Filter by location
- `minPrice` (optional): Minimum daily rate
- `maxPrice` (optional): Maximum daily rate

#### POST /tools
List a new tool.

**Request Body:**
```json
{
  "name": "Mahindra 575 DI Tractor",
  "category": "Tractor",
  "description": "45 HP tractor with power steering",
  "dailyRate": 1500,
  "securityDeposit": 10000,
  "location": "Pune, Maharashtra",
  "condition": "excellent"
}
```

#### POST /tools/:id/book
Book a tool.

**Request Body:**
```json
{
  "startDate": "2024-03-20",
  "endDate": "2024-03-25"
}
```

### Chat

#### GET /chat/conversations
Get all conversations for the user.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "type": "direct",
      "participants": [
        {
          "id": "uuid",
          "name": "Ramesh Patel",
          "isOnline": true
        }
      ],
      "lastMessage": {
        "content": "Hello!",
        "createdAt": "2024-03-15T10:00:00Z"
      },
      "unreadCount": 2
    }
  ]
}
```

#### GET /chat/:id/messages
Get messages for a conversation.

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Messages per page

#### POST /chat/:id/messages
Send a message.

**Request Body:**
```json
{
  "content": "Hello!",
  "type": "text"
}
```

### Government Schemes

#### GET /schemes
Get all government schemes.

**Query Parameters:**
- `state` (optional): Filter by state
- `category` (optional): Filter by category
- `search` (optional): Search in title/description

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "PM-KISAN",
      "description": "Income support for farmers",
      "category": "Income Support",
      "eligibility": ["Small and marginal farmers"],
      "benefits": ["Rs. 6000 per year"],
      "state": "All India",
      "deadline": "2024-12-31"
    }
  ]
}
```

#### POST /schemes/:id/apply
Apply for a scheme.

**Request Body:**
```json
{
  "documents": ["aadhaar.pdf", "land_record.pdf"]
}
```

### Notifications

#### GET /notifications
Get user notifications.

**Query Parameters:**
- `unreadOnly` (optional): Get only unread notifications
- `limit` (optional): Number of notifications

#### PUT /notifications/:id/read
Mark notification as read.

#### PUT /notifications/read-all
Mark all notifications as read.

## WebSocket Events

### Connection
```javascript
const socket = io('ws://localhost:5000', {
  auth: {
    token: 'your_jwt_token'
  }
});
```

### Events

#### Client -> Server
- `join_chat`: Join a chat room
- `send_message`: Send a message
- `typing`: Typing indicator
- `mark_read`: Mark messages as read

#### Server -> Client
- `new_message`: New message received
- `user_typing`: User is typing
- `user_online`: User came online
- `user_offline`: User went offline
- `notification`: New notification
- `price_alert`: Price change alert
- `farm_alert`: Farm-related alert

## Error Responses

All errors follow this format:
```json
{
  "success": false,
  "message": "Error description",
  "error": {
    "code": "ERROR_CODE",
    "details": {}
  }
}
```

### Common Error Codes
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Validation Error
- `500` - Internal Server Error

## Rate Limiting

API requests are limited to:
- 100 requests per 15 minutes for authenticated users
- 20 requests per 15 minutes for unauthenticated users

Rate limit headers are included in all responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```
