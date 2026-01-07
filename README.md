# 🕹️ Neon Tetris P2P (Multiplayer)

A real-time, browser-based multiplayer Tetris game developed as a side project to play with colleagues.

## 🚀 Key Features
* **Peer-to-Peer (P2P) Connection:** Uses **WebRTC** (via PeerJS) to connect two players directly without a central game server.
* **Real-Time State Sync:** Game boards are synchronized instantly; when you move a piece, your opponent sees it.
* **No Installation Required:** Runs purely in the browser.

## 🛠️ Tech Stack
* **JavaScript (ES6+):** Game logic and state management.
* **HTML5 Canvas:** Rendering the game board at 60 FPS.
* **PeerJS:** Handling the signaling and data connection between clients.
* **CSS3:** Neon aesthetic and responsive layout.

## 🎮 How to Play
1.  Open the game link.
2.  **Host:** Click "Create Room" and share the 4-character code with a friend.
3.  **Join:** The friend enters the code and clicks "Join".
4.  Both players click **"READY"** to start the match.
