// Adzan Player Script
let audio = null;
let audioContext = null;
let audioDuration = 0;
let startTime = null;
let countdownInterval = null;

// Parse URL parameters
const urlParams = new URLSearchParams(window.location.search);
const adzanSound = urlParams.get('sound') || 'Azan TV3.mp3';
const adzanVolume = parseInt(urlParams.get('volume')) || 100;
const prayerName = urlParams.get('prayer') || 'Prayer';

// Update UI with prayer name
document.getElementById('prayer-name').textContent = `${prayerName} Prayer`;

// Map adzan sound to actual file
const soundMap = {
  'default': 'audio/athan.mp3',
  'Azan Jiharkah Furqan.mp3': 'audio/Azan Jiharkah Furqan.mp3',
  'Azan Jiharkah Munif Hijjaz.mp3': 'audio/Azan Jiharkah Munif Hijjaz.mp3',
  'Azan TV3.mp3': 'audio/Azan TV3.mp3'
};

const soundFile = soundMap[adzanSound] || soundMap['Azan TV3.mp3'];

// Initialize and play adzan
async function playAdzan() {
  try {
    // Create audio element
    audio = new Audio(browser.runtime.getURL(soundFile));
    audio.preload = 'auto';
    
    // Set volume with boosting if needed
    const volumeMultiplier = Math.min(6.0, Math.max(0.0, (adzanVolume / 100) * 6));
    
    if (volumeMultiplier > 1.0) {
      // Use Web Audio API for volume boosting
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      const source = audioContext.createMediaElementSource(audio);
      const gainNode = audioContext.createGain();
      
      gainNode.gain.value = volumeMultiplier;
      
      source.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      audio.volume = 1.0;
      document.getElementById('volume-info').textContent = `Volume: ${adzanVolume}% (Boosted)`;
    } else {
      audio.volume = volumeMultiplier;
      document.getElementById('volume-info').textContent = `Volume: ${adzanVolume}%`;
    }
    
    // Handle audio end
    audio.addEventListener('ended', () => {
      console.log('Adzan finished');
      document.getElementById('status').textContent = 'Adzan completed';
      document.getElementById('countdown').textContent = '00:00';
      
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
      
      // Notify background script
      browser.runtime.sendMessage({ type: 'adzanFinished' });
      
      // Close tab after 3 seconds
      setTimeout(() => {
        window.close();
      }, 3000);
    });
    
    // Handle audio error
    audio.addEventListener('error', (error) => {
      console.error('Audio error:', error);
      document.getElementById('status').textContent = 'Error playing adzan';
      
      // Notify background script
      browser.runtime.sendMessage({ type: 'adzanFinished' });
      
      setTimeout(() => {
        window.close();
      }, 3000);
    });
    
    // Wait for metadata to load before playing
    await new Promise((resolve) => {
      audio.addEventListener('loadedmetadata', () => {
        audioDuration = audio.duration;
        console.log('Audio duration:', audioDuration);
        resolve();
      });
    });
    
    // Play audio
    await audio.play();
    startTime = Date.now();
    
    document.getElementById('status').textContent = '🔊 Playing Adzan';
    
    // Start countdown after audio starts playing
    startCountdown();
    
  } catch (error) {
    console.error('Error playing adzan:', error);
    document.getElementById('status').textContent = 'Error: ' + error.message;
    
    // Notify background script
    browser.runtime.sendMessage({ type: 'adzanFinished' });
    
    setTimeout(() => {
      window.close();
    }, 3000);
  }
}

// Start countdown timer
function startCountdown() {
  countdownInterval = setInterval(() => {
    if (!audio || audio.paused) {
      clearInterval(countdownInterval);
      return;
    }
    
    const currentTime = audio.currentTime;
    const remaining = audioDuration - currentTime;
    
    if (remaining <= 0) {
      document.getElementById('countdown').textContent = '00:00';
      clearInterval(countdownInterval);
      return;
    }
    
    const minutes = Math.floor(remaining / 60);
    const seconds = Math.floor(remaining % 60);
    
    document.getElementById('countdown').textContent = 
      `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, 1000);
}

// Stop button handler
document.getElementById('stop-button').addEventListener('click', () => {
  stopAdzan();
});

// Stop adzan function
function stopAdzan() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }
  
  if (audio) {
    audio.pause();
    audio = null;
  }
  
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
  
  document.getElementById('status').textContent = 'Adzan stopped';
  document.getElementById('countdown').textContent = '00:00';
  
  // Notify background script
  browser.runtime.sendMessage({ type: 'adzanFinished' });
  
  // Close tab
  setTimeout(() => {
    window.close();
  }, 1000);
}

// Handle tab close
window.addEventListener('beforeunload', () => {
  if (audio && !audio.paused) {
    browser.runtime.sendMessage({ type: 'adzanFinished' });
  }
});

// Start playing when page loads
window.addEventListener('load', () => {
  playAdzan();
});
