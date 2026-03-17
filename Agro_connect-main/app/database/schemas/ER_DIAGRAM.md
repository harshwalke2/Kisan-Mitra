# AgroConnect Database ER Diagram

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                    USERS                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ PK  id: UUID                                                                │
│     name: VARCHAR(255)                                                      │
│     email: VARCHAR(255) UNIQUE                                              │
│     password: VARCHAR(255)                                                  │
│     phone: VARCHAR(20)                                                      │
│     role: ENUM('farmer', 'admin')                                           │
│     farm_name: VARCHAR(255)                                                 │
│     farm_size: DECIMAL(10,2)                                                │
│     crops_grown: JSONB                                                      │
│     soil_type: VARCHAR(50)                                                  │
│     latitude: DECIMAL(10,8)                                                 │
│     longitude: DECIMAL(11,8)                                                │
│     address: VARCHAR(500)                                                   │
│     state: VARCHAR(100)                                                     │
│     preferred_language: VARCHAR(10)                                         │
│     avatar_url: VARCHAR(500)                                                │
│     is_active: BOOLEAN                                                      │
│     created_at: TIMESTAMP                                                   │
│     updated_at: TIMESTAMP                                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          │                           │                           │
          ▼                           ▼                           ▼
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│  CROP_HEALTH_RECORDS│  │    FARM_ALERTS      │  │    WEATHER_DATA     │
├─────────────────────┤  ├─────────────────────┤  ├─────────────────────┤
│ PK id: UUID         │  │ PK id: UUID         │  │ PK id: UUID         │
│ FK user_id: UUID    │  │ FK user_id: UUID    │  │ FK user_id: UUID    │
│    crop_name: VARCHAR│  │    type: ENUM       │  │    temperature: DEC │
│    health_score: INT│  │    severity: ENUM   │  │    humidity: INT    │
│    status: ENUM     │  │    message: TEXT    │  │    rainfall: DEC    │
│    issues: JSONB    │  │    location: VARCHAR│  │    wind_speed: DEC  │
│    recommendations  │  │    is_active: BOOL  │  │    forecast: JSONB  │
│    image_url: VARCHAR│  │    created_at: TS   │  │    recorded_at: TS  │
│    last_checked: TS │  └─────────────────────┘  └─────────────────────┘
└─────────────────────┘
          │
          │
          ▼
┌─────────────────────┐
│     SOIL_DATA       │
├─────────────────────┤
│ PK id: UUID         │
│ FK user_id: UUID    │
│    ph: DECIMAL(3,1) │
│    nitrogen: DEC    │
│    phosphorus: DEC  │
│    potassium: DEC   │
│    moisture: DEC    │
│    texture: VARCHAR │
│    tested_at: TS    │
└─────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                                 CROP_PRICES                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│ PK  id: UUID                                                                │
│     crop_name: VARCHAR(100)                                                 │
│     variety: VARCHAR(100)                                                   │
│     current_price: DECIMAL(10,2)                                            │
│     price_unit: VARCHAR(20)                                                 │
│     price_change: DECIMAL(10,2)                                             │
│     demand: ENUM('high','medium','low')                                     │
│     supply: ENUM('high','medium','low')                                     │
│     trend: ENUM('up','down','stable')                                       │
│     price_history: JSONB                                                    │
│     price_prediction: JSONB                                                 │
│     market_location: VARCHAR(255)                                           │
│     price_date: DATE                                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                      ▲
                                      │
