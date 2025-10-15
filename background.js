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

// Set up alarm to check for minute warnings every minute
browser.alarms.create('checkMinuteWarnings', {
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
  } else if (alarm.name === 'checkMinuteWarnings') {
    checkMinuteWarnings();
  }
});

// Update prayer times from API
async function updatePrayerTimes() {
  console.log('Updating prayer times from API...');
  
  try {
    // Get selected location from storage
    const result = await browser.storage.local.get('selectedLocation');
    const locationCode = result.selectedLocation || 'trg01'; // Default to Kuala Terengganu
    
    console.log('Using location code:', locationCode);
    
    // Get prayer times from API
    const prayerTimes = await PrayerTimesCalculator.getPrayerTimes(locationCode);
    
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
    // Don't trigger new adzan if one is already playing
    if (adzanTabId !== null) {
      console.log('Adzan already playing, skipping check');
      return;
    }
    
    const result = await browser.storage.local.get([
      'prayerTimes', 
      'enableNotifications', 
      'enableAthan',
      'muteTabsDuringAthan',
      'adzanVolume',
      'enableDoa'
    ]);
    
    if (result.prayerTimes) {
      const now = new Date();
      const currentTime = now.toLocaleTimeString('en-US', { 
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
      
      // Check if current time matches any prayer time (within 10 seconds)
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
        // Create a unique key for this prayer with current timestamp (to prevent rapid re-triggering)
        const now = new Date();
        const currentMinute = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        const prayerKey = `${currentPrayer.name}-${currentMinute}`;
        
        console.log(`Prayer time matched: ${currentPrayer.name} at ${currentMinute}`);
        console.log(`Prayer key: ${prayerKey}`);
        console.log(`Already triggered: ${triggeredPrayers.has(prayerKey)}`);
        console.log(`Enable Athan: ${result.enableAthan}`);
        
        // Check if we've already triggered this prayer in this minute
        if (!triggeredPrayers.has(prayerKey)) {
          // Mark this prayer as triggered for this minute
          triggeredPrayers.add(prayerKey);
          
          // Clean up old entries (keep only last 10 entries to prevent memory leak)
          if (triggeredPrayers.size > 10) {
            const entries = Array.from(triggeredPrayers);
            triggeredPrayers.delete(entries[0]);
          }
          
          console.log(`Triggering adzan for ${currentPrayer.name} at ${currentMinute}`);
          
          // Show notification if enabled
          if (result.enableNotifications !== false) {
            browser.notifications.create({
              type: 'basic',
              iconUrl: browser.runtime.getURL('icons/icon-48.png'),
              title: 'Prayer Time',
              message: `It's time for ${currentPrayer.name} prayer`
            });
          }
          
          // Play adzan sound if enabled
          if (result.enableAthan !== false) {
            playAdzanSound(
              result.muteTabsDuringAthan, 
              result.adzanVolume,
              currentPrayer.name,
              result.enableDoa
            );
          }
        }
      }
    }
  } catch (error) {
    console.error('Error checking next prayer:', error);
  }
}

// Check for minute warnings (5, 4, 3, 2, 1 minutes before prayer)
async function checkMinuteWarnings() {
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
      const times = result.prayerTimes;
      const prayerTimes = [
        { name: 'Subuh', time: times.subuh },
        { name: 'Zohor', time: times.zohor },
        { name: 'Asar', time: times.asar },
        { name: 'Maghrib', time: times.maghrib },
        { name: 'Isha', time: times.isha }
      ];
      
      // Check for 5, 4, 3, 2, and 1 minute warnings
      const minutesToCheck = [5, 4, 3, 2, 1];
      
      for (const minutes of minutesToCheck) {
        const futureTime = new Date(now.getTime() + minutes * 60000);
        const warningTime = futureTime.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit', 
          hour12: false 
        });
        
        // Check if this future time matches any prayer time
        const upcomingPrayer = prayerTimes.find(prayer => {
          // Handle both 12-hour and 24-hour formats
          let prayerTimeToCompare = prayer.time;
          
          // If it's 12-hour format, convert to 24-hour for comparison
          if (prayer.time.includes('AM') || prayer.time.includes('PM')) {
            const prayerTimeParts = prayer.time.split(' ');
            const time = prayerTimeParts[0];
            const period = prayerTimeParts[1];
            
            let [hours, mins] = time.split(':').map(Number);
            
            // Convert to 24-hour format
            if (period === 'PM' && hours !== 12) {
              hours += 12;
            } else if (period === 'AM' && hours === 12) {
              hours = 0;
            }
            
            prayerTimeToCompare = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
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
          // Create unique key to prevent duplicate notifications
          const warningKey = `${upcomingPrayer.name}-${minutes}min-${warningTime}`;
          
          if (!triggeredPrayers.has(warningKey)) {
            triggeredPrayers.add(warningKey);
            
            // Clean up old entries
            if (triggeredPrayers.size > 20) {
              const entries = Array.from(triggeredPrayers);
              triggeredPrayers.delete(entries[0]);
            }
            
            // Show warning notification
            browser.notifications.create({
              type: 'basic',
              iconUrl: browser.runtime.getURL('icons/icon-48.png'),
              title: 'Prayer Time Reminder',
              message: `${upcomingPrayer.name} prayer in ${minutes} minute${minutes > 1 ? 's' : ''}`
            });
            
            console.log(`${minutes}-minute warning for ${upcomingPrayer.name}`);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error checking minute warnings:', error);
  }
}

// Global variables for adzan playback control
let currentAdzanAudio = null;
let mutedTabs = [];
let pausedTabs = [];
let unmuteTimeout = null;
let adzanNotificationId = null;
let adzanTabId = null;
let adzanStartTime = null;

// Play adzan sound by opening a dedicated tab
async function playAdzanSound(muteTabs = false, adzanVolume = 100, prayerName = '', enableDoa = false) {
  try {
    console.log('Starting adzan playback...');
    
    // Store adzan start time
    adzanStartTime = Date.now();
    
    // Create adzan player HTML page
    const adzanPlayerUrl = browser.runtime.getURL('adzan-player.html') + 
      `?volume=${adzanVolume}&prayer=${encodeURIComponent(prayerName)}&enableDoa=${enableDoa}`;
    
    // Open adzan player in a new tab
    const tab = await browser.tabs.create({
      url: adzanPlayerUrl,
      active: true
    });
    
    adzanTabId = tab.id;
    console.log('Adzan player tab opened:', adzanTabId);
    
    // Pause media in tabs if requested (after creating adzan tab)
    if (muteTabs) {
      try {
        console.log('Pausing media in tabs...');
        const tabs = await browser.tabs.query({});
        
        for (const currentTab of tabs) {
          // Skip the adzan tab itself
          if (currentTab.id === adzanTabId) {
            console.log(`Skipping adzan tab ${currentTab.id}`);
            continue;
          }
          
          try {
            // Execute script to pause all media elements
            await browser.tabs.executeScript(currentTab.id, {
              code: `
                (function() {
                  const mediaElements = document.querySelectorAll('video, audio');
                  let pausedCount = 0;
                  mediaElements.forEach(media => {
                    if (!media.paused) {
                      media.pause();
                      media.dataset.adzanPaused = 'true';
                      pausedCount++;
                    }
                  });
                  return pausedCount;
                })();
              `
            });
            
            // Also mute the tab as backup
            if (currentTab.audible) {
              await browser.tabs.update(currentTab.id, { muted: true });
              mutedTabs.push(currentTab.id);
            }
            
            pausedTabs.push(currentTab.id);
            console.log(`Paused media in tab ${currentTab.id}`);
          } catch (tabError) {
            console.warn(`Could not pause media in tab ${currentTab.id}:`, tabError);
          }
        }
        console.log(`Paused media in ${pausedTabs.length} tabs during adzan`);
      } catch (pauseError) {
        console.error('Error pausing media in tabs:', pauseError);
      }
    }
    
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
    
    // Unpause media and unmute tabs immediately
    await unpauseMediaAndUnmuteTabs();
  } catch (error) {
    console.error('Error stopping adzan:', error);
  }
}

// Store total duration from adzan player
let adzanTotalDuration = 0;

// Listen for messages from adzan player
browser.runtime.onMessage.addListener((message, sender) => {
  if (message.type === 'adzanFinished') {
    console.log('Adzan finished playing');
    adzanTabId = null;
    adzanStartTime = null;
    adzanTotalDuration = 0;
    unmuteTabsAfterDelay();
  } else if (message.type === 'adzanStarted') {
    // Store the total duration and reset start time when adzan/doa starts
    adzanTotalDuration = message.duration || 0;
    adzanStartTime = Date.now(); // Reset start time for accurate countdown
    console.log('Adzan/Doa started with duration:', adzanTotalDuration);
  } else if (message.type === 'getAdzanStatus') {
    // Return adzan status to popup
    return Promise.resolve({
      isPlaying: adzanTabId !== null,
      startTime: adzanStartTime,
      tabId: adzanTabId,
      totalDuration: adzanTotalDuration
    });
  } else if (message.type === 'stopAdzan') {
    stopAdzan();
  } else if (message.type === 'updatePrayerTimes') {
    // Update prayer times when location changes
    updatePrayerTimes();
  }
});

// Unpause media and unmute tabs
async function unpauseMediaAndUnmuteTabs() {
  try {
    console.log('Unpausing media and unmuting tabs...');
    
    // Unpause media in all paused tabs
    for (const tabId of pausedTabs) {
      try {
        await browser.tabs.executeScript(tabId, {
          code: `
            (function() {
              const mediaElements = document.querySelectorAll('video, audio');
              let unpausedCount = 0;
              mediaElements.forEach(media => {
                if (media.dataset.adzanPaused === 'true') {
                  media.play();
                  delete media.dataset.adzanPaused;
                  unpausedCount++;
                }
              });
              return unpausedCount;
            })();
          `
        });
        console.log(`Unpaused media in tab ${tabId}`);
      } catch (tabError) {
        console.warn(`Could not unpause media in tab ${tabId}:`, tabError);
      }
    }
    
    // Unmute tabs
    await unmuteTabs(mutedTabs);
    
    // Clear arrays
    pausedTabs = [];
    mutedTabs = [];
  } catch (error) {
    console.error('Error unpausing media and unmuting tabs:', error);
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
    
    // Schedule automatic unpausing and unmuting in 10 seconds
    unmuteTimeout = setTimeout(async () => {
      await unpauseMediaAndUnmuteTabs();
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

// Clear triggered prayers at midnight
function scheduleMiddnightReset() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  const msUntilMidnight = tomorrow.getTime() - now.getTime();
  
  setTimeout(() => {
    console.log('Midnight reset - clearing triggered prayers');
    triggeredPrayers.clear();
    // Schedule next midnight reset
    scheduleMiddnightReset();
  }, msUntilMidnight);
}

// Initialize on extension install
browser.runtime.onInstalled.addListener(() => {
  console.log('Prayer Times extension installed');
  updatePrayerTimes();
  scheduleMiddnightReset();
});