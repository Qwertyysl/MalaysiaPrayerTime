# Prayer Times Firefox Extension

A Firefox extension that displays accurate Islamic prayer times for Kuala Terengganu, Malaysia using the official JAKIM API.

## Features

- Hardcoded location for Kuala Terengganu, Malaysia (location not displayed in UI)
- Displays daily prayer times (Subuh, Zohor, Asar, Maghrib, Isha) in 12-hour format
- Shows the next upcoming prayer with countdown timer
- Desktop notifications for prayer times
- 5-minute advance warning notification before each prayer
- Customizable adzan/athan sounds (Azan TV3 is default):
  - Azan TV3 (default)
  - Azan Jiharkah Furqan
  - Azan Jiharkah Munif Hijjaz
  - None (silent)
- Adjustable adzan volume control with up to 600% boost
- Mutes only audio tabs during adzan playback (excludes adzan tab)
- Automatic unmuting of tabs after adzan finishes
- Compact popup design that doesn't require scrolling
- Modern, gradient-styled header with welcome message
- Current date and time display in a clean layout
- 12-hour format clock with seconds
- Completely modern UI design throughout the extension
- Settings button in popup for easy access to options
- Test adzan feature in settings page with stop button
- Changelog button in settings page to view update history

## Installation

You can install this extension in two ways:

### Method 1: Using the XPI file (Recommended)
1. Open Firefox browser
2. Navigate to `about:addons`
3. Click the gear icon and select "Install Add-on From File..."
4. Select the `prayer-times-extension.xpi` file

### Method 2: Temporary installation for development
1. Open Firefox browser
2. Navigate to `about:debugging`
3. Click on "This Firefox" in the left sidebar
4. Click on "Load Temporary Add-on..."
5. Select the `manifest.json` file

## Files Structure

```
adzan/
├── manifest.json          # Extension manifest
├── background.js          # Background script for periodic updates
├── changelog.txt          # Changelog of updates and fixes
├── icons/                 # Extension icons
├── popup/                 # Popup UI files
│   ├── popup.html         # Popup HTML
│   ├── popup.css          # Popup styles
│   └── popup.js           # Popup script
├── options/               # Options page files
│   ├── options.html       # Options HTML
│   ├── options.css        # Options styles
│   └── options.js         # Options script
├── audio/                 # Adzan audio files
│   ├── Azan Jiharkah Furqan.mp3         # Azan Jiharkah Furqan
│   ├── Azan Jiharkah Munif Hijjaz.mp3   # Azan Jiharkah Munif Hijjaz
│   └── Azan TV3.mp3                     # Azan TV3 (default)
└── utils/                 # Utility functions
    └── prayer-times.js    # Prayer time calculation using JAKIM API
```

## How It Works

1. The extension is hardcoded to fetch prayer times for Kuala Terengganu from the JAKIM API
2. Prayer times are displayed in 12-hour format in the popup when you click the extension icon
3. The extension shows a countdown timer to the next prayer
4. The extension checks every minute for upcoming prayers and shows notifications
5. 5 minutes before each prayer, a warning notification is shown
6. When it's prayer time, the selected adzan sound plays (Azan TV3 by default)
7. Optionally mutes only audio tabs during adzan playback and unmutes them afterward

## JAKIM API Integration

The extension uses the official JAKIM prayer times API through the [Waktu Solat API](https://api.waktusolat.app/) service:
- Fetches accurate prayer times for Kuala Terengganu (zone code: trg01)
- Provides reliable and up-to-date prayer times
- Converts Unix timestamps to 12-hour format times
- Updates prayer times every hour for real-time accuracy

## Adzan/Athan Features

- Multiple adzan sound options to choose from (Azan TV3 is default):
  - Azan TV3 (default)
  - Azan Jiharkah Furqan
  - Azan Jiharkah Munif Hijjaz
  - None (silent)
- Adjustable volume control for adzan with up to 600% boost:
  - Volume range from 0% to 600%
  - Uses Web Audio API for volume boosting beyond 100%
  - 100% is normal volume, values above 100% provide boosting
- Option to mute only audio tabs during adzan playback (excludes adzan tab)
- Automatic unmuting of tabs after adzan finishes or is stopped
- Customizable through the options page
- Test adzan feature with 10-second countdown in settings page
- Stop button to immediately stop adzan playback
- Automatic unmuting after 10 seconds if not manually stopped
- Improved audio playback performance

## Customization

You can customize the following settings in the options page:
- Adzan sound selection (Azan TV3 is default)
- Adzan volume control (0-600% range)
- Enable/disable notifications and athan audio
- Enable/disable tab muting during adzan
- 5-minute warning notifications
- View changelog of updates and fixes

## Test Adzan Feature

The settings page includes a "Test Adzan" button that:
- Counts down from 10 seconds
- Plays the selected adzan sound after the countdown (Azan TV3 by default)
- Mutes only audio tabs during playback (if enabled)
- Unmutes tabs after adzan finishes
- Provides immediate feedback on adzan functionality

### Stop Button
- Immediately stops adzan playback
- Unmutes tabs instantly
- Resets the test interface

### Automatic Unmuting
- If adzan finishes naturally, tabs are automatically unmuted after 10 seconds
- Ensures audio is restored even if the user doesn't manually stop

## Improved Tab Muting

The tab muting functionality has been enhanced:
- Only mutes tabs that are currently playing audio
- Excludes the adzan tab itself from muting
- More reliable muting with better error handling
- Proper unmuting after adzan finishes or is stopped
- Improved performance and reliability

## Volume Boosting

The extension now supports volume boosting up to 600%:
- Volume slider range from 0% to 600%
- Uses HTML5 audio for volumes up to 100%
- Uses Web Audio API GainNode for volumes above 100%
- Provides clear visual indication of current volume level
- Volume boosting works for both prayer time adzan and test adzan

## Changelog

The settings page includes a "View Changelog" button that:
- Opens a new tab with the complete history of updates and fixes
- Shows version-by-version improvements
- Documents all bug fixes and feature additions
- Helps users understand what has changed in the extension

## Compact Popup Design

The popup has been optimized for a compact size:
- Reduced width from 300px to 280px
- Smaller padding and margins throughout
- Compact element sizing
- No need to scroll for normal usage
- Better spacing and typography

## Development

To modify this extension:

1. Clone or download this repository
2. Make your changes to the files
3. Load the extension in Firefox as a temporary add-on
4. Test your changes

## Countdown Timer

The extension includes a real-time countdown timer that shows the time remaining until the next prayer.
The countdown updates every minute and provides a clear visual indication of when the next prayer time will occur.
All times are displayed in 12-hour format.

## Limitations

This is a basic implementation for demonstration purposes. A production version would:
- Have more robust error handling
- Include localization for different languages
- Have more comprehensive settings

## License

This project is open source and available under the MIT License.