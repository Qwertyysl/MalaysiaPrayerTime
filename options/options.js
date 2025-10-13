// Options page script for prayer times extension

// Persistent AudioContext for volume boosting
let audioContext = null;

document.addEventListener('DOMContentLoaded', function() {
  // Load saved settings
  loadSettings();
  
  // Set up form submission
  const form = document.getElementById('settings-form');
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    saveSettings();
  });
  
  // Set up test adzan button
  const testBtn = document.getElementById('test-adzan-btn');
  testBtn.addEventListener('click', function() {
    testAdzan();
  });
  
  // Set up stop adzan button
  const stopBtn = document.getElementById('stop-adzan-btn');
  stopBtn.addEventListener('click', function() {
    stopAdzan();
  });
  
  // Set up changelog button
  const changelogBtn = document.getElementById('changelog-btn');
  if (changelogBtn) {
    changelogBtn.addEventListener('click', function() {
      // Open changelog in a new tab
      browser.tabs.create({
        url: browser.runtime.getURL('changelog.txt')
      });
    });
  }
  
  // Set up volume slider display update
  const volumeSlider = document.getElementById('adzan-volume');
  const volumeValue = document.getElementById('volume-value');
  if (volumeSlider && volumeValue) {
    volumeSlider.addEventListener('input', function() {
      volumeValue.textContent = this.value + '%';
    });
  }
  
  // Set up developer mode toggle
  const developerModeCheckbox = document.getElementById('developer-mode');
  const testSection = document.getElementById('test-section');
  
  developerModeCheckbox.addEventListener('change', function() {
    if (this.checked) {
      testSection.style.display = 'block';
    } else {
      testSection.style.display = 'none';
    }
  });
});

// Load settings from storage
function loadSettings() {
  browser.storage.local.get([
    'adzanSound',
    'enableNotifications',
    'enableAthan',
    'muteTabsDuringAthan',
    'adzanVolume',
    'developerMode'
  ]).then((result) => {
    // Set form values
    document.getElementById('adzan-sound').value = 
      result.adzanSound || 'Azan TV3.mp3'; // Set Azan TV3 as default
      
    document.getElementById('enable-notifications').checked = 
      result.enableNotifications !== false; // Default to true
      
    document.getElementById('enable-athan').checked = 
      result.enableAthan !== false; // Default to true
      
    document.getElementById('mute-tabs-during-athan').checked = 
      result.muteTabsDuringAthan || false;
      
    // Set volume slider (default to max volume 100%)
    const volumeSlider = document.getElementById('adzan-volume');
    const volumeValue = document.getElementById('volume-value');
    if (volumeSlider && volumeValue) {
      volumeSlider.value = result.adzanVolume !== undefined ? result.adzanVolume : 100;
      volumeValue.textContent = volumeSlider.value + '%';
    }
    
    // Set developer mode and show/hide test section
    const developerMode = result.developerMode || false;
    document.getElementById('developer-mode').checked = developerMode;
    document.getElementById('test-section').style.display = developerMode ? 'block' : 'none';
  });
}

// Save settings to storage
function saveSettings() {
  const settings = {
    adzanSound: document.getElementById('adzan-sound').value,
    enableNotifications: document.getElementById('enable-notifications').checked,
    enableAthan: document.getElementById('enable-athan').checked,
    muteTabsDuringAthan: document.getElementById('mute-tabs-during-athan').checked,
    adzanVolume: parseInt(document.getElementById('adzan-volume').value),
    developerMode: document.getElementById('developer-mode').checked
  };
  
  browser.storage.local.set(settings).then(() => {
    // Show success message
    showMessage('Settings saved successfully!', 'success');
  }).catch((error) => {
    // Show error message
    showMessage('Error saving settings: ' + error.message, 'error');
  });
}

// Show status message
function showMessage(text, type) {
  const messageElement = document.getElementById('status-message');
  messageElement.textContent = text;
  messageElement.className = type;
  messageElement.style.display = 'block';
  
  // Hide message after 3 seconds
  setTimeout(() => {
    messageElement.style.display = 'none';
  }, 3000);
}

// Global variables for adzan test
let testAudio = null;
let mutedTabs = [];
let countdownInterval = null;
let unmuteTimeout = null;

// Test adzan with 10s countdown
function testAdzan() {
  const countdownDisplay = document.getElementById('countdown-display');
  let countdown = 10;
  
  // Disable the test button and show stop button
  const testBtn = document.getElementById('test-adzan-btn');
  const stopBtn = document.getElementById('stop-adzan-btn');
  testBtn.disabled = true;
  stopBtn.style.display = 'inline-block';
  
  // Clear any existing unmute timeout
  if (unmuteTimeout) {
    clearTimeout(unmuteTimeout);
    unmuteTimeout = null;
  }
  
  // Start countdown
  countdownInterval = setInterval(() => {
    countdownDisplay.textContent = `Adzan will play in ${countdown} seconds...`;
    countdown--;
    
    if (countdown < 0) {
      clearInterval(countdownInterval);
      countdownDisplay.textContent = 'Playing adzan...';
      
      // Play adzan sound
      playAdzanSound();
    }
  }, 1000);
}

