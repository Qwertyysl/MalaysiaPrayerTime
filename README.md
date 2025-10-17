# Prayer Times Malaysia - Firefox Extension

A Firefox extension that displays accurate Islamic prayer times for **all Malaysian locations** using the official JAKIM API with **custom adzan and doa support**.

## ✨ Key Features

### 🕌 Prayer Times
- **All Malaysian Locations**: Support for all JAKIM zones across Malaysia
- **Dynamic Location Selection**: Choose from 50+ zones covering all states
- **Default Location**: TRG01 (Kuala Terengganu, Marang)
- **Real-time Updates**: Prayer times update hourly for accuracy
- **12-Hour Format**: Easy-to-read time display
- **Next Prayer Badge**: Shows next prayer (SBH/ZHR/ASR/MGR/ISA) on extension icon
- **Location Code Display**: Shows selected zone in popup (e.g., TRG01)

### 🔊 Custom Audio
- **Upload Your Own Adzan**: Use any audio file for adzan
- **Upload Your Own Doa**: Use any audio file for doa after adzan
- **Optional Doa Playback**: Enable/disable doa with checkbox
- **Volume Control**: Adjustable volume up to 600% with Web Audio API boost
- **Base64 Storage**: Audio files stored securely in browser storage

### 🔔 Notifications
- **Prayer Time Alerts**: Desktop notifications when prayer time arrives
- **Multiple Warnings**: 5, 4, 3, 2, and 1-minute advance notifications
- **Customizable**: Enable/disable notifications and adzan audio separately

### 🎵 Audio Playback
- **Dedicated Player Tab**: Reliable audio playback in separate tab
- **Media Pause**: Automatically pauses videos/music during adzan
- **Auto-Resume**: Media resumes after adzan/doa finishes
- **Stop Button**: Manual control to stop adzan anytime
- **Countdown Timer**: Real-time countdown display during playback

## ⚠️ A Note on Built-in Audio

### Why is there no built-in Adzan sound?

To comply with Mozilla's add-on policies and navigate technical limitations, this extension does not include pre-packaged audio files. This approach ensures the extension remains compliant and lightweight. Instead, it empowers users with the flexibility to upload their own preferred Adzan and Doa audio, giving you full control over the experience.

## 📥 Installation

### Method 1: From XPI File (Recommended)
1. Open Firefox
2. Go to `about:addons`
3. Click gear icon → "Install Add-on From File..."
4. Select the `.xpi` file

### Method 2: Development Mode
1. Open Firefox
2. Go to `about:debugging`
3. Click "This Firefox"
4. Click "Load Temporary Add-on..."
5. Select `manifest.json`

## 📁 Project Structure

```
adzan_new/
├── manifest.json          # Extension configuration
├── background.js          # Background service worker
├── changelog.txt          # Version history
├── icons/                 # Extension icons
├── popup/                 # Popup interface
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── options/               # Settings page
│   ├── options.html
│   ├── options.css
│   └── options.js
├── adzan-player.html      # Audio player page
├── adzan-player.js        # Audio player logic
└── utils/
    └── prayer-times.js    # JAKIM API integration
```

## 🚀 How to Use

### Initial Setup
1. **Open Settings**: Click extension icon → Settings button
2. **Select Location**: Choose your JAKIM zone from dropdown (default: TRG01)
3. **Upload Adzan**: Click "Choose File" and select your adzan audio
4. **Upload Doa** (Optional): Enable "Play Doa after Adzan" and upload doa audio
5. **Adjust Volume**: Set volume level (0-600%)
6. **Save Settings**: Click "Save Settings"

### Daily Usage
- **Check Prayer Times**: Click extension icon to view times
- **Next Prayer Badge**: Glance at toolbar icon for next prayer (SBH/ZHR/ASR/MGR/ISA)
- **Notifications**: Receive alerts 5, 4, 3, 2, 1 minutes before prayer
- **Adzan Playback**: Automatic playback at prayer time (if enabled)
- **Stop Adzan**: Click stop button in notification or player tab

## 🗺️ Supported Locations

All JAKIM zones across Malaysia:
- **Johor**: JHR01-JHR04
- **Kedah**: KDH01-KDH07
- **Kelantan**: KTN01, KTN03
- **Melaka**: MLK01
- **Negeri Sembilan**: NGS01-NGS02
- **Pahang**: PHG01-PHG06
- **Perlis**: PLS01
- **Pulau Pinang**: PNG01
- **Perak**: PRK01-PRK07
- **Sabah**: SBH01-SBH09
- **Sarawak**: SWK01-SWK09
- **Selangor**: SGR01-SGR03
- **Terengganu**: TRG01-TRG04
- **WP Kuala Lumpur**: WLP01
- **WP Labuan**: WLP02
- **WP Putrajaya**: WLP03

## ⚙️ Settings

### Location Settings
- **Zone Selection**: Dropdown with all Malaysian JAKIM zones
- **Saved Selection**: Location remembered across sessions

### Audio Settings
- **Custom Adzan**: Upload your preferred adzan audio file
- **Custom Doa**: Upload your preferred doa audio file
- **Enable Doa**: Checkbox to enable/disable doa playback
- **Volume Control**: 0-600% range with Web Audio API boost
- **Validation**: Prevents enabling features without uploaded files

### Notification Settings
- **Enable Notifications**: Toggle desktop notifications
- **Enable Athan Audio**: Toggle adzan playback
- **Mute Tabs**: Pause media in other tabs during adzan
- **Multiple Warnings**: 5, 4, 3, 2, 1-minute advance alerts

### Developer Options
- **Test Adzan**: 10-second countdown test with your audio
- **View Changelog**: Complete version history

## 🛠️ Technical Details

### APIs Used
- **JAKIM API**: `https://api.waktusolat.app/v2/solat/{zone_code}`
- **Prayer Time Calculation**: Real-time calculation with timezone handling
- **Web Audio API**: Volume boosting beyond 100%

### Storage
- **Browser Local Storage**: Settings and prayer times
- **Base64 Encoding**: Audio files stored as data URLs
- **Persistent Settings**: Location and preferences saved

### Background Tasks
- **Prayer Time Updates**: Every hour
- **Prayer Checks**: Refresh frequently for accuracy
- **Warning Checks**: Every minute for advance notifications
- **Badge Updates**: Refresh frequently

## 🔧 Development

### Prerequisites
- Firefox Browser
- Text editor or IDE

### Setup
1. Clone repository
2. Make changes to files
3. Load in Firefox (`about:debugging`)
4. Test functionality

### Key Files to Modify
- `background.js`: Core logic, alarms, notifications
- `options/options.js`: Settings page functionality
- `popup/popup.js`: Popup interface logic
- `adzan-player.js`: Audio playback handling

## 📝 Version

**Current Version**: 3.0.2

**Latest Updates**:
- Icon badge showing next prayer
- Custom audio file upload support
- All Malaysian locations support
- Optional doa playback
- Improved UI/UX

## 👨‍💻 Credits

Made with ❤️ by **Nazmi**

## 📄 License

MIT License - Open source and free to use
