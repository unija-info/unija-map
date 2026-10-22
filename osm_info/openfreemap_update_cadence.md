Here is a clean, self-contained Markdown file (`openfreemap_update_cadence.md`) formatted as an instruction reference for automated agents or developers.

***

```markdown
# OpenFreeMap OSM Update Cadence & Verification Guide

This document defines how to programmatically determine the current data version of OpenFreeMap and predict the next data release from OpenStreetMap (OSM).

---

## 1. Release Schedule & Cadence

OpenFreeMap processes full-planet updates on a fixed **weekly automated schedule**:

| Day / Time (UTC) | Pipeline Stage | Description |
| :--- | :--- | :--- |
| **Sunday 08:00 UTC** | **OSM Cutoff & Build Start** | The tile generator pulls the latest OSM planet extract and initiates Planetiler compilation. **OSM edits must be committed before this cutoff** to be included. |
| **Tuesday 08:00 UTC** | **Version Promotion** | The automated pipeline flags the new build as active (`set-version planet`). |
| **Tuesday ~08:00–09:00 UTC** | **Production Rollout** | Production edge nodes and instances poll for version updates (1-minute intervals) and cut over to the new dataset. |

### Rule of Thumb for Next Update
* **Live Deployment:** Every **Tuesday at ~08:00 UTC**.
* **Edit Inclusion:** If an OSM edit was made:
  * **Before Sunday 08:00 UTC:** It will go live that same week on **Tuesday at ~08:00 UTC**.
  * **After Sunday 08:00 UTC:** It will roll over into the **following week's Tuesday release**.

---

## 2. Programmatic Verification (Agent Procedures)

Agents can query the following endpoints to check the active version and the exact snapshot timestamp of the underlying OSM data.

### Option A: Query TileJSON Endpoint (Fastest)

Fetch the active TileJSON manifest and extract the version string from the tile URL pattern:

```bash
curl -s https://tiles.openfreemap.org/planet | jq -r '.tiles[0]'
```

**Expected output format:**
```text
https://tiles.openfreemap.org/planet/YYYYMMDD_HHMMSS_pt/{z}/{x}/{y}.pbf
```

* **Interpretation:** The path segment `YYYYMMDD_HHMMSS_pt` (e.g., `20261011_080001_pt`) denotes the dataset build ID. The leading `YYYYMMDD` indicates the build date.

---

### Option B: Query `osm_date` via Storage Bucket (Most Accurate)

To inspect the exact timestamp of the OpenStreetMap source dump used to generate the tiles:

1. **Get the latest active version string:**
   ```bash
   VERSION=$(curl -s https://tiles.openfreemap.org/planet | jq -r '.tiles[0]' | sed -E 's|.*/planet/([^/]+)/.*|\1|')
   ```

2. **Fetch the `osm_date` file:**
   ```bash
   curl -s "https://btrfs.openfreemap.com/areas/planet/${VERSION}/osm_date"
   ```

**Expected output:**
An ISO-8601 date string representing the exact OSM database state captured in that build (e.g., `2026-10-11T00:00:00Z`).

---

### Option C: Inspect Bucket Index Directly

To list recent planet builds and see if a new run has uploaded but not yet deployed:

```bash
curl -s https://btrfs.openfreemap.com/files.txt | grep 'areas/planet/' | tail -n 20
```

---

## 3. Decision Logic for Agents

When an agent needs to verify if an OSM feature change is live:

```text
1. Fetch current deployed VERSION via Option A.
2. Read the OSM cutoff date via Option B (https://btrfs.openfreemap.com/areas/planet/${VERSION}/osm_date).
3. Compare:
   IF (osm_feature_edit_timestamp < osm_date):
       STATUS = "Live / Available"
   ELSE:
       STATUS = "Pending next release"
       NEXT_RELEASE_ESTIMATE = Next Tuesday at 08:00 UTC
```
```