┌─────────────────────────────────────────────────────────────────────────────┐
│                               CROP_LISTINGS                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│ PK  id: UUID                                                                │
│ FK  farmer_id: UUID → users.id                                              │
│     crop_name: VARCHAR(100)                                                 │
│     variety: VARCHAR(100)                                                   │
│     quantity: DECIMAL(10,2)                                                 │
│     quantity_unit: VARCHAR(20)                                              │
│     price_per_unit: DECIMAL(10,2)                                           │
│     min_order_quantity: DECIMAL(10,2)                                       │
│     quality: VARCHAR(50)                                                    │
│     is_organic: BOOLEAN                                                     │
│     harvest_date: DATE                                                      │
│     expiry_date: DATE                                                       │
│     images: JSONB                                                           │
│     description: TEXT                                                       │
│     location: VARCHAR(255)                                                  │
│     latitude: DECIMAL(10,8)                                                 │
│     longitude: DECIMAL(11,8)                                                │
│     status: ENUM('active','sold','expired')                                 │
│     created_at: TIMESTAMP                                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                  WISHLISTS                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ PK  id: UUID                                                                │
│ FK  user_id: UUID → users.id                                                │
│ FK  listing_id: UUID → crop_listings.id                                     │
│     created_at: TIMESTAMP                                                   │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                                    TOOLS                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ PK  id: UUID                                                                │
│ FK  owner_id: UUID → users.id                                               │
│     name: VARCHAR(255)                                                      │
│     category: VARCHAR(100)                                                  │
│     description: TEXT                                                       │
│     images: JSONB                                                           │
│     daily_rate: DECIMAL(10,2)                                               │
│     weekly_rate: DECIMAL(10,2)                                              │
│     monthly_rate: DECIMAL(10,2)                                             │
│     security_deposit: DECIMAL(10,2)                                         │
│     location: VARCHAR(255)                                                  │
│     condition: ENUM('new','excellent','good','fair')                        │
│     availability: JSONB                                                     │
│     specifications: JSONB                                                   │
│     rating: DECIMAL(2,1)                                                    │
│     review_count: INT                                                       │
│     status: ENUM('available','booked','unavailable')                        │
│     created_at: TIMESTAMP                                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                               TOOL_BOOKINGS                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│ PK  id: UUID                                                                │
│ FK  tool_id: UUID → tools.id                                                │
│ FK  borrower_id: UUID → users.id                                            │
│ FK  lender_id: UUID → users.id                                              │
│     start_date: DATE                                                        │
│     end_date: DATE                                                          │
│     total_amount: DECIMAL(10,2)                                             │
│     security_deposit: DECIMAL(10,2)                                         │
│     status: ENUM('pending','approved','rejected','active','completed')      │
│     remarks: TEXT                                                           │
│     created_at: TIMESTAMP                                                   │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                               LAND_LISTINGS                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│ PK  id: UUID                                                                │
│ FK  owner_id: UUID → users.id                                               │
│     title: VARCHAR(255)                                                     │
│     description: TEXT                                                       │
│     images: JSONB                                                           │
│     size: DECIMAL(10,2)                                                     │
│     size_unit: VARCHAR(20)                                                  │
│     soil_type: VARCHAR(50)                                                  │
│     location: VARCHAR(255)                                                  │
│     monthly_rent: DECIMAL(10,2)                                             │
│     min_lease_period: INT                                                   │
│     max_lease_period: INT                                                   │
│     facilities: JSONB                                                       │
│     water_source: VARCHAR(100)                                              │
│     is_fenced: BOOLEAN                                                      │
│     availability: JSONB                                                     │
│     rating: DECIMAL(2,1)                                                    │
│     status: ENUM('available','booked','unavailable')                        │
│     created_at: TIMESTAMP                                                   │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                                    CHATS                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ PK  id: UUID                                                                │
│     type: ENUM('direct','group')                                            │
│     name: VARCHAR(255)                                                      │
│     avatar_url: VARCHAR(500)                                                │
│ FK  created_by: UUID → users.id                                             │
│     created_at: TIMESTAMP                                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CHAT_PARTICIPANTS                                │
├─────────────────────────────────────────────────────────────────────────────┤
│ PK  id: UUID                                                                │
│ FK  chat_id: UUID → chats.id                                                │
│ FK  user_id: UUID → users.id                                                │
│     role: ENUM('admin','member')                                            │
│     joined_at: TIMESTAMP                                                    │
│     last_read_at: TIMESTAMP                                                 │
│     is_active: BOOLEAN                                                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                  MESSAGES                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│ PK  id: UUID                                                                │
│ FK  chat_id: UUID → chats.id                                                │
│ FK  sender_id: UUID → users.id                                              │
│     content: TEXT                                                           │
│     type: ENUM('text','image','video','file')                               │
│     media_url: VARCHAR(500)                                                 │
│     is_read: BOOLEAN                                                        │
│     read_at: TIMESTAMP                                                      │
│     created_at: TIMESTAMP                                                   │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              GOVERNMENT_SCHEMES                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ PK  id: UUID                                                                │
│     title: VARCHAR(500)                                                     │
│     description: TEXT                                                       │
│     category: VARCHAR(100)                                                  │
│     eligibility: JSONB                                                      │
│     benefits: JSONB                                                         │
│     documents: JSONB                                                        │
│     application_process: TEXT                                               │
│     deadline: DATE                                                          │
│     state: VARCHAR(100)                                                     │
│     central_or_state: ENUM('central','state')                               │
│     official_link: VARCHAR(500)                                             │
│     image_url: VARCHAR(500)                                                 │
│     is_active: BOOLEAN                                                      │
│ FK  created_by: UUID → users.id                                             │
│     created_at: TIMESTAMP                                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            SCHEME_APPLICATIONS                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ PK  id: UUID                                                                │
│ FK  scheme_id: UUID → government_schemes.id                                 │
│ FK  farmer_id: UUID → users.id                                              │
│     status: ENUM('draft','submitted','under-review','approved','rejected')  │
│     documents: JSONB                                                        │
│     remarks: TEXT                                                           │
│     submitted_at: TIMESTAMP                                                 │
│     created_at: TIMESTAMP                                                   │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                               NOTIFICATIONS                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│ PK  id: UUID                                                                │
│ FK  user_id: UUID → users.id                                                │
│     title: VARCHAR(255)                                                     │
│     message: TEXT                                                           │
│     type: ENUM('info','warning','success','error','alert')                  │
│     category: ENUM('farm','market','tools','chat','scheme','system')        │
│     is_read: BOOLEAN                                                        │
│     read_at: TIMESTAMP                                                      │
│     action_url: VARCHAR(500)                                                │
│     created_at: TIMESTAMP                                                   │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                               USER_SESSIONS                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│ PK  id: UUID                                                                │
│ FK  user_id: UUID → users.id                                                │
│     socket_id: VARCHAR(255)                                                 │
│     ip_address: VARCHAR(45)                                                 │
│     user_agent: VARCHAR(500)                                                │
│     is_online: BOOLEAN                                                      │
│     last_active: TIMESTAMP                                                  │
│     created_at: TIMESTAMP                                                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Relationships Summary

