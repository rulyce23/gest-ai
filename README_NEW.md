# 🤚 Gesture AI - Real-time Hand Gesture Recognition

Aplikasi web modern berbasis React + TypeScript yang menggunakan MediaPipe Hands untuk mendeteksi gestur tangan secara real-time dan mengkonversinya menjadi suara menggunakan Text-to-Speech (TTS).

## ✨ Fitur Utama

### 🎥 Video Capture
- Auto-detect kamera (termasuk virtual cam / DroidCam)
- Dropdown selector kamera
- Video preview real-time dengan mirror effect
- Support multiple camera devices

### 🖐️ Gesture Recognition
- Menggunakan MediaPipe Hands untuk deteksi akurat
- Landmark (21 titik tangan) diproses untuk klasifikasi gestur
- Deteksi 10 gestur bawaan:
  - 👋 Wave - Perkenalan
  - ✋ Open Palm - Asal dan jurusan
  - 👍 Thumbs-Up - Komitmen
  - ✊ Fist - Prestasi lomba
  - 👉 Pointing - Pengalaman LKS
  - ✌️ Victory - Kontribusi UMKM
  - 👏 Clap - Filosofi kolaborasi
  - ❌ Cross Hands - Penutup cerita
  - 🙌 Raise Both Hands - Semangat tantangan
  - 🙏 Namaste - Penutup dan terima kasih

### 🦴 Skeleton Overlay
- Canvas overlay di atas video
- Tampilkan kerangka tangan (21 titik + garis penghubung)
- Update real-time via requestAnimationFrame
- Toggle ON/OFF skeleton overlay
- Warna berbeda untuk tangan kiri (hijau) dan kanan (orange)

### 🔊 Text-to-Speech (TTS)
- Mapping gesture → emoji + teks + suara
- Gesture stabil >200ms → trigger TTS
- Debounce untuk hindari double-trigger
- Prioritas suara pria Indonesia
- Kontrol rate, pitch, dan volume

### 🎨 UI/UX Modern
- Stack: React + Vite + TailwindCSS + Framer Motion
- Tema modern dengan animasi smooth
- Dark/Light mode toggle
- Responsif (desktop & mobile)
- Debug panel untuk monitoring

### 💾 Data Persistence
- IndexedDB untuk menyimpan gesture mappings
- Export/Import JSON untuk backup
- Reset ke default mappings
- Persistent settings

## 🚀 Instalasi dan Menjalankan

### Prerequisites
- Node.js (v16 atau lebih baru)
- NPM atau Yarn
- Browser modern dengan support WebRTC dan MediaPipe

### Langkah Instalasi

1. **Clone repository**
   ```bash
   git clone <repository-url>
   cd GES_AI
   ```

2. **Install dependencies**
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Jalankan development server**
   ```bash
   npm run dev
   ```

4. **Buka browser**
   - Akses `http://localhost:5173`
   - Izinkan akses kamera saat diminta

## 🎯 Cara Penggunaan

1. **Setup Kamera**
   - Pilih kamera dari dropdown (jika ada multiple)
   - Pastikan video preview muncul

2. **Aktifkan Deteksi**
   - Toggle skeleton overlay untuk melihat tracking
   - Pastikan status "Detecting" aktif

3. **Lakukan Gestur**
   - Posisikan tangan di depan kamera
   - Lakukan salah satu dari 10 gestur yang didukung
   - Tunggu suara TTS otomatis

4. **Customize Mapping**
   - Edit emoji dan teks di panel sebelah kanan
   - Export/Import untuk backup
   - Reset ke default jika diperlukan

## 🛠️ Teknologi yang Digunakan

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: TailwindCSS, Framer Motion
- **AI/ML**: MediaPipe Hands, TensorFlow.js
- **Audio**: Web Speech API (speechSynthesis)
- **Storage**: IndexedDB
- **Icons**: Lucide React

## 📁 Struktur Project

```
src/
├── components/          # React components
│   ├── CameraView.tsx   # Komponen kamera dan video
│   ├── SkeletonOverlay.tsx # Overlay kerangka tangan
│   ├── GestureMappingPanel.tsx # Panel mapping gesture
│   └── DebugPanel.tsx   # Panel debug info
├── hooks/               # Custom React hooks
│   ├── useCamera.ts     # Hook untuk kamera
│   └── useHandDetection.ts # Hook MediaPipe
├── utils/               # Utility functions
│   ├── gestureClassifier.ts # Klasifikasi gesture
│   ├── ttsService.ts    # Service TTS
│   ├── storage.ts       # IndexedDB service
│   └── defaultMappings.ts # Default gesture mappings
├── types/               # TypeScript type definitions
└── stores/              # State management (future)
```

## 🐛 Troubleshooting

### Kamera tidak muncul
- Pastikan browser mendukung WebRTC
- Cek permission kamera di browser
- Coba refresh halaman

### Skeleton tidak muncul
- Toggle skeleton overlay ON
- Pastikan tangan terlihat jelas di kamera
- Cek console untuk error MediaPipe

### TTS tidak berbunyi
- Cek volume sistem dan browser
- Pastikan TTS enabled di settings
- Lihat console untuk error TTS

### Gesture tidak terdeteksi
- Pastikan pencahayaan cukup
- Posisikan tangan dengan jelas
- Cek debug panel untuk status detection

## 🤝 Kontribusi

Kontribusi sangat diterima! Silakan:

1. Fork repository
2. Buat feature branch
3. Commit perubahan
4. Push ke branch
5. Buat Pull Request

## 📄 Lisensi

MIT License - lihat file LICENSE untuk detail.

## 👨‍💻 Developer

Dikembangkan oleh **Dhafa Nazula Permadi** untuk keperluan perkenalan mahasiswa baru Digitech University.

---

**Selamat mencoba Gesture AI! 🚀**
