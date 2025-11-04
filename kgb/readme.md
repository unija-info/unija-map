# Peta Navigasi Interaktif Kampus UniSZA

## 1. Gambaran Keseluruhan Projek

Projek ini adalah sebuah laman web yang menyediakan panduan peta interaktif dan mudah diakses untuk Kampus Gong Badak (KGB). Tujuannya adalah untuk menggantikan panduan peta statik dengan versi digital yang boleh dicari, ditapis, dan sentiasa dikemas kini secara automatik.

## 2. Ciri-ciri Utama

Laman web ini direka untuk memberikan pengalaman pengguna yang menyeluruh:

-   **Peta Visual Interaktif:** Ilustrasi peta yang boleh diklik untuk paparan saiz penuh.
-   **Carian Langsung & Pintar:** Cari lokasi serta-merta berdasarkan nama, singkatan, info tambahan, atau kod nombor (cth., P01, A5).
-   **Penapisan Kategori Dinamik:** Butang kategori berwarna untuk menapis lokasi dengan pantas.
-   **Integrasi Google Maps & Lawatan Maya:** Setiap lokasi mempunyai pautan ke Google Maps, dan terdapat pautan terus ke Laman Lawatan Maya 360° rasmi UniSZA.
-   **Tarikh Kemas Kini Automatik:** Bahagian *footer* memaparkan tarikh dan masa kemas kini terakhir untuk peta dan data secara langsung dari GitHub, memberikan ketelusan penuh.
-   **Sistem Maklum Balas:** Halaman khas dengan borang Google Form terbenam untuk membolehkan pengguna memberi rating dan cadangan.
-   **Sumber Data Tunggal:** Semua data lokasi diuruskan sepenuhnya melalui satu Google Sheet, menjadikannya sangat mudah untuk dikemas kini.
-   **Reka Bentuk Responsif:** Antara muka dioptimumkan sepenuhnya untuk paparan pada peranti desktop dan mudah alih.

## 3. Aliran Kerja & Teknologi

Sistem ini direka untuk automasi maksimum, mengurangkan keperluan untuk penyuntingan kod secara langsung bagi pengurusan data.

**`Google Sheet`** → **`Google Apps Script`** → **`GitHub (map.json)`** → **`Laman Web`**

1.  **Sumber Data (Google Sheet):** Semua maklumat lokasi disimpan dan diuruskan dalam satu fail Google Sheet. Ini adalah satu-satunya tempat di mana data perlu diubah.
    -   **Pautan Google Sheet:** `https://docs.google.com/spreadsheets/d/13pyAleVZXs57ox8okhuyt6Rj8EEUx2TZkTzq_JEM7bE/edit?usp=sharing`

2.  **Automasi (Google Apps Script):** Satu skrip khas di dalam Google Sheet membaca data dari lajur yang ditetapkan, menukarnya ke format JSON, dan menghantar (`push`) fail `map.json` yang telah dikemas kini secara automatik ke repositori GitHub.

3.  **Paparan (Laman Web):** Apabila pengguna melawat laman web, `script.js` akan memuat turun `map.json` yang terkini dari GitHub. Teknik *cache busting* (`?v=...`) digunakan untuk memastikan pengguna sentiasa mendapat data yang paling baharu.

## 4. Struktur Projek

Berikut adalah penjelasan ringkas tentang fail-fail penting dan peranan masing-masing:

```
unija-map/
├── kgb/
│   ├── index.html     # Halaman utama (Peta & Direktori).
│   ├── info.html      # Halaman Dokumentasi, Kredit & Penafian.
│   ├── feedback.html  # Halaman untuk borang maklum balas.
│   ├── style.css      # Mengawal semua aspek visual (warna, fon, susun atur).
│   ├── script.js      # Otak laman web; mengendalikan logik, data, carian & penapisan.
│   │
│   ├── data/
│   │   └── map.json       # Pangkalan data JSON. DIBACA oleh laman web.
│   │
│   ├── file/
│   │   ├── 01_Map-Unija-KGB.pdf       # File peta ilustrasi dalam format PDF.
│   │   └── 02_Map-Unija-KGB.png       # File peta ilustrasi dalam format PNG.
│   │
│   └── README.md          # Fail dokumentasi ini.
│
└── vercel.json        # Fail konfigurasi untuk pengehosan di Vercel.

```

