# 📱 Mobile Streaming Guide for FeetSocial

## Why Use a Streaming App?

FeetSocial uses **RTMP streaming via Mux** for professional-quality streams that support **unlimited viewers**. Browsers can't do RTMP directly, so you need a free streaming app!

This is the **same approach used by Instagram, TikTok, and YouTube** for their mobile live streaming.

---

## 📲 Recommended Free Apps

### **Larix Broadcaster** (Best for FeetSocial)
- ✅ **Free** on iOS & Android
- ✅ Simple, reliable RTMP support
- ✅ Low latency
- Download: Search "Larix Broadcaster" in App Store or Google Play

### **Streamlabs Mobile**
- ✅ Free on iOS & Android  
- ✅ More features (overlays, alerts)
- Download: Search "Streamlabs" in App Store or Google Play

### **Prism Live Studio**
- ✅ Free on iOS & Android
- ✅ Professional features
- Download: Search "Prism Live Studio" in stores

---

## 🎥 How to Stream from iPhone/Android

### **Step 1: Create Stream on FeetSocial**
1. Open FeetSocial on your phone's browser
2. Tap **"Go Live"** in the bottom nav
3. Fill in stream title
4. Tap **"Create Stream"**
5. You'll see:
   - **Server URL**: `rtmps://global-live.mux.com:443/app`
   - **Stream Key**: `[long random string]`

### **Step 2: Set Up Larix App**
1. Open **Larix Broadcaster** app
2. Tap **Settings** (gear icon)
3. Tap **Connections**
4. Tap **"New Connection"** → **RTMP**
5. Enter:
   - **Name**: "FeetSocial"
   - **URL**: `rtmps://global-live.mux.com:443/app`
   - **Stream Name**: `[paste your stream key]`
6. Tap **"Save"**

### **Step 3: Start Streaming**
1. In Larix, select your camera
2. Tap the **red record button** to start streaming
3. Go back to FeetSocial in your browser
4. Tap **"🔴 Go Live Now"**
5. **Done!** Your stream is live to unlimited viewers!

---

## 👁️ Viewing Streams

### **Viewers on Any Device:**
- Go to FeetSocial home page or `/feed`
- Live streams appear at the top
- Video plays automatically via HLS
- **Works on:**
  - ✅ Any mobile browser (iPhone, Android)
  - ✅ Desktop browsers
  - ✅ Unlimited concurrent viewers
  - ✅ No app needed for viewing!

### **Features:**
- 🎥 High-quality video
- 💬 TikTok-style floating comments
- 👁️ Live viewer count
- 🔴 Live badge
- 📱 Mobile-optimized layout

---

## 🆚 Why Not Browser Streaming?

We tried **WebRTC browser streaming**, but it has limitations:
- ❌ Only 1-2 viewers max (peer-to-peer)
- ❌ Unreliable (NAT/firewall issues)
- ❌ High bandwidth usage on streamer
- ❌ Mux WHIP not available on all plans

**RTMP with Larix** gives you:
- ✅ **Unlimited viewers** (scales to millions)
- ✅ **Professional quality** (same as Twitch/YouTube)
- ✅ **Reliable** (proven technology)
- ✅ **Low streamer bandwidth** (Mux handles distribution)

---

## 💡 Pro Tips

### **Better Quality:**
- Use good lighting
- Stable phone mount/tripod
- Good WiFi or 4G/5G connection
- Larix settings: 1080p, 3000-5000 kbps bitrate

### **Engagement:**
- Read floating comments during stream
- Interact with viewers in real-time
- Use catchy stream titles
- Announce streams on your profile

---

## 🐛 Troubleshooting

### **"Stream Starting..." forever**
- Wait 30-60 seconds for Mux to process
- Refresh the viewer page
- Check that you clicked "Go Live Now" on FeetSocial

### **Larix won't connect**
- Verify Server URL is correct (with `rtmps://`)
- Double-check Stream Key (copy/paste, don't type)
- Ensure you have internet connection
- Try restarting the app

### **Low quality or buffering**
- Reduce bitrate in Larix settings (try 2500 kbps)
- Use WiFi instead of cellular
- Close other apps using bandwidth

---

## 🎉 You're Ready!

**Mobile streaming with unlimited viewers is now available!** 🚀

The setup takes 2 minutes the first time, then streaming is super easy. Just like going live on Instagram or TikTok!

---

**Questions?** Check the stream status in the FeetSocial UI or your Larix connection status.

**Happy Streaming!** 📱✨

