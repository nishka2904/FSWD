// Elements
const cityInput = document.getElementById('city-input');
const searchBtn = document.getElementById('search-btn');
const errorMsg = document.getElementById('error-msg');
const weatherContent = document.getElementById('weather-content');
const loader = document.getElementById('loader');

const cityName = document.getElementById('city-name');
const currentDate = document.getElementById('current-date');
const currentTemp = document.getElementById('current-temp');
const currentDesc = document.getElementById('current-desc');
const currentIcon = document.getElementById('current-icon');
const humidityVal = document.getElementById('humidity-val');
const windVal = document.getElementById('wind-val');
const feelsLikeVal = document.getElementById('feels-like-val');

const hourlyContainer = document.getElementById('hourly-container');
const weeklyContainer = document.getElementById('weekly-container');

// WMO Weather Code Mapping (Open-Meteo)
const weatherMap = {
    0: { desc: 'Clear sky', icon: 'fa-sun', type: 'clear' },
    1: { desc: 'Mainly clear', icon: 'fa-sun', type: 'clear' },
    2: { desc: 'Partly cloudy', icon: 'fa-cloud-sun', type: 'clouds' },
    3: { desc: 'Overcast', icon: 'fa-cloud', type: 'clouds' },
    45: { desc: 'Fog', icon: 'fa-smog', type: 'clouds' },
    48: { desc: 'Depositing rime fog', icon: 'fa-smog', type: 'clouds' },
    51: { desc: 'Light drizzle', icon: 'fa-cloud-rain', type: 'rain' },
    53: { desc: 'Moderate drizzle', icon: 'fa-cloud-rain', type: 'rain' },
    55: { desc: 'Dense drizzle', icon: 'fa-cloud-rain', type: 'rain' },
    56: { desc: 'Light freezing drizzle', icon: 'fa-cloud-meatball', type: 'rain' },
    57: { desc: 'Dense freezing drizzle', icon: 'fa-cloud-meatball', type: 'rain' },
    61: { desc: 'Slight rain', icon: 'fa-cloud-showers-heavy', type: 'rain' },
    63: { desc: 'Moderate rain', icon: 'fa-cloud-showers-heavy', type: 'rain' },
    65: { desc: 'Heavy rain', icon: 'fa-cloud-showers-heavy', type: 'rain' },
    66: { desc: 'Light freezing rain', icon: 'fa-cloud-meatball', type: 'rain' },
    67: { desc: 'Heavy freezing rain', icon: 'fa-cloud-meatball', type: 'rain' },
    71: { desc: 'Slight snow fall', icon: 'fa-snowflake', type: 'clouds' },
    73: { desc: 'Moderate snow fall', icon: 'fa-snowflake', type: 'clouds' },
    75: { desc: 'Heavy snow fall', icon: 'fa-snowflake', type: 'clouds' },
    77: { desc: 'Snow grains', icon: 'fa-snowflake', type: 'clouds' },
    80: { desc: 'Slight rain showers', icon: 'fa-cloud-showers-water', type: 'rain' },
    81: { desc: 'Moderate rain showers', icon: 'fa-cloud-showers-water', type: 'rain' },
    82: { desc: 'Violent rain showers', icon: 'fa-cloud-showers-water', type: 'rain' },
    85: { desc: 'Slight snow showers', icon: 'fa-snowflake', type: 'clouds' },
    86: { desc: 'Heavy snow showers', icon: 'fa-snowflake', type: 'clouds' },
    95: { desc: 'Thunderstorm', icon: 'fa-cloud-bolt', type: 'rain' },
    96: { desc: 'Thunderstorm with slight hail', icon: 'fa-cloud-bolt', type: 'rain' },
    99: { desc: 'Thunderstorm with heavy hail', icon: 'fa-cloud-bolt', type: 'rain' }
};

// Event Listeners
searchBtn.addEventListener('click', () => {
    if (cityInput.value.trim() !== '') {
        getWeather(cityInput.value.trim());
    }
});

cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && cityInput.value.trim() !== '') {
        getWeather(cityInput.value.trim());
    }
});