## 5. Panduan Pengurusan & Kemas Kini

Berikut adalah panduan langkah demi langkah untuk tugas-tugas pengurusan biasa.

### 5.1 Mengemas Kini atau Menambah Lokasi

1.  **Buka Google Sheet** menggunakan pautan di atas.
2.  Pergi ke helaian (tab) bernama `JSON DATA`.
3.  **Edit** baris sedia ada atau **tambah baris baharu** untuk lokasi baharu. Pastikan semua lajur yang diperlukan (`number`, `place`, `locationType`, `googleMapLink`) diisi.
4.  Setelah selesai, pergi ke menu **Campus Map Guide > Update Website Data**.
5.  Klik **"Yes"** pada dialog pengesahan dan tunggu mesej "Success!". Laman web anda kini telah dikemas kini.

### 5.2 Menambah Kategori Baharu

1.  **Di Google Sheet:** Tambah nama kategori baharu itu dalam lajur `locationType`.
2.  **Jalankan Skrip:** Pergi ke **Campus Map Guide > Update Website Data**. Butang penapis baharu akan muncul di laman web (berwarna kelabu).
3.  **Tambah Warna (dalam `style.css`):**
    -   Buka fail `kgb/style.css` dan pergi ke bahagian `/* UPDATED COLOR RULES */`.
    -   Tambah peraturan CSS baharu. Nama kelas mestilah dalam huruf kecil dan menggantikan `&` serta ruang dengan `-`.
        ```css
        /* CONTOH: MAKMAL PENYELIDIKAN */
        .label-makmal-penyelidikan {
            background-color: #A020F0; /* Pilih warna anda */
            color: white;
        }
        ```
4.  **Tetapkan Susunan Butang (dalam `script.js`):**
    -   Buka fail `kgb/script.js` dan cari tatasusunan (array) `desiredOrder`.
    -   Tambah nama kategori baharu anda di dalam senarai itu pada kedudukan yang anda inginkan.
        ```javascript
        const desiredOrder = [
            "PENTADBIRAN & PTJ",
            "BLOK AKADEMIK & KELAS",
            // ...kategori lain...
            "MAKMAL PENYELIDIKAN" // Tambah di sini
        ];
        ```
5.  **Simpan dan `push`** perubahan pada `style.css` dan `script.js` ke GitHub.

## 6. Pembangunan Tempatan (Local Development)

Untuk menguji perubahan pada reka bentuk atau fungsi sebelum memuat naiknya:

1.  **Prasyarat:**
    -   [Visual Studio Code (VS Code)](https://code.visualstudio.com/)
    -   Sambungan (extension) **Live Server** dalam VS Code.
2.  **Langkah-langkah:**
    -   `Clone` repositori ini ke komputer anda.
    -   Buka folder projek dalam VS Code.
    -   Di sudut kanan bawah VS Code, klik butang **"Go Live"**.
3.  Perubahan pada fail akan dipaparkan secara langsung dalam pelayar web anda.

## 7. Penghargaan & Sumber Rujukan

Projek ini tidak akan terhasil tanpa sumber dan inspirasi daripada pihak berikut:
*   **unija.info**: Untuk idea asal, logo, ilustrasi peta, dan data lokasi.
*   **Peta Rujukan**:
    *   [Peta PMKI](https://drive.google.com/file/d/12_48caoXQxW7gYJHVKLnkm2Qm0aRKT-i/view) oleh Exco Kebajikan PMKI 18/19.
    *   [Peta Lama oleh PPHB](https://jpp.unisza.edu.my/index.php?option=com_content&view=article&id=121&Itemid=209).
    *   Peta Lokasi oleh Pejabat Kolej Kediaman ([Peta Baru](https://www.unisza.edu.my/kolejkediaman/index.php?option=com_content&view=article&id=54&Itemid=233) / [Peta Lama](https://pkp.unisza.edu.my/index.php?option=com_content&view=article&id=54&Itemid=233)).
*   **Perisian & Perkhidmatan**: Adobe Illustrator, Google Fonts, GitHub, Vercel.
*   **Pembangun**: [Sila letakkan nama anda di sini].
