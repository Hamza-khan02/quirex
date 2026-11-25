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
| --- | --- |
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

Open <http://localhost:5173>.

## Scripts

| Folder | Command | Does |
| --- | --- | --- |
| `Backend` | `npm run dev` | Start the API with auto-reload |
| `Backend` | `npm start` | Start the API |
| `Backend` | `npm run seed:admin` | Create or reset the admin account from `.env` |
| `frontend` | `npm run dev` | Start the dev server |
| `frontend` | `npm run build` | Production build into `frontend/dist` |
| `frontend` | `npm run lint` | Run ESLint |
| `Backend` | `npm test` | Run the API tests |
| `e2e` | `npm test` | Run the browser tests |

## Tests

Both test suites need MongoDB running locally. They create their own databases named `quirex_test_*`, upload images to temporary folders, and delete everything afterwards. Your `quirex` database and `Backend/uploads` folder are never touched. To use a different MongoDB, set `TEST_MONGODB_URL` (for example `mongodb://127.0.0.1:27018`).

**API tests** (`Backend/test/`) start the API and call it over HTTP. They cover registration, login and roles, injection attempts, uploads, buying and renting, concurrent approvals, search and filters, reviews, the wishlist, rate limits, CORS, and image storage on Cloudinary (against a fake Cloudinary server, so no account is needed).

```bash
cd Backend
npm test
```

**Browser tests** (`e2e/`) start the API, the Vite dev server and a headless browser, and click through the site as a visitor, a user and an admin. They need the `Backend` and `frontend` dependencies installed. On Windows they use Microsoft Edge; elsewhere, install Chromium once with `npx playwright-core install chromium`, or set `PLAYWRIGHT_CHANNEL` to `chrome` or `msedge`. Screenshots are saved to `e2e/test-results/`.

```bash
cd e2e
npm install
npm test
```

**GitHub Actions** ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs the API tests, the frontend lint and build, and the browser tests on every pull request and every push to `main`.

## API

All routes are under `/api`. Every response looks like `{ code, message, data }`, and the HTTP status matches `code`.

Logged-in requests send `Authorization: Bearer <token>`, using the token returned by `/api/login`.

| Method | Route | Who |
| --- | --- | --- |
| POST | `/user-register` | Anyone (multipart, `profile` image required) |
| POST | `/login` | Anyone. Returns `{ token, user }` |
| GET | `/health` | Anyone. `{ database: "connected" }` when the API and database are up |
| GET | `/property-list` | Anyone. Search and filter, see below |
| GET | `/property/:id` | Anyone. One property with `status` and `rating` |
| GET | `/property/:id/reviews` | Anyone |
| POST | `/property/:id/reviews` | Users. `{ rating: 1-5, comment? }`; posting again updates your review |
| POST | `/delete-review` | The review's author, or an admin |
| POST | `/contact` | Anyone. `name`, `email`, `message`, optional `propertyId` |
| PUT | `/user-update` | Logged in (own profile; password and picture optional) |
| POST | `/buy` | Users. Sends a request to buy (sale listing) or rent (rental); the admin approves it |
| GET | `/my-requests` | Users. Their requests and the admin's decisions |
| POST | `/cancel-request` | Users. `{ _id }` of their own pending request |
| POST | `/user-bought-list` | Logged in. Properties they bought or rented |
| POST | `/wishlist-toggle` | Users. `{ propertyId }`; saves or removes it, returns `{ saved }` |
| GET | `/wishlist` | Users. Saved properties |
| GET | `/admin-dashboard` | Admin. Counts, recent deals and recent enquiries |
| GET | `/admin-request-list` | Admin. Optional `?status=pending` (or approved, rejected, cancelled) |
| POST | `/admin-approve-request` | Admin. `{ _id }`; sells or rents the property and rejects other pending requests for it |
| POST | `/admin-reject-request` | Admin. `{ _id, note? }`; the note is shown to the user |
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
| --- | --- |
| `q` | Text matched against title, location and description |
| `location` | Text matched against location |
| `listingType` | `sale` or `rent` |
| `propertyType` | `house`, `flat`, `shop` or `land` |
| `minPrice`, `maxPrice` | Price range (monthly rent for rentals) |
| `bedrooms` | Minimum number of bedrooms |
| `available` | `true` hides sold and rented properties |
| `sort` | `newest` (default), `price_asc` or `price_desc` |
| `page`, `limit` | Pagination; `limit` defaults to 12, at most 50 |