### One-to-Many Relationships
- `users` → `crop_health_records`
- `users` → `farm_alerts`
- `users` → `weather_data`
- `users` → `soil_data`
- `users` → `crop_listings` (as farmer)
- `users` → `tools` (as owner)
- `users` → `tool_bookings` (as borrower/lender)
- `users` → `land_listings` (as owner)
- `users` → `messages` (as sender)
- `users` → `notifications`
- `chats` → `messages`
- `tools` → `tool_bookings`
- `government_schemes` → `scheme_applications`

### Many-to-Many Relationships
- `users` ↔ `chats` (through `chat_participants`)
- `users` ↔ `crop_listings` (through `wishlists`)
- `users` ↔ `government_schemes` (through `scheme_bookmarks`)
- `users` ↔ `users` (through `friends`)

## Indexes

### Primary Indexes
- All primary keys (id columns)
- Foreign keys for join optimization

### Performance Indexes
- `users.email` - Login queries
- `users.state` - Location-based filtering
- `crop_listings.status` - Active listings filter
- `crop_listings.crop_name` - Crop search
- `messages.chat_id` - Chat message retrieval
- `messages.created_at` - Message ordering
- `notifications.user_id` + `notifications.is_read` - Unread count

## Data Types

### PostgreSQL Specific
- `UUID` - Primary keys
- `JSONB` - Flexible schema data (arrays, objects)
- `ENUM` - Fixed value sets
- `DECIMAL` - Precise numeric values
- `TIMESTAMP` - Date and time
- `INET` - IP addresses (optional)

---

Last Updated: 2024
