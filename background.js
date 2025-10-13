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
let adzanTabId = null;
let adzanStartTime = null;

// Play adzan sound by opening a dedicated tab
async function playAdzanSound(muteTabs = false, adzanSound = 'Azan TV3.mp3', adzanVolume = 100, prayerName = '') {
  try {
    console.log('Starting adzan playback...');
    
    // Skip if adzan is disabled or set to none
    if (adzanSound === 'none') {
      return;
    }
    
    // Mute audio tabs if requested
    if (muteTabs) {
      try {
        console.log('Muting audio tabs...');
        const tabs = await browser.tabs.query({});
        
        for (const tab of tabs) {
          if (tab.audible) {
            try {
              await browser.tabs.update(tab.id, { muted: true });
              mutedTabs.push(tab.id);
              console.log(`Muted audio tab ${tab.id}`);
            } catch (tabError) {
              console.warn(`Could not mute tab ${tab.id}:`, tabError);
            }
          }
        }
        console.log(`Muted ${mutedTabs.length} audio tabs during adzan`);
      } catch (muteError) {
        console.error('Error muting audio tabs:', muteError);
      }
    }
    
    // Store adzan start time
    adzanStartTime = Date.now();
    
    // Create adzan player HTML page
    const adzanPlayerUrl = browser.runtime.getURL('adzan-player.html') + 
      `?sound=${encodeURIComponent(adzanSound)}&volume=${adzanVolume}&prayer=${encodeURIComponent(prayerName)}`;
    
    // Open adzan player in a new tab
    const tab = await browser.tabs.create({
      url: adzanPlayerUrl,
      active: true
    });
    
    adzanTabId = tab.id;
    console.log('Adzan player tab opened:', adzanTabId);
    
  } catch (error) {
    console.error('Error playing adzan sound:', error);
    // Make sure to unmute tabs even if there's an error
    await unmuteTabsAfterDelay();
  }
}

// Stop adzan playback
async function stopAdzan() {
  try {
    console.log('Stopping adzan...');
    
    // Close adzan tab if open
    if (adzanTabId) {
      try {
        await browser.tabs.remove(adzanTabId);
        console.log('Adzan tab closed');
      } catch (tabError) {
        console.warn('Could not close adzan tab:', tabError);
      }
      adzanTabId = null;
    }
    
    // Clear start time
    adzanStartTime = null;
    
    // Close the notification
    if (adzanNotificationId) {
      browser.notifications.clear(adzanNotificationId);
      adzanNotificationId = null;
    }
    
    // Unmute tabs immediately
    await unmuteTabs(mutedTabs);
    mutedTabs = [];
  } catch (error) {
    console.error('Error stopping adzan:', error);
  }
}

// Listen for messages from adzan player
browser.runtime.onMessage.addListener((message, sender) => {
  if (message.type === 'adzanFinished') {
    console.log('Adzan finished playing');
    adzanTabId = null;
    adzanStartTime = null;
    unmuteTabsAfterDelay();
  } else if (message.type === 'getAdzanStatus') {
    // Return adzan status to popup
    return Promise.resolve({
      isPlaying: adzanTabId !== null,
      startTime: adzanStartTime,
      tabId: adzanTabId
    });
  } else if (message.type === 'stopAdzan') {
    stopAdzan();
  }
});

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