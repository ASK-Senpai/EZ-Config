# Algolia Search Setup Guide for EZ-Config

This guide documents the complete setup of Algolia Search for EZ-Config, both via **automated script** and **manually inside the Algolia Dashboard**.

---

## 1. Environment Variables & Credentials

Ensure your `.env` contains the three required Algolia variables:

```env
# Algolia Search
NEXT_PUBLIC_ALGOLIA_APP_ID=YOUR_APP_ID
NEXT_PUBLIC_ALGOLIA_SEARCH_KEY=YOUR_SEARCH_ONLY_API_KEY
ALGOLIA_ADMIN_KEY=YOUR_ADMIN_API_KEY
```

### Where to find these in Algolia:
1. Log in to [Algolia Dashboard](https://dashboard.algolia.com).
2. Go to **Settings (Gear icon)** → **API Keys**.
3. Copy:
   - **Application ID** $\rightarrow$ `NEXT_PUBLIC_ALGOLIA_APP_ID`
   - **Search-Only API Key** $\rightarrow$ `NEXT_PUBLIC_ALGOLIA_SEARCH_KEY` (Safe for frontend/browser)
   - **Admin API Key** $\rightarrow$ `ALGOLIA_ADMIN_KEY` (Keep secret! Only used by backend/scripts)

---

## 2. Fast Track: Automated Setup (Recommended)

EZ-Config includes automated setup and sync scripts. Run these two commands in your terminal:

### Step 1: Configure Settings, Facets & Replicas
```bash
npx tsx scripts/configureAlgolia.ts
```
*Creates the base index `products_index`, sets searchable attributes, configures faceting filters, creates all 8 sort replica indices, and applies custom rankings.*

### Step 2: Sync Products from Firestore
```bash
npx tsx scripts/syncToAlgolia.ts
```
*Reads all non-legacy hardware documents from Firestore (`gpu`, `cpu`, `vgpu`, `motherboard`, `ram`, `storage`, `psu`), formats them, and uploads them in batches to Algolia.*

---

## 3. Manual Setup in Algolia Dashboard

If you prefer to configure everything manually through the web UI, follow these steps:

### Step 3.1: Create Primary Index
1. In the Algolia Dashboard, click **Search** in the left sidebar.
2. Select your Application from the top dropdown.
3. Click **Manage Index** → **Create Index**.
4. Name the index: `products_index`.

---

### Step 3.2: Configure Searchable Attributes
1. In `products_index`, click the **Configuration** tab.
2. In the left navigation, select **Searchable Attributes**.
3. Click **Add a Searchable Attribute** and add the following attributes (ordered by search priority):
   1. `name`
   2. `nameLowercase`
   3. `brand`
   4. `category`
   5. `socket`
   6. `chipset`
   7. `type`
4. Click **Review and Save Settings** at the bottom right.

---

### Step 3.3: Configure Facets (Filtering Attributes)
Algolia requires any attribute used in `filters:` to be declared as a facet.

1. Under the **Configuration** tab, select **Facets** (under *Filtering and Faceting*).
2. Under **Attributes for faceting**, click **Add an Attribute** for each:
   - `legacy` $\rightarrow$ set modifier to `filterOnly`
   - `category` $\rightarrow$ set modifier to `filterOnly`
   - `brand` $\rightarrow$ set modifier to `filterOnly`
   - `socket` $\rightarrow$ set modifier to `filterOnly`
   - `type` $\rightarrow$ set modifier to `filterOnly`
   - `chipset` $\rightarrow$ set modifier to `filterOnly`
   - `efficiency` $\rightarrow$ set modifier to `filterOnly`
   - `hasIntegratedGraphics` $\rightarrow$ set modifier to `filterOnly`
   - `wattage` $\rightarrow$ set modifier to `filterOnly`
3. Click **Review and Save Settings**.

---

### Step 3.4: Create the 8 Replica Indices (For Sorting)
EZ-Config uses Algolia replica indices to support fast sorting when browsing without a text search query.

1. Under the **Configuration** tab in `products_index`, select **Replicas** (under *Relevance strategy*).
2. Click **Create Replica Index** and choose **Standard Replica**.
3. Create the following 8 replicas:

| Replica Index Name | Purpose |
| :--- | :--- |
| `products_index_gaming_desc` | Sort by Gaming Score (High to Low) |
| `products_index_gaming_asc` | Sort by Gaming Score (Low to High) |
| `products_index_productivity_desc` | Sort by Productivity Score (High to Low) |
| `products_index_productivity_asc` | Sort by Productivity Score (Low to High) |
| `products_index_price_asc` | Sort by Price (Low to High) |
| `products_index_price_desc` | Sort by Price (High to Low) |
| `products_index_value_desc` | Sort by Value Score (High to Low) |
| `products_index_year_desc` | Sort by Launch Year (Newest First) |

4. Click **Review and Save Settings**.

---

### Step 3.5: Configure Custom Ranking on Each Replica
For each replica index created above, switch to that index in the dashboard and configure its ranking rule:

1. In the index selector dropdown at the top, select the replica index (e.g. `products_index_price_asc`).
2. Go to **Configuration** → **Ranking and Sorting**.
3. Under **Custom Ranking**, click **Add a Criterion**:

| Index | Custom Ranking Rule |
| :--- | :--- |
| `products_index_gaming_desc` | `desc(normalized.gamingScore)` |
| `products_index_gaming_asc` | `asc(normalized.gamingScore)` |
| `products_index_productivity_desc` | `desc(normalized.productivityScore)` |
| `products_index_productivity_asc` | `asc(normalized.productivityScore)` |
| `products_index_price_asc` | `asc(pricing.priceRange.min)` |
| `products_index_price_desc` | `desc(pricing.priceRange.min)` |
| `products_index_value_desc` | `desc(metrics.valueScore)` |
| `products_index_year_desc` | `desc(launchYear)` |

4. Click **Review and Save Settings** for each replica.

---

## 4. How Search Works in the Codebase

1. **[src/lib/search/searchService.ts](file:///f:/Aditya/Dev%20Drive/Projects/New-Project/EZ-Config/src/lib/search/searchService.ts)**:
   - Central point of entry for search.
   - Built-in 5-minute memory cache (`TTL_MS = 300_000`).
   - If user typed a search term: searches `products_index` (textual relevance).
   - If user is browsing without search text: routes to the corresponding replica index (e.g. `products_index_price_asc`).

2. **[src/components/search/GlobalSearch.tsx](file:///f:/Aditya/Dev%20Drive/Projects/New-Project/EZ-Config/src/components/search/GlobalSearch.tsx)**:
   - Command palette triggered by `Ctrl+K` / `Cmd+K`.
   - Calls `/api/search?q=...&limit=12`.
   - Groups results into categories (`gpu`, `cpu`, `ram`, etc.).

3. **[src/components/builder/ComponentSelectModal.tsx](file:///f:/Aditya/Dev%20Drive/Projects/New-Project/EZ-Config/src/components/builder/ComponentSelectModal.tsx)**:
   - Real-time catalog modal in the PC Builder.
   - Queries Algolia with facet filters for brand, socket, chipset, wattage, etc.
   - Performs physical compatibility post-checks against the active build.

---

## 5. Maintenance & Keeping Data Synced

Whenever you run price scrapers or add new components to Firestore:
```bash
# Re-sync Firestore to Algolia
npx tsx scripts/syncToAlgolia.ts
```
This will clear stale items and push updated pricing and specs to Algolia.