// Stop adzan playback
function stopAdzan() {
  const countdownDisplay = document.getElementById('countdown-display');
  const testBtn = document.getElementById('test-adzan-btn');
  const stopBtn = document.getElementById('stop-adzan-btn');
  
  // Stop countdown if active
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  
  // Stop audio if playing
  if (testAudio) {
    testAudio.pause();
    testAudio = null;
    countdownDisplay.textContent = 'Adzan stopped!';
  } else {
    countdownDisplay.textContent = 'Adzan was not playing.';
  }
  
  // Unmute tabs immediately
  unmuteTestTabs();
  
  // Re-enable buttons
  testBtn.disabled = false;
  stopBtn.style.display = 'none';
}

// Play adzan sound with tab muting for test and volume boosting
async function playAdzanSound() {
  try {
    // Get settings from storage
    const result = await browser.storage.local.get([
      'adzanSound', 
      'adzanVolume', 
      'muteTabsDuringAthan'
    ]);
    
    const adzanSound = result.adzanSound || 'Azan TV3.mp3'; // Set Azan TV3 as default
    const adzanVolume = result.adzanVolume !== undefined ? result.adzanVolume : 100;
    const muteTabs = result.muteTabsDuringAthan || false;
    
    // Skip if adzan is disabled or set to none
    if (adzanSound === 'none') {
      finishTestAdzan();
      return;
    }
    
    // Mute audio tabs if requested
    if (muteTabs) {
      await muteAudioTabsForTest();
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
    
    // Create audio element and play
    testAudio = new Audio(browser.runtime.getURL(soundFile));
    
    // Set volume (convert percentage to 0.0-6.0 range for up to 600% boost)
    try {
      // Convert 0-100% to 0.0-6.0 for up to 600% volume boost
      const volumeMultiplier = Math.min(6.0, Math.max(0.0, (adzanVolume / 100) * 6));
      testAudio.volume = volumeMultiplier > 1.0 ? 1.0 : volumeMultiplier; // HTML5 audio max is 1.0
      
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
        
        const source = audioContext.createMediaElementSource(testAudio);
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
      testAudio.volume = 1.0; // Max volume as fallback
    }
    
    // Preload audio for faster playback
    testAudio.preload = 'auto';
    
    // Handle audio events
    testAudio.addEventListener('ended', () => {
      console.log('Test adzan finished playing');
      finishTestAdzan();
    });
    
    testAudio.addEventListener('error', (error) => {
      console.error('Test adzan error:', error);
      finishTestAdzan();
    });
    
    // Play audio
    await testAudio.play();
    
  } catch (error) {
    console.error('Error playing adzan sound:', error);
    showMessage('Error playing adzan sound: ' + error.message, 'error');
    finishTestAdzan();
  }
}

// Mute audio tabs for test (excluding current tab)
async function muteAudioTabsForTest() {
  try {
    console.log('Muting audio tabs for test (excluding current tab)...');
    mutedTabs = []; // Reset muted tabs array
    
    // Get current tab ID
    let currentTabId = null;
    try {
      const currentTabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (currentTabs && currentTabs.length > 0) {
        currentTabId = currentTabs[0].id;
      }
    } catch (tabError) {
      console.warn('Could not get current tab ID:', tabError);
    }
    
    // Get all tabs
    const tabs = await browser.tabs.query({});
    
    // Mute only tabs that are playing audio and are not the current tab
    for (const tab of tabs) {
      // Skip the current tab and tabs that are not audible
      if ((tab.id === currentTabId) || (!tab.audible)) {
        continue;
      }
      
      try {
        await browser.tabs.update(tab.id, { muted: true });
        mutedTabs.push(tab.id);
        console.log(`Muted audio tab ${tab.id} for test`);
      } catch (tabError) {
        console.warn(`Could not mute tab ${tab.id}:`, tabError);
      }
    }
    
    console.log(`Muted ${mutedTabs.length} audio tabs during test adzan`);
  } catch (muteError) {
    console.error('Error muting audio tabs for test:', muteError);
  }
}

// Unmute tabs after test
async function unmuteTestTabs() {
  try {
    if (mutedTabs.length > 0) {
      console.log('Unmuting tabs after test...');
      for (const tabId of mutedTabs) {
        try {
          await browser.tabs.update(tabId, { muted: false });
          console.log(`Unmuted tab ${tabId} after test`);
        } catch (tabError) {
          console.warn(`Could not unmute tab ${tabId}:`, tabError);
        }
      }
      console.log(`Unmuted ${mutedTabs.length} tabs after test adzan`);
      mutedTabs = []; // Clear the array
    }
  } catch (unmuteError) {
    console.error('Error unmuting tabs after test:', unmuteError);
  }
}

// Finish test adzan and schedule automatic unmuting
function finishTestAdzan() {
  const countdownDisplay = document.getElementById('countdown-display');
  const testBtn = document.getElementById('test-adzan-btn');
  const stopBtn = document.getElementById('stop-adzan-btn');
  
  // Update display
  countdownDisplay.textContent = 'Adzan finished!';
  
  // Schedule automatic unmuting in 10 seconds
  if (unmuteTimeout) {
    clearTimeout(unmuteTimeout);
  }
  
  unmuteTimeout = setTimeout(() => {
    unmuteTestTabs();
    countdownDisplay.textContent = 'Tabs unmuted automatically after 10 seconds.';
  }, 10000); // 10 seconds
  
  // Re-enable test button and hide stop button
  testBtn.disabled = false;
  stopBtn.style.display = 'none';
  
  // Clear audio reference
  testAudio = null;
}