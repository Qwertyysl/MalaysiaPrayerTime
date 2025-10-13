// Background script for prayer times extension

// Import prayer times calculator
try {
  importScripts('utils/prayer-times.js');
} catch (e) {
  console.error('Failed to import prayer times calculator:', e);
}

// Persistent AudioContext for volume boosting
let audioContext = null;

// Track which prayers have been triggered to prevent duplicates
let triggeredPrayers = new Set();

// Set up alarm to update prayer times hourly
browser.alarms.create('updatePrayerTimes', {
  periodInMinutes: 60 // Update every hour for real-time accuracy
});

// Set up alarm to check for next prayer every 10 seconds for better accuracy
browser.alarms.create('checkNextPrayer', {
  periodInMinutes: 1/6 // Check every 10 seconds (1/6 of a minute)
});

// Set up alarm to check for 5-minute warning every minute
browser.alarms.create('checkFiveMinuteWarning', {
  periodInMinutes: 1
});

// Listen for alarm events
browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'updatePrayerTimes') {
    updatePrayerTimes();
    // Clear triggered prayers when we update prayer times (new day)
    triggeredPrayers.clear();
  } else if (alarm.name === 'checkNextPrayer') {
    checkNextPrayer();
  } else if (alarm.name === 'checkFiveMinuteWarning') {
    checkFiveMinuteWarning();
  }
});

// Update prayer times from API
async function updatePrayerTimes() {
  console.log('Updating prayer times from API...');
  
  try {
    // Get prayer times from API
    const prayerTimes = await PrayerTimesCalculator.getPrayerTimes();
    
    // Save to storage
    await browser.storage.local.set({
      prayerTimes: prayerTimes,
      lastUpdated: new Date().toISOString()
    });
    
    console.log('Prayer times updated:', prayerTimes);
  } catch (error) {
    console.error('Error updating prayer times:', error);
  }
}

// Check if it's time for the next prayer
async function checkNextPrayer() {
  try {
    const result = await browser.storage.local.get([
      'prayerTimes', 
      'enableAthan', 
      'muteTabsDuringAthan',
      'adzanSound',
      'adzanVolume'
    ]);
    
    // Check if adzan is enabled
    if (result.enableAthan === false) {
      return;
    }
    
    if (result.prayerTimes) {
      const now = new Date();
      
      // Check all prayer times
      const times = result.prayerTimes;
      const prayerTimes = [
        { name: 'Subuh', time: times.subuh },
        { name: 'Zohor', time: times.zohor },
        { name: 'Asar', time: times.asar },
        { name: 'Maghrib', time: times.maghrib },
        { name: 'Isha', time: times.isha }
      ];
      
      // Check if current time matches any prayer time (within 10 seconds window)
      const currentPrayer = prayerTimes.find(prayer => {
        // Handle both 12-hour and 24-hour formats
        let prayerTimeToCompare = prayer.time;
        
        // If it's 12-hour format, convert to 24-hour for comparison
        if (prayer.time.includes('AM') || prayer.time.includes('PM')) {
          const prayerTimeParts = prayer.time.split(' ');
          const time = prayerTimeParts[0];
          const period = prayerTimeParts[1];
          
          let [hours, minutes] = time.split(':').map(Number);
          
          // Convert to 24-hour format
          if (period === 'PM' && hours !== 12) {
            hours += 12;
          } else if (period === 'AM' && hours === 12) {
            hours = 0;
          }
          
          prayerTimeToCompare = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        } else {
          // Already in 24-hour format, just extract the time part
          prayerTimeToCompare = prayer.time;
        }
        
        // Extract just the HH:MM part for comparison
        const [prayerHours, prayerMinutes] = prayerTimeToCompare.split(':');
        
        // Create a Date object for the prayer time today
        const prayerTimeDate = new Date();
        prayerTimeDate.setHours(parseInt(prayerHours), parseInt(prayerMinutes), 0, 0);
        
        // Check if current time is within 10 seconds of prayer time
        const timeDifference = Math.abs(now.getTime() - prayerTimeDate.getTime());
        return timeDifference <= 10000; // 10 seconds in milliseconds
      });
      
      if (currentPrayer) {
        // Create a unique key for this prayer today
        const today = new Date().toISOString().split('T')[0];
        const prayerKey = `${today}-${currentPrayer.name}`;
        
        // Check if we've already triggered this prayer today
        if (!triggeredPrayers.has(prayerKey)) {
          // Mark this prayer as triggered
          triggeredPrayers.add(prayerKey);
          
          // Show notification
          browser.notifications.create({
            type: 'basic',
            iconUrl: browser.runtime.getURL('icons/icon-48.png'),
            title: 'Prayer Time',
            message: `It's time for ${currentPrayer.name} prayer`
          });
          
          // Play adzan sound
          playAdzanSound(
            result.muteTabsDuringAthan, 
            result.adzanSound,
            result.adzanVolume,
            currentPrayer.name
          );
        }
      }
    }
  } catch (error) {
    console.error('Error checking next prayer:', error);
  }
}

