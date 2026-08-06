# Blu-Vault 🎬 CD / Blu-ray / DVD & Physical Media Collection Manager

**Blu-Vault** is a sleek, homelab-ready physical media and video collection manager built for cinephiles, physical disc collectors, and home server enthusiasts. Easily catalog, organize, and track your 4K Ultra HD, Blu-ray, DVD, VHS, and digital media collections with full TMDB metadata integration, barcode scanning, season boxart customization, and loan tracking.

---

## 🌟 Key Features

### 📦 Physical Format & Vault Cataloging
- **Multi-Format Support**: Track 4K Ultra HD Blu-ray, 3D Blu-ray, Standard Blu-ray, DVD, VHS, LaserDisc, and Digital copies.
- **Media Types**: Manage Movies, TV Shows, Anime, and Mini-Series.
- **Ownership & Location**: Note specific shelf locations, audio formats (Dolby Atmos, DTS:X), audio channels, disc counts, and condition notes.

### 🔍 TMDB Metadata Integration
- **Instant Search & Fetch**: Automatic metadata fetching via The Movie Database (TMDB) for posters, backdrops, cast & crew details, plot synopses, runtime, and ratings.
- **Custom Boxart & Artwork**: Override poster art, backdrop banners, or season covers with custom image URLs at any time.

### 🎌 TV & Anime Season Segmenter
- **Multi-Season Boxset Splitting**: Segment single catalog entries for long anime runs (e.g., *Dragon Ball*, *Dragon Ball Z*, *Naruto*) into distinct home media season boxsets.
- **Season Boxart Management**: Assign and edit dedicated boxart posters for each season.
- **Episode Guide & Progress Tracking**: Track watched episodes individually or batch-mark seasons as completed.

### 📷 Barcode / UPC Scanner
- **Camera Scanning**: Built-in camera barcode scanner powered by `html5-qrcode` for instant scanning of EAN/UPC barcodes directly from physical disc cases.

### 🤝 Loan & Lending Manager
- **Track Borrower Details**: Record borrower names, loan dates, expected return dates, and return status to ensure your physical discs are never lost.

### 📊 Collection Analytics & Dashboard
- **Visual Stats**: Real-time graphs and metrics breaking down your collection by format ratio, total titles, season/episode watch counts, and active loans.
- **Filtering & Sorting**: Sort by title, release date, date added, or rating. Filter instantly by format (4K UHD, Blu-ray, DVD), type (Movie, TV, Anime), favorites, or active loans.

### 💾 Backup & Data Management
- **JSON & CSV Export/Import**: Export complete collection data for homelab backups and data portability.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS v4, Motion (Animations), Lucide React (Icons).
- **Backend**: Node.js, Express (TypeScript), `tsx` dev environment, `esbuild` production bundler.
- **Metadata Provider**: TMDB (The Movie Database) API proxy.
- **Hardware Integration**: HTML5 QR & Barcode Reader API (`html5-qrcode`).

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18 or higher
- npm

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/blu-vault.git
   cd blu-vault
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables** *(Optional)*:
   Create a `.env` file or configure TMDB API key in app settings:
   ```env
   TMDB_API_KEY=your_tmdb_api_key_here
   ```
   *Note: You can also enter your TMDB API Key directly within the Blu-Vault Settings menu in the web app.*

4. **Run Development Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

5. **Build for Production**:
   ```bash
   npm run build
   npm start
   ```

---

## 📁 Project Structure

```
├── src/
│   ├── components/       # Modals, Detail Views, Season Segmenter, Scanner & Controls
│   ├── lib/              # API Client & Helper utilities
│   ├── types.ts          # Core TypeScript Interfaces (MediaItem, Season, Episode, etc.)
│   ├── App.tsx           # Main Application Dashboard
│   └── main.tsx          # React Entry Point
├── server.ts             # Express API proxy, TMDB fetchers, & in-memory DB persistence
├── metadata.json         # Platform configuration & metadata
└── package.json          # Node dependencies & scripts
```

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for details.
