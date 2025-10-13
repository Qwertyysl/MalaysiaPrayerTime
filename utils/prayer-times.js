/**
 * Prayer Times Calculator using Aladhan API as fallback
 */

// Export functions directly for easier importing
const PrayerTimesCalculator = {
  /**
   * Calculate prayer times for Kuala Terengganu using Aladhan API
   * @returns {Promise<Object>} Prayer times
   */
  getPrayerTimes: async function() {
    try {
      // First try the original JAKIM API
      try {
        const response = await fetch('https://api.waktusolat.app/v2/solat/trg01');
        
        if (!response.ok) {
          throw new Error(`JAKIM API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        
        // Get today's date
        const today = new Date();
        const todayDay = today.getDate();
        
        // Find today's prayer times in the response
        const todayData = data.prayers.find(day => day.day === todayDay);
        
        if (!todayData) {
          throw new Error('No prayer times found for today in JAKIM API');
        }
        
        // Convert timestamps to 12-hour format times
        const formatTime12Hour = (timestamp) => {
          const date = new Date(timestamp * 1000);
          return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        };
        
        // Return the prayer times in our expected format
        return {
          subuh: formatTime12Hour(todayData.fajr),
          zohor: formatTime12Hour(todayData.dhuhr),
          asar: formatTime12Hour(todayData.asr),
          maghrib: formatTime12Hour(todayData.maghrib),
          isha: formatTime12Hour(todayData.isha),
          date: `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${todayDay.toString().padStart(2, '0')}`
        };
      } catch (jakimError) {
        console.warn('JAKIM API failed, falling back to Aladhan API:', jakimError);
        // Fallback to Aladhan API
        const response = await fetch('http://api.aladhan.com/v1/timingsByCity?city=Kuala+Terengganu&country=Malaysia&method=3');
        
        if (!response.ok) {
          throw new Error(`Aladhan API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.code !== 200) {
          throw new Error('Aladhan API returned an error: ' + data.status);
        }
        
        const timings = data.data.timings;
        
        // Return the prayer times in our expected format
        return {
          subuh: timings.Fajr,
          zohor: timings.Dhuhr,
          asar: timings.Asr,
          maghrib: timings.Maghrib,
          isha: timings.Isha,
          date: data.data.date.readable
        };
      }
    } catch (error) {
      console.error('Error fetching prayer times:', error);
      throw error;
    }
  },
  
  /**
   * Calculate time remaining until next prayer
   * @param {Object} prayerTimes - Object containing prayer times
   * @returns {Object} Next prayer information with countdown
   */
  getNextPrayer: function(prayerTimes) {
    const now = new Date();
    const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();
    
    // Include the required prayers (Subuh, Zohor, Asar, Maghrib, Isha)
    const prayers = [
      { name: 'Subuh', time: prayerTimes.subuh },
      { name: 'Zohor', time: prayerTimes.zohor },
      { name: 'Asar', time: prayerTimes.asar },
      { name: 'Maghrib', time: prayerTimes.maghrib },
      { name: 'Isha', time: prayerTimes.isha }
    ];
    
    // Convert prayer times to minutes (handle 12-hour format)
    const prayerMinutes = prayers.map(prayer => {
      try {
        // Handle both 12-hour and 24-hour formats
        let timeStr = prayer.time;
        let hours, minutes, period;
        
        // Check if it's 12-hour format (contains AM/PM)
        if (timeStr.includes('AM') || timeStr.includes('PM')) {
          const timeParts = timeStr.split(' ');
          if (timeParts.length !== 2) {
            console.error('Invalid 12-hour time format:', timeStr);
            return 0;
          }
          
          const time = timeParts[0];
          period = timeParts[1];
          
          [hours, minutes] = time.split(':').map(Number);
          
          // Convert to 24-hour format
          if (period === 'PM' && hours !== 12) {
            hours += 12;
          } else if (period === 'AM' && hours === 12) {
            hours = 0;
          }
        } else {
          // Assume it's 24-hour format
          [hours, minutes] = timeStr.split(':').map(Number);
        }
        
        return hours * 60 + minutes;
      } catch (error) {
        console.error('Error parsing time:', prayer.time, error);
        return 0;
      }
    });
    
    // Find next prayer
    let nextPrayerIndex = -1;
    for (let i = 0; i < prayerMinutes.length; i++) {
      if (prayerMinutes[i] > currentTimeInMinutes) {
        nextPrayerIndex = i;
        break;
      }
    }
    
    // If no next prayer today, it's Isha or later, so next is Subuh tomorrow
    if (nextPrayerIndex === -1) {
      nextPrayerIndex = 0;
    }
    
    // Calculate time remaining
    let timeRemainingInMinutes;
    if (nextPrayerIndex === 0 && prayerMinutes[nextPrayerIndex] < currentTimeInMinutes) {
      // Next prayer is Subuh tomorrow
      timeRemainingInMinutes = (24 * 60 - currentTimeInMinutes) + prayerMinutes[nextPrayerIndex];
    } else {
      timeRemainingInMinutes = prayerMinutes[nextPrayerIndex] - currentTimeInMinutes;
    }
    
    // Convert to hours and minutes
    const hours = Math.floor(timeRemainingInMinutes / 60);
    const minutes = timeRemainingInMinutes % 60;
    
    return {
      name: prayers[nextPrayerIndex].name,
      time: prayers[nextPrayerIndex].time,
      hours: hours,
      minutes: minutes,
      totalMinutes: timeRemainingInMinutes
    };
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PrayerTimesCalculator;
} else if (typeof window !== 'undefined') {
  // For browser environments
  window.PrayerTimesCalculator = PrayerTimesCalculator;
}