// Check if it's 5 minutes before the next prayer
async function checkFiveMinuteWarning() {
  try {
    const result = await browser.storage.local.get([
      'prayerTimes', 
      'enableNotifications'
    ]);
    
    // Check if notifications are enabled
    if (result.enableNotifications === false) {
      return;
    }
    
    if (result.prayerTimes) {
      const now = new Date();
      // Add 5 minutes to current time for comparison
      const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60000);
      const warningTime = fiveMinutesFromNow.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: false 
      });
      
      // Check all prayer times
      const times = result.prayerTimes;
      const prayerTimes = [
        { name: 'Subuh', time: times.subuh },
        { name: 'Zohor', time: times.zohor },
        { name: 'Asar', time: times.asar },
        { name: 'Maghrib', time: times.maghrib },
        { name: 'Isha', time: times.isha }
      ];
      
      // Check if 5 minutes from now matches any prayer time
      const upcomingPrayer = prayerTimes.find(prayer => {
        // Handle both 12-hour and 24-hour formats
        let prayerTimeToCompare = prayer.time;
        
        // If it's 12-hour format, convert to 24-hour for comparison
        if (prayer.time.includes('AM') || prayer.time.includes('PM')) {
          const prayerTimeParts = prayer.time.split(' ');
          const time = prayerTimeParts[0];
          const period = prayerTimeParts[1];
          
          let [hours, minutes] = time.split(':').map(Number);
          
          // Convert to 24-hour format
          if (period === 'PM' && hours !== 12) {
            hours += 12;
          } else if (period === 'AM' && hours === 12) {
            hours = 0;
          }
          
          prayerTimeToCompare = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        } else {
          // Already in 24-hour format, just extract the time part
          prayerTimeToCompare = prayer.time;
        }
        
        // Extract just the HH:MM part for comparison
        const [prayerHours, prayerMinutes] = prayerTimeToCompare.split(':');
        const prayerTime24 = `${prayerHours}:${prayerMinutes}`;
        return prayerTime24 === warningTime;
      });
      
      if (upcomingPrayer) {
        // Show 5-minute warning notification
        browser.notifications.create({
          type: 'basic',
          iconUrl: browser.runtime.getURL('icons/icon-48.png'),
          title: 'Prayer Time Reminder',
          message: `${upcomingPrayer.name} prayer in 5 minutes`
        });
      }
    }
  } catch (error) {
    console.error('Error checking 5-minute warning:', error);
  }
}

// Global variables for adzan playback control
let currentAdzanAudio = null;
let mutedTabs = [];
let unmuteTimeout = null;
let adzanNotificationId = null;

