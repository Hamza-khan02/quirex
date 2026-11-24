# Quirex

A real-estate web app where admins list properties and users browse and buy them.

- **Backend:** Express 5, MongoDB (Mongoose), JWT login, bcrypt password hashing (`Backend/`)
- **Frontend:** React 19, Vite, React Router, Bootstrap (`frontend/`)

## Requirements

- Node.js 20 or newer
- MongoDB running locally, or a MongoDB Atlas connection string

## Setup

### 1. Backend

```bash
cd Backend
npm install
cp .env.example .env
```

Edit `Backend/.env`:

| Variable | What it is |
|---|---|
| `PORT` | API port (default `9000`) |
| `MONGODB_URI` | MongoDB connection string |
| `CLIENT_URL` | Frontend URL allowed by CORS (default `http://localhost:5173`) |
| `JWT_SECRET` | Long random string that signs login tokens. Generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `JWT_EXPIRES_IN` | How long a login lasts (default `7d`) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Admin account created by `npm run seed:admin` |

Create the admin account, then start the API:

```bash
npm run seed:admin
npm run dev        # or: npm start
```

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:5173.

## Scripts

| Folder | Command | Does |
|---|---|---|
| `Backend` | `npm run dev` | Start the API with auto-reload |
| `Backend` | `npm start` | Start the API |
| `Backend` | `npm run seed:admin` | Create or reset the admin account from `.env` |
| `frontend` | `npm run dev` | Start the dev server |
| `frontend` | `npm run build` | Production build into `frontend/dist` |
| `frontend` | `npm run lint` | Run ESLint |

## API

All routes are under `/api`. Every response looks like `{ code, message, data }`, and the HTTP status matches `code`.

Logged-in requests send `Authorization: Bearer <token>`, using the token returned by `/api/login`.

| Method | Route | Who |
|---|---|---|
| POST | `/user-register` | Anyone (multipart, `profile` image required) |
| POST | `/login` | Anyone. Returns `{ token, user }` |
| GET | `/property-list` | Anyone. Search and filter, see below |
| GET | `/property/:id` | Anyone. One property with `status` and `rating` |
| GET | `/property/:id/reviews` | Anyone |
| POST | `/property/:id/reviews` | Users. `{ rating: 1-5, comment? }`; posting again updates your review |
| POST | `/delete-review` | The review's author, or an admin |
| POST | `/contact` | Anyone. `name`, `email`, `message`, optional `propertyId` |
| PUT | `/user-update` | Logged in (own profile; password and picture optional) |
| POST | `/buy` | Users. Buys a sale listing or rents a rent listing |
| POST | `/user-bought-list` | Logged in |
| GET | `/admin-dashboard` | Admin. Counts, recent sales and recent enquiries |
| POST | `/add-property` | Admin (multipart, `pic` image required) |
| PUT | `/update-property` | Admin (multipart with `_id`; `pic` optional) |
| POST | `/delete-property` | Admin |
| GET | `/admin-sold-list` | Admin |
| POST | `/delete-sold-item` | Admin |
| GET | `/admin-user-list` | Admin |
| POST | `/admin-toggle-block` | Admin. `{ _id, isBlocked }`; blocked users can't log in |
| GET | `/admin-contact-list` | Admin |
| POST | `/admin-contact-read` | Admin. `{ _id, isRead }` |
| POST | `/delete-contact` | Admin |

### Searching properties

`GET /api/property-list` takes these optional query parameters:

| Parameter | Meaning |
|---|---|
| `q` | Text matched against title, location and description |
| `location` | Text matched against location |
| `listingType` | `sale` or `rent` |
| `propertyType` | `house`, `flat`, `shop` or `land` |
| `minPrice`, `maxPrice` | Price range (monthly rent for rentals) |
| `bedrooms` | Minimum number of bedrooms |
| `available` | `true` hides sold and rented properties |
| `sort` | `newest` (default), `price_asc` or `price_desc` |
| `page`, `limit` | Pagination; `limit` defaults to 12, at most 50 |

It responds with `{ items, total, page, pages, limit }`. Each item has `status` (`available`, `sold` or `rented`) and `rating` (`{ average, count }`).

### Upgrading an existing database

Older versions stored price and area as text, and used "area" for the number of bedrooms. When the server starts, it converts any such properties once: prices become numbers, small area values move to `bedrooms` (larger ones are kept as square feet), and properties get the type `house` and listing `sale`. Check the converted listings in the admin panel afterwards.

Uploaded images are served from `/img/<filename>`. They must be JPG, PNG, WEBP, GIF or AVIF, up to 5 MB.
