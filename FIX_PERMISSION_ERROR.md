# Cara Memperbaiki Error "Permission Denied" (Google Apps Script)

Error "Permission denied" atau "CORS error" terjadi karena pengaturan deployment Google Apps Script belum benar. Aplikasi frontend tidak diizinkan mengakses script tersebut.

Ikuti langkah-langkah ini untuk memperbaikinya:

## 1. Buka Editor Script
Buka proyek Google Apps Script Anda (tempat Anda menaruh file `Code.gs` dan `Setup.gs`).

## 2. Deploy Ulang (Wajib "New Deployment")
Jangan sekadar menyimpan. Anda harus membuat deployment baru agar perubahan izin diterapkan.

1. Klik tombol biru **Deploy** (di pojok kanan atas).
2. Pilih **New deployment** (Deployment baru).
3. Pastikan jenisnya **Web app** (klik ikon roda gigi jika belum dipilih).

## 3. Atur Konfigurasi (PENTING!)
Isi pengaturan persis seperti ini:

*   **Description**: Isi bebas (misal: "Fix Permission").
*   **Execute as (Jalankan sebagai)**: Pilih **Me** (Email Anda).
    *   *Kenapa?* Agar script berjalan menggunakan izin akun Anda untuk akses ke Spreadsheet, bukan meminta izin ke setiap pengunjung website.
*   **Who has access (Siapa yang memiliki akses)**: Pilih **Anyone** (Siapa saja).
    *   *Kenapa?* Ini membuat API bisa diakses publik oleh aplikasi React tanpa login Google. Jika Anda memilih "Anyone with Google Account" atau "Only myself", aplikasi akan error.

## 4. Deploy & Update URL
1. Klik **Deploy**.
2. Salin **Web App URL** yang baru (berakhiran `/exec`).
3. Buka file `services/api.ts` di project ini.
4. Ganti nilai `API_URL` dengan URL yang baru saja Anda salin.

```typescript
// services/api.ts
const API_URL = "https://script.google.com/macros/s/AKfycbx...URL_BARU_ANDA.../exec";
```

## 5. Test Kembali
Coba refresh aplikasi dan lakukan aksi (simpan data/login). Error "Permission denied" seharusnya sudah hilang.