// Play adzan sound with improved tab muting functionality and volume boosting
async function playAdzanSound(muteTabs = false, adzanSound = 'Azan TV3.mp3', adzanVolume = 100, prayerName = '') { // Set Azan TV3 as default
  try {
    let currentTabId = null;
    
    // Get current tab ID (the adzan tab)
    try {
      const currentTabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (currentTabs && currentTabs.length > 0) {
        currentTabId = currentTabs[0].id;
      }
    } catch (tabError) {
      console.warn('Could not get current tab ID:', tabError);
    }
    
    // Mute audio tabs if requested (but not the current adzan tab)
    if (muteTabs) {
      try {
        console.log('Muting audio tabs (excluding adzan tab)...');
        // Get all tabs
        const tabs = await browser.tabs.query({});
        
        // Mute only tabs that are playing audio and are not the current tab
        for (const tab of tabs) {
          // Skip the current tab (adzan tab) and tabs that are not audible
          if ((tab.id === currentTabId) || (!tab.audible)) {
            continue;
          }
          
          try {
            await browser.tabs.update(tab.id, { muted: true });
            mutedTabs.push(tab.id);
            console.log(`Muted audio tab ${tab.id}`);
          } catch (tabError) {
            console.warn(`Could not mute tab ${tab.id}:`, tabError);
          }
        }
        
        console.log(`Muted ${mutedTabs.length} audio tabs during adzan`);
      } catch (muteError) {
        console.error('Error muting audio tabs:', muteError);
      }
    }
    
    // Skip if adzan is disabled or set to none
    if (adzanSound === 'none') {
      // Unmute tabs and return
      if (mutedTabs.length > 0) {
        await unmuteTabsAfterDelay();
      }
      return;
    }
    
    // Map adzan sound to actual file
    const soundMap = {
      'default': 'audio/athan.mp3',
      'Azan Jiharkah Furqan.mp3': 'audio/Azan Jiharkah Furqan.mp3',
      'Azan Jiharkah Munif Hijjaz.mp3': 'audio/Azan Jiharkah Munif Hijjaz.mp3',
      'Azan TV3.mp3': 'audio/Azan TV3.mp3'
      // Removed simple-bell since it's not in the audio folder
    };
    
    const soundFile = soundMap[adzanSound] || soundMap['Azan TV3.mp3']; // Set Azan TV3 as fallback default
    
    // Create audio element and play with improved performance
    currentAdzanAudio = new Audio(browser.runtime.getURL(soundFile));
    
    // Set volume (convert percentage to 0.0-6.0 range for up to 600% boost)
    try {
      // Convert 0-100% to 0.0-6.0 for up to 600% volume boost
      const volumeMultiplier = Math.min(6.0, Math.max(0.0, (adzanVolume / 100) * 6));
      currentAdzanAudio.volume = volumeMultiplier > 1.0 ? 1.0 : volumeMultiplier; // HTML5 audio max is 1.0
      
      // If volume boost is requested (>100%), use Web Audio API for boosting
      if (volumeMultiplier > 1.0) {
        // Create persistent AudioContext for volume boosting (reuse if exists)
        if (!audioContext) {
          audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        // Ensure AudioContext is running (required for modern browsers)
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }
        
        const source = audioContext.createMediaElementSource(currentAdzanAudio);
        const gainNode = audioContext.createGain();
        
        // Set gain to boost volume (1.0 = 100%, 6.0 = 600%)
        gainNode.gain.value = volumeMultiplier;
        
        // Connect the audio graph: source -> gain -> destination
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        console.log(`Volume boosted to ${volumeMultiplier * 100}% (${volumeMultiplier}x)`);
      }
    } catch (volumeError) {
      console.warn('Could not set volume boost:', volumeError);
      currentAdzanAudio.volume = 1.0; // Max volume as fallback
    }
    
    // Preload audio for faster playback
    currentAdzanAudio.preload = 'auto';
    
    // Show notification with stop button
    adzanNotificationId = await browser.notifications.create({
      type: 'basic',
      iconUrl: browser.runtime.getURL('icons/icon-48.png'),
      title: `${prayerName} Prayer Time`,
      message: 'Adzan is playing. Click to stop.',
      buttons: [{
        title: 'Stop Adzan'
      }]
    });
    
    // Listen for notification button click
    const handleNotificationClick = (notificationId, buttonIndex) => {
      if (notificationId === adzanNotificationId && buttonIndex === 0) {
        stopAdzan();
        browser.notifications.onButtonClicked.removeListener(handleNotificationClick);
      }
    };
    
    browser.notifications.onButtonClicked.addListener(handleNotificationClick);
    
    // Handle notification close (cleanup)
    const handleNotificationClose = (notificationId) => {
      if (notificationId === adzanNotificationId) {
        browser.notifications.onClosed.removeListener(handleNotificationClose);
      }
    };
    
    browser.notifications.onClosed.addListener(handleNotificationClose);
    
    // Play audio with error handling
    await currentAdzanAudio.play().catch(error => {
      console.error('Error playing adzan sound:', error);
      throw error;
    });
    
    console.log('Adzan sound started playing');
    
    // Wait for audio to finish
    await new Promise((resolve) => {
      currentAdzanAudio.addEventListener('ended', () => {
        console.log('Adzan sound finished playing');
        resolve();
      });
      
      // Also resolve if there's an error
      currentAdzanAudio.addEventListener('error', (error) => {
        console.error('Adzan sound error:', error);
        resolve();
      });
    });
    
    // Close the notification when adzan finishes
    if (adzanNotificationId) {
      browser.notifications.clear(adzanNotificationId);
    }
    
    // Unmute tabs after adzan finishes
    await unmuteTabsAfterDelay();
  } catch (error) {
    console.error('Error playing adzan sound:', error);
    
    // Close the notification on error
    if (adzanNotificationId) {
      browser.notifications.clear(adzanNotificationId);
    }
    
    // Make sure to unmute tabs even if there's an error
    await unmuteTabsAfterDelay();
  }
}

