# Peta Navigasi Interaktif Kampus

## 1. Gambaran Keseluruhan Projek

Projek ini adalah sebuah laman web yang menyediakan panduan peta interaktif dan mudah diakses untuk Kampus Gong Badak (KGB). Tujuannya adalah untuk menggantikan panduan peta statik dengan versi digital yang boleh dicari, ditapis, dan sentiasa dikemas kini secara automatik.

### Ciri-ciri Utama
- **Peta Boleh Zum:** Pengguna boleh klik pada imej peta untuk melihatnya dalam saiz penuh.
- **Carian Langsung:** Kotak carian yang membolehkan pengguna mencari lokasi berdasarkan nama, singkatan, info tambahan, atau kod nombor (cth., P01, A5).
- **Penapisan Kategori:** Butang-butang kategori yang berwarna membolehkan pengguna menapis lokasi yang dipaparkan.
- **Reka Bentuk Responsif:** Antara muka yang dioptimumkan untuk paparan pada peranti desktop dan mudah alih.
- **Navigasi Mudah:** Butang "Kembali ke Atas" memudahkan navigasi pada halaman yang panjang.
- **Sumber Data Tunggal:** Semua data lokasi diuruskan sepenuhnya melalui satu Google Sheet, menjadikannya mudah untuk dikemas kini oleh sesiapa sahaja tanpa perlu menyentuh kod.

## 2. Struktur Projek

Berikut adalah penjelasan ringkas tentang fail-fail penting dan peranan masing-masing:

```
unija-map/
├── kgb/
│   ├── index.html     # Struktur utama dan kandungan HTML.
│   ├── style.css      # Mengawal semua aspek visual (warna, fon, susun atur).
│   └── script.js      # Otak laman web; mengendalikan logik, data, carian & penapisan.
├── data/
│   └── map.json       # Pangkalan data JSON yang dijana secara automatik. DIBACA oleh laman web.
├── vercel.json        # Fail konfigurasi untuk pengehosan di Vercel (URL kemas).
└── README.md          # Fail dokumentasi ini.
```

## 3. Aliran Kerja Pengurusan Data

Sistem ini direka untuk automasi. Pengemaskinian laman web tidak memerlukan sebarang penyuntingan kod secara langsung.

1.  **Sumber Data (Google Sheet):** Semua maklumat lokasi disimpan dan diuruskan dalam satu fail Google Sheet. Ini adalah satu-satunya tempat di mana data perlu diubah.
    - **Pautan Google Sheet:** `[PAUTAN KE GOOGLE SHEET ANDA DI SINI](https://docs.google.com/spreadsheets/d/13pyAleVZXs57ox8okhuyt6Rj8EEUx2TZkTzq_JEM7bE/edit?usp=sharing)`

2.  **Automasi (Google Apps Script):** Di dalam Google Sheet, terdapat satu skrip khas yang berfungsi sebagai jambatan. Apabila dijalankan, ia akan:
    - Membaca data dari lajur yang ditetapkan (`number`, `place`, dll.).
    - Mengabaikan lajur lain (seperti lajur nota peribadi).
    - Menukar data tersebut kepada format JSON yang bersih.
    - Menghantar (`push`) fail `map.json` yang telah dikemas kini secara automatik ke repositori GitHub.

3.  **Paparan (Laman Web):** Apabila pengguna melawat laman web, fail `script.js` akan memuat turun `map.json` yang terkini dari GitHub dan memaparkan data tersebut. Teknik *cache busting* (`?v=...`) digunakan untuk memastikan pengguna sentiasa mendapat data yang paling baharu.

## 4. Cara Mengemas Kini Laman Web

Berikut adalah panduan langkah demi langkah untuk tugas-tugas pengurusan biasa.

### 4.1 Mengemas Kini atau Menambah Lokasi

Ini adalah tugas yang paling kerap dilakukan.

1.  **Buka Google Sheet** menggunakan pautan di atas.
2.  Pergi ke helaian (tab) bernama `JSON DATA`.
3.  **Edit** baris sedia ada atau **tambah baris baharu** di bawah untuk lokasi baharu. Pastikan semua lajur yang diperlukan (`number`, `place`, `locationType`, `googleMapLink`) diisi.
4.  Setelah selesai, pergi ke menu **Campus Map Guide > Update Website Data**.
5.  Klik **"Yes"** pada dialog pengesahan.
6.  Tunggu mesej "Success!". Laman web anda kini telah dikemas kini.

### 4.2 Menambah Kategori Baharu

Jika anda perlu menambah kategori yang belum pernah wujud (contohnya, "MAKMAL PENYELIDIKAN").

1.  **Di Google Sheet:** Tambah nama kategori baharu itu dalam lajur `locationType` untuk lokasi yang berkenaan.
2.  **Jalankan Skrip:** Pergi ke **Campus Map Guide > Update Website Data**.
    - *Hasil:* Butang penapis untuk kategori baharu akan muncul di laman web, tetapi ia akan berwarna kelabu pudar (lalai).
3.  **Tambah Warna (dalam `style.css`):**
    - Buka fail `kgb/style.css`.
    - Pergi ke bahagian paling bawah (`/* Color Rules */`).
    - Tambah peraturan CSS baharu untuk kategori anda. Nama kelas mestilah dalam huruf kecil dan menggantikan `&` serta ruang dengan `-`.
      ```css
      /* CONTOH: MAKMAL PENYELIDIKAN */
      .label-makmal-penyelidikan {
          background-color: #your_new_color; /* Pilih warna anda */
          color: white;
      }
      ```
4.  **Tetapkan Susunan Butang (dalam `script.js`):**
    - Buka fail `kgb/script.js`.
    - Cari tatasusunan (array) `desiredOrder`.
    - Tambah nama kategori baharu anda di dalam senarai itu pada kedudukan yang anda inginkan.
      ```javascript
      const desiredOrder = [
          "PENTADBIRAN & PTJ",
          "BLOK AKADEMIK & KELAS",
          // ...kategori lain...
          "MAKMAL PENYELIDIKAN" // Tambah di sini
      ];
      ```
5.  **Simpan dan `push`** perubahan pada `style.css` dan `script.js` ke GitHub.

## 5. Persediaan Pembangunan Tempatan (Local Development)

Jika anda ingin menguji perubahan pada reka bentuk atau fungsi sebelum memuat naiknya, ikuti langkah-langkah ini.

1.  **Prasyarat:**
    - [Visual Studio Code (VS Code)](https://code.visualstudio.com/)
    - Sambungan (extension) **Live Server** dalam VS Code.
2.  **Langkah-langkah:**
    - `Clone` repositori ini ke komputer anda.
    - Buka folder projek dalam VS Code.
    - Di sudut kanan bawah VS Code, klik butang **"Go Live"**.
    - Ini akan membuka laman web anda dalam pelayar web tempatan (cth., `http://127.0.0.1:5500`).
3.  **Peringatan Penting:**
    - Apabila menguji secara tempatan, `script.js` akan menggunakan URL `dataUrl` yang menunjuk terus ke fail `map.json` di GitHub. Ini sepatutnya berfungsi tanpa sebarang perubahan.
    - Jika anda membuat perubahan pada `script.js` atau `style.css`, simpan fail tersebut, dan Live Server akan memuat semula halaman secara automatik.