async function getWeather(city) {
    showLoader(true);
    errorMsg.style.display = 'none';

    try {
        // Step 1: Geocoding (Get Lat & Lon)
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
        const geoData = await geoRes.json();

        if (!geoData.results || geoData.results.length === 0) {
            throw new Error("City not found");
        }

        const location = geoData.results[0];
        const { latitude, longitude, name, country } = location;

        // Step 2: Fetch Weather Data
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
        const weatherRes = await fetch(weatherUrl);
        const weatherData = await weatherRes.json();

        updateUI({ name, country }, weatherData);
        
    } catch (err) {
        console.error(err);
        errorMsg.textContent = err.message === "City not found" ? "City not found. Please try again." : "Failed to fetch weather data.";
        errorMsg.style.display = 'block';
        weatherContent.style.display = 'none';
        document.body.className = 'weather-clear'; // Reset background
    } finally {
        showLoader(false);
    }
}

function updateUI(location, data) {
    weatherContent.style.display = 'flex';
    
    const current = data.current;
    const weatherInfo = weatherMap[current.weather_code] || { desc: 'Unknown', icon: 'fa-cloud', type: 'clouds' };

    // Update Theme Background
    document.body.className = `weather-${weatherInfo.type}`;

    // Current Info
    cityName.textContent = `${location.name}, ${location.country}`;
    currentDate.textContent = formatDate(current.time);
    
    currentTemp.textContent = `${Math.round(current.temperature_2m)}°`;
    currentDesc.textContent = weatherInfo.desc;
    currentIcon.innerHTML = `<i class="fa-solid ${weatherInfo.icon}"></i>`;
    
    humidityVal.textContent = `${current.relative_humidity_2m}%`;
    windVal.textContent = `${current.wind_speed_10m} km/h`;
    feelsLikeVal.textContent = `${Math.round(current.apparent_temperature)}°`;

    // Hourly Forecast (Next 24 hours)
    renderHourly(data.hourly);

    // 7-day Forecast
    renderWeekly(data.daily);
    
    cityInput.value = ''; // clear input
}

function renderHourly(hourlyData) {
    hourlyContainer.innerHTML = '';
    const currentHourIndex = hourlyData.time.findIndex(time => new Date(time) >= new Date());
    
    // Show next 24 hours starting from now
    for (let i = currentHourIndex; i < currentHourIndex + 24; i++) {
        if (!hourlyData.time[i]) break;
        
        const time = new Date(hourlyData.time[i]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const temp = Math.round(hourlyData.temperature_2m[i]);
        const code = hourlyData.weather_code[i];
        const iconInfo = weatherMap[code] || { icon: 'fa-cloud' };
        
        const div = document.createElement('div');
        div.className = 'hourly-item';
        div.innerHTML = `
            <span class="hourly-time">${i === currentHourIndex ? 'Now' : time}</span>
            <i class="fa-solid ${iconInfo.icon}"></i>
            <span class="hourly-temp">${temp}°</span>
        `;
        hourlyContainer.appendChild(div);
    }
}

function renderWeekly(dailyData) {
    weeklyContainer.innerHTML = '';
    
    // Open-Meteo returns 7 days of daily data by default
    for (let i = 0; i < dailyData.time.length; i++) {
        const dateStr = dailyData.time[i];
        const dateObj = new Date(dateStr);
        // Correctly handle "Today"
        const isToday = i === 0;
        const dayName = isToday ? 'Today' : dateObj.toLocaleDateString('en-US', { weekday: 'short' });
        
        const maxTemp = Math.round(dailyData.temperature_2m_max[i]);
        const minTemp = Math.round(dailyData.temperature_2m_min[i]);
        const code = dailyData.weather_code[i];
        const iconInfo = weatherMap[code] || { icon: 'fa-cloud' };

        const div = document.createElement('div');
        div.className = 'daily-item';
        div.innerHTML = `
            <div class="daily-day">${dayName}</div>
            <div class="daily-icon"><i class="fa-solid ${iconInfo.icon}"></i></div>
            <div class="daily-temp-range">
                <span class="temp-min">${minTemp}°</span>
                <span class="temp-max">${maxTemp}°</span>
            </div>
        `;
        weeklyContainer.appendChild(div);
    }
}

function formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
}

function showLoader(show) {
    if (show) {
        loader.classList.add('active');
    } else {
        loader.classList.remove('active');
    }
}

// Initial Load - Get user location or default to London
window.addEventListener('DOMContentLoaded', () => {
    // Default fallback
    getWeather('London');
});
