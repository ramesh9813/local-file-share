# AirLink LAN — High-Speed Local File Sharing Application

A modern, professional local network file sharing web application built with **React (Vite, Tailwind CSS, Lucide Icons, Canvas Confetti)** and a high-performance **Node.js (Express, Socket.IO, Multer, Archiver, QRCode)** backend.

Designed for instant, private file sharing across computers, phones, and tablets connected to the same Wi-Fi or Ethernet local area network (LAN).

---

## 🌟 Key Features

1. **Modern Landing Page**:
   - Clean, professional dark SaaS aesthetic with glassmorphism and subtle glowing indicators.
   - Real-time LAN IP detector badge and QR Code generator for 1-click mobile phone access.
   - Distinct, intuitive cards to initiate **Share Mode (Sender)** or **Receive Mode (Receiver)**.

2. **Sender Flow**:
   - **Sender Name**: Input display name (persisted in local storage).
   - **Group Name**: Input custom session or group name (e.g. *Meeting Assets*, *Holiday Photos*).
   - **4-Digit Code**: Type custom PIN or click the **Randomize PIN** button.
   - **Drag & Drop Zone**: Multi-file dropzone supporting photos, videos, audio, PDF, documents, archives, code, and more.
   - **Active Session Dashboard**:
     - Real-time live status showing when receivers connect.
     - Large, copyable 4-digit PIN code badge and shareable link.
     - Dynamic file manager allowing senders to add more files to an active session.

3. **Receiver Flow**:
   - **4-Digit PIN Authentication**: 4 individual auto-focusing numeric input boxes with backspace and paste support.
   - **Mode Switcher**: Quick toggle button to easily switch between receiving and sending files.
   - **Safe & Controlled Transfer (No Auto-Download)**:
     - As soon as the receiver enters the 4-digit code, the files list is fetched and displayed.
     - **Files are NEVER automatically downloaded without user permission.**
   - **Download All (ZIP)**: Prominent button that packages all session files into a ZIP archive and streams it directly to the receiver.
   - **Individual Download Buttons**: Every file row includes an individual download button so receivers can select and download only the files they need.
   - **In-App File Previews**: Built-in preview modal for images, videos, audio playback, PDF viewing, and text/code inspection without downloading first.

4. **Local Network (LAN) Speed & Privacy**:
   - 100% peer-to-peer / local network transfer: files stay within your local router or hotspot.
   - Zero internet bandwidth used for file payload transfer.
   - No file size limits or cloud compression.

---

## 📁 Project Structure

```
local-file-share/
├── client/                     # Frontend React application
│   ├── src/
│   │   ├── components/
│   │   │   ├── LandingPage.jsx       # Landing hero & mode selection
│   │   │   ├── SenderView.jsx        # Sender configuration, dropzone & session
│   │   │   ├── ReceiverView.jsx      # 4-digit PIN entry, file list & downloads
│   │   │   ├── FilePreviewModal.jsx  # In-browser preview for media & text
│   │   │   └── QrModal.jsx           # Local network QR code & IP address modal
│   │   ├── utils/
│   │   │   └── fileHelpers.js        # Formatting, categories & PIN generator
│   │   ├── App.jsx                   # Main application layout & Socket.IO
│   │   ├── main.jsx                  # React DOM mount point
│   │   └── index.css                 # Tailwind directives & glassmorphism
│   ├── dist/                         # Production optimized bundle
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
├── server/                     # Backend Node.js server
│   ├── uploads/                      # Session upload directories
│   ├── index.js                      # Express API, Multer, Socket.IO & Archiver
│   └── package.json
├── package.json                # Root package configuration
├── start.sh                    # Launch script
├── build.sh                    # Frontend rebuild script
└── README.md
```

---

## 🚀 How to Run

### 1. Start the Server

From the `local-file-share` directory, simply run:

```bash
./start.sh
```

or via npm:

```bash
npm start
```

### 2. Access the Application

- **On the host device**: Open your browser at [http://localhost:5000](http://localhost:5000)
- **On any other phone, tablet, or PC on the same Wi-Fi**:
  - Open `http://<your-local-ip>:5000` (e.g. `http://192.168.1.15:5000`)
  - Or click the **QR Code** button in the web app and scan it with your phone's camera!

---

## 💡 How to Use

### Sharing Files (Sender)
1. Click **"Share Files"** on the landing page.
2. Enter your **Name**, a **Group Name**, and your **4-Digit Code** (or leave the auto-generated code).
3. Drag & drop or browse the files you want to share.
4. Click **"Create Share Session"**.
5. Tell the receiver your 4-digit PIN or share the link/QR code.

### Receiving Files (Receiver)
1. Open the web app on any device connected to the same Wi-Fi.
2. Click **"Receive Files"** (or use the top navigation switch).
3. Type the **4-Digit Code** provided by the sender.
4. The list of files will appear immediately on your screen.
5. Choose your download option:
   - Click **"Download All"** to get all files bundled in a single ZIP file.
   - Click the **"Download"** button next to any specific file to download it individually.
   - Click **"Preview"** on any file to view images, videos, audio, or text inside the browser!
