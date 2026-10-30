# Sociality

Aplikasi social media untuk berbagi foto, berinteraksi melalui likes dan komentar, serta mengikuti pengguna lain. Tampilan desktop dan mobile mengikuti desain Figma assignment, menggunakan API mentor.

**Demo:** [sociality-rizqi.vercel.app](https://sociality-rizqi.vercel.app) · **Repository:** [vigimoy/sociality](https://github.com/vigimoy/sociality)

![Sociality](docs/screenshots/vercel-login.png)

## Menjalankan secara lokal

Gunakan Node.js **24.x** dan npm.

```sh
git clone https://github.com/vigimoy/sociality.git
cd sociality
npm ci
npm run dev
```

Buka `http://127.0.0.1:3000`. Buat akun aplikasi melalui Register. API mentor menjadi backend default; tidak diperlukan token atau akun Vercel untuk menjalankan aplikasi. Jika mengganti backend, salin `.env.example` menjadi `.env.local` dan atur `NEXT_PUBLIC_API_URL` sebelum build.

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm start
```

Jalankan development server dan build secara terpisah agar output framework tidak saling menimpa.

## Fitur

- Register, login, logout, sesi persisten, sinkronisasi logout antar tab, dan proteksi halaman akun.
- Explore publik dan Following feed, pagination, serta loading/empty/error state.
- Upload foto dengan preview, caption, detail post, dan hapus post sendiri.
- Like/unlike, daftar likes, komentar, dan hapus komentar sendiri.
- Save/unsave, Gallery, Saved, dan Liked.
- Search pengguna, follow/unfollow, profil publik, followers/following, dan edit profil/avatar.
- Optimistic update dengan rollback, validasi form, dan layout responsif.

## Teknologi dan struktur

Next.js App Router, TypeScript strict, Tailwind CSS, shadcn/ui + Radix, Redux Toolkit, TanStack Query, React Hook Form, Zod, dan Day.js.

| Direktori | Isi |
| --- | --- |
| `app/` | Route, layout, error/404, dan CSS |
| `components/sociality/` | Komponen fitur dan form |
| `components/ui/` | Komponen shadcn/ui yang digunakan aplikasi |
| `lib/sociality/` | API client, tipe, Redux store, query/cache, dan media |
| `public/design/` | Aset desain lokal |
| `tests/` | Pengujian kontrak API client, cache, media, dan payload |
| `docs/` | Pemetaan endpoint dan hasil verifikasi |

Redux menyimpan sesi serta pilihan UI. TanStack Query mengelola data server, pagination, optimistic update, dan invalidasi cache. Form menggunakan React Hook Form dan Zod. Unit test tidak menghubungi backend.

## Deployment

Impor repository ini ke Vercel dengan root direktori repository. `vercel.json` menetapkan framework Next.js, install `npm ci`, serta build `npm run build:next`. Gunakan Node.js 24.x dan Output Directory default Next.js. URL produksi harus dapat dibuka reviewer tanpa login Vercel.

GitHub Actions menjalankan typecheck, lint, unit test, dan production build pada push ke `main` serta pull request. Deployment Vercel tidak memerlukan kredensial di repository.

## Catatan API

- Feed dan own posts mengembalikan `items`; API client menormalkannya menjadi `posts`.
- Saved hanya berisi metadata foto dasar. Detail post dibaca saat dibuka. Status liked/saved mengikuti koleksi akun karena flag detail publik tidak selalu sesuai sesi.
- Register memerlukan email. Edit email dan penghapusan nomor telepon yang sudah tersimpan belum didukung backend. Field nomor opsional yang kosong tidak dikirim karena API menolaknya.
- Share menggunakan Web Share/clipboard tanpa jumlah share buatan.
- Sesi bearer disimpan di localStorage sesuai kebutuhan MVP; API tidak menyediakan refresh token. Respons 401 mengakhiri sesi.
- Font menggunakan fallback sistem SF Pro/Segoe UI. File font berlisensi tidak disertakan.

Ketersediaan data mengikuti API mentor. Lihat [endpoint](docs/ENDPOINTS.md), [QA](docs/QA.md), [deployment](docs/DEPLOYMENT.md), dan [pengumpulan](docs/SUBMISSION.md).

## Pengujian API langsung

Script opsional membuat dua akun sintetis dan membersihkan post, komentar, serta follow yang dibuatnya. API tidak menyediakan penghapusan akun. Jangan gunakan akun pribadi. Simpan state berisi kredensial di luar repository.

```powershell
$env:RUN_LIVE_API_TESTS = '1'
$env:SOCIALITY_QA_STATE = "$env:TEMP/sociality-qa-state.json"
npm run test:api:live
```

## Referensi

- [Desain Figma](https://www.figma.com/design/q40R8HQFTR7TQGfGWc9kKc/Social-Media--Copy-?node-id=41423-14699)
- [Dokumentasi API](https://be-social-media-api-production.up.railway.app/api-swagger/)
- Sociality Frontend MVP Guide dari assignment.