// Stop adzan playback
function stopAdzan() {
  try {
    // Stop audio if playing
    if (currentAdzanAudio) {
      currentAdzanAudio.pause();
      currentAdzanAudio = null;
      console.log('Adzan stopped by user');
    }
    
    // Close the notification
    if (adzanNotificationId) {
      browser.notifications.clear(adzanNotificationId);
      adzanNotificationId = null;
    }
    
    // Unmute tabs after delay
    unmuteTabsAfterDelay();
  } catch (error) {
    console.error('Error stopping adzan:', error);
  }
}

// Unmute tabs after a 10-second delay
async function unmuteTabsAfterDelay() {
  try {
    // Clear any existing unmute timeout
    if (unmuteTimeout) {
      clearTimeout(unmuteTimeout);
      unmuteTimeout = null;
    }
    
    // Schedule automatic unmuting in 10 seconds
    unmuteTimeout = setTimeout(async () => {
      if (mutedTabs.length > 0) {
        await unmuteTabs(mutedTabs);
        mutedTabs = [];
      }
    }, 10000); // 10 seconds
  } catch (error) {
    console.error('Error scheduling unmute:', error);
  }
}

// Unmute previously muted tabs
async function unmuteTabs(tabIds) {
  try {
    console.log('Unmuting tabs...');
    for (const tabId of tabIds) {
      try {
        await browser.tabs.update(tabId, { muted: false });
        console.log(`Unmuted tab ${tabId}`);
      } catch (tabError) {
        console.warn(`Could not unmute tab ${tabId}:`, tabError);
      }
    }
    console.log(`Unmuted ${tabIds.length} tabs after adzan`);
  } catch (unmuteError) {
    console.error('Error unmuting tabs:', unmuteError);
  }
}

// Initialize on extension install
browser.runtime.onInstalled.addListener(() => {
  console.log('Prayer Times extension installed');
  updatePrayerTimes();
});