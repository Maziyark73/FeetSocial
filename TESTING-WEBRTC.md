# Testing WebRTC Browser-Based Streaming

## 🎯 Quick Test Steps

### Step 1: Run the SQL Migration

1. Go to your **Supabase Dashboard** → SQL Editor
2. Open the file `add-webrtc-streaming.sql`
3. Copy and paste the SQL into the editor
4. Click "Run"

### Step 2: Test Quick Stream (Browser-Based)

1. **Open** `http://localhost:3000/go-live`
2. **Fill in:**
   - Title: "Test Quick Stream"
   - Description: "Testing browser-based streaming"
3. **Click** "Create Stream"
4. **Click** "Quick Stream" (purple button)
5. **Click** "Start Camera Stream"
6. **Allow** camera and microphone access when prompted
7. **You should see:**
   - Your camera preview (mirrored)
   - "LIVE" indicator in top-left
   - Mute/unmute button
   - Switch camera button (on mobile)
   - Stop button

### Step 3: Test Viewing the Stream

1. **Open a new browser tab** (or use your phone)
2. **Go to** `http://localhost:3000`
3. **You should see** your live stream in the "Live Now" section
4. **Click on the stream card**
5. **You should see** the live video playing

### Step 4: Test Pro Stream (OBS)

1. **Go to** `http://localhost:3000/go-live`
2. **Fill in stream details**
3. **Click** "Create Stream"
4. **Click** "Pro Stream" (gray button)
5. **Copy the RTMP credentials**
6. **Open OBS** and configure with the credentials
7. **Start streaming** in OBS
8. **Click** "Go Live Now" on the website

---

## 📱 Mobile Testing

### iOS (Safari):
1. Open Safari on your iPhone
2. Go to `http://YOUR_LOCAL_IP:3000` (e.g., `http://192.168.1.100:3000`)
3. Follow the Quick Stream steps above
4. Should work perfectly!

### Android (Chrome):
1. Open Chrome on your Android phone
2. Go to `http://YOUR_LOCAL_IP:3000`
3. Follow the Quick Stream steps above
4. Should work perfectly!

**Note:** Replace `YOUR_LOCAL_IP` with your computer's local IP address. Find it by running:
```bash
# On Mac:
ipconfig getifaddr en0

# On Windows:
ipconfig
```

---

## 🐛 Expected Behavior

### Quick Stream:
- ✅ Camera preview appears immediately
- ✅ Can switch between front/back camera (mobile)
- ✅ Can mute/unmute audio
- ✅ Viewers connect via WebRTC P2P
- ✅ Very low latency (1-3 seconds)
- ⚠️ Limited to ~10-20 concurrent viewers (P2P limitation)

### Pro Stream:
- ✅ Works with OBS/Streamlabs/XSplit
- ✅ Streams via Mux RTMP
- ✅ HLS playback for viewers
- ✅ Scalable to thousands of viewers
- ⚠️ Higher latency (10-30 seconds typical for HLS)

---

## 🎨 UI Flow

```
1. Creator clicks "Go Live"
   ↓
2. Fills in stream details (title, description, vault)
   ↓
3. Clicks "Create Stream"
   ↓
4. Chooses streaming method:
   
   Option A: Quick Stream          Option B: Pro Stream
   ↓                                ↓
   Click "Start Camera Stream"     Copy RTMP credentials
   ↓                                ↓
   Allow camera access             Configure OBS
   ↓                                ↓
   LIVE! 🎥                        Start OBS → Click "Go Live Now"
                                    ↓
                                    LIVE! 🎥
```

---

## 🔐 Security Notes

- **WebRTC**: P2P connections are encrypted (DTLS-SRTP)
- **RTMP**: Mux uses RTMPS (encrypted RTMP)
- **Stream keys**: Never exposed to viewers
- **Signaling**: Uses Supabase Realtime (secure WebSocket)

---

## 💡 Tips

### For Best Quality:
- **Quick Stream**: Use good lighting, stable internet
- **Pro Stream**: Use OBS with 1080p @ 30fps, 2500-5000 kbps bitrate

### For Mobile Creators:
- **Always use Quick Stream** - it's designed for mobile
- **Use front camera** for selfie-style content
- **Use back camera** for showing environment
- **Test your internet speed** - need at least 2 Mbps upload

### For Desktop Creators:
- **Quick Stream**: Great for quick, casual streams
- **Pro Stream**: Better for professional content, gaming, tutorials

---

## 🚀 Ready to Test!

Your platform now has **both streaming options**! Test it out and see which one you prefer. Most creators will love the Quick Stream option because it's so easy to use! 📱✨