It responds with `{ items, total, page, pages, limit }`. Each item has `status` (`available`, `sold` or `rented`) and `rating` (`{ average, count }`). When the request carries a login token, items also say whether that user saved the property (`isSaved`) or has a pending request for it (`hasPendingRequest`); for admins, `pendingRequests` counts the requests waiting for a decision.

### Upgrading an existing database

Older versions stored price and area as text, and used "area" for the number of bedrooms. When the server starts, it converts any such properties once: prices become numbers, small area values move to `bedrooms` (larger ones are kept as square feet), and properties get the type `house` and listing `sale`. Check the converted listings in the admin panel afterwards.

Uploaded images are served from `/img/<filename>`. They must be JPG, PNG, WEBP, GIF or AVIF, up to 5 MB.

## Deployment

The usual free setup is MongoDB Atlas for the database, Cloudinary for uploaded images, Render for the API and Vercel for the frontend. You need an account on each.

### 1. Database: MongoDB Atlas

1. Create a free cluster at <https://www.mongodb.com/atlas>.
2. Under **Database Access**, add a database user with a password.
3. Under **Network Access**, allow access from anywhere (`0.0.0.0/0`), because Render's IP addresses change.
4. Click **Connect > Drivers** and copy the connection string. Put the user's password in it and add the database name, for example `mongodb+srv://user:password@cluster0.xxxxx.mongodb.net/quirex`.

### Images: Cloudinary

Render's free plan wipes the server's disk on every deploy and restart, so uploaded images must be stored elsewhere.

1. Create a free account at <https://cloudinary.com>.
2. In the dashboard, open **Settings > API Keys** and copy the **API environment variable**. It looks like `cloudinary://123456789012345:abcdEFGH...@your-cloud-name`.
3. Use it as `CLOUDINARY_URL` in the next step. Images then go to a `quirex` folder in your Cloudinary media library (set `CLOUDINARY_FOLDER` to change it).

You can also put `CLOUDINARY_URL` in `Backend/.env` to use Cloudinary while developing locally. Images uploaded before it was set stay in `Backend/uploads` and keep working.

### 2. API: Render

1. Push this repository to GitHub.
2. In Render, choose **New > Blueprint** and pick the repository. It reads [render.yaml](render.yaml).
3. When asked, set `MONGODB_URI` to the Atlas connection string and `CLOUDINARY_URL` to the Cloudinary value. Leave `CLIENT_URL` as `http://localhost:5173` for now; you will change it after step 3.
4. When the deploy finishes, open `https://<your-service>.onrender.com/api/health`. It should show `"database": "connected"` and `"storage": "cloudinary"`.
5. Create the admin account in the new database from your computer:

   ```bash
   cd Backend
   MONGODB_URI="<atlas connection string>" ADMIN_PASSWORD="<a strong password>" npm run seed:admin
   ```

   (In PowerShell, set the variables first with `$env:MONGODB_URI="..."` and `$env:ADMIN_PASSWORD="..."`.)

### 3. Frontend: Vercel

1. In Vercel, choose **Add New > Project**, import the repository and set **Root Directory** to `frontend`. Vercel detects Vite.
2. Add the environment variables `VITE_API_BASE_URL` and `VITE_IMAGE_BASE_URL`, both set to your Render URL (for example `https://quirex-api.onrender.com`), then deploy.
3. [frontend/vercel.json](frontend/vercel.json) sends every path to `index.html`, so refreshing a page such as `/property/123` works.

### 4. Connect them

In Render, set `CLIENT_URL` to your Vercel URL (for example `https://quirex.vercel.app`). Separate several URLs with commas. Save, and Render redeploys.

### Things to know

- **Set `CLOUDINARY_URL` on Render.** Without it, images are saved on the server's disk, which the free plan wipes on every deploy and restart, so property and profile pictures disappear. (On a paid plan you could instead attach a disk and point `UPLOAD_DIR` at it.)
- **The free Render instance sleeps** after about 15 minutes without traffic, so the first request after that takes up to a minute.
- **Rate limits:** login, register and contact allow `RATE_LIMIT_MAX` attempts (default 20) per IP every 15 minutes. `TRUST_PROXY=1` (already set in render.yaml) lets the limit see each visitor's own IP.
- **`JWT_SECRET`** is required when `NODE_ENV=production`; the blueprint generates one. Changing it logs everyone out.
