# Sociality

Aplikasi social media untuk berbagi foto, memberi like dan komentar, menyimpan post, serta mengikuti pengguna lain.

[Live demo](https://sociality-rizqi.vercel.app)

## Tech stack

Next.js, React, TypeScript, Tailwind CSS, shadcn/ui, Radix UI, Redux Toolkit, TanStack Query, React Hook Form, Zod, dan Day.js.

## Menjalankan project

Gunakan Node.js 24.x.

```sh
git clone https://github.com/vigimoy/sociality.git
cd sociality
npm ci
npm run dev
```

Buka `http://127.0.0.1:3000`. Buat akun melalui halaman Register.

API sudah dikonfigurasi secara default. Untuk mengganti backend, salin `.env.example` ke `.env.local` dan ubah `NEXT_PUBLIC_API_URL` sebelum menjalankan atau membangun aplikasi.

## Fitur

- Register, login, logout, dan sesi persisten.
- Explore dan Following feed dengan pagination.
- Upload foto, caption, detail post, dan hapus post sendiri.
- Like, komentar, dan saved posts.
- Pencarian pengguna, follow/unfollow, serta daftar followers/following.
- Profil publik, edit profil, dan upload avatar.
- Layout desktop/mobile, validasi form, dan optimistic update.

## Scripts

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

GitHub Actions menjalankan pemeriksaan pada push ke `main` dan pull request. Pengujian API langsung bersifat opsional melalui `npm run test:api:live`; script membutuhkan akun sintetis dan state di luar repository.

## Deployment

Impor repository ke Vercel dengan Node.js 24.x dan Output Directory default Next.js. Konfigurasi install dan build tersedia di `vercel.json`.

## Catatan

Data menggunakan API mentor. Perubahan email dan penghapusan nomor telepon yang sudah tersimpan belum didukung API. Sesi bearer disimpan di localStorage; respons 401 mengakhiri sesi. Share menggunakan Web Share atau clipboard.

## Referensi

- [Desain Figma](https://www.figma.com/design/q40R8HQFTR7TQGfGWc9kKc/Social-Media--Copy-?node-id=41423-14699)
- [Dokumentasi API](https://be-social-media-api-production.up.railway.app/api-swagger/)
