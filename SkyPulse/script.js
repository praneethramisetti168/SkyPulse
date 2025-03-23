const apiKey = "76ffcb790c096f40e9477cace29fdb86"; // Replace with your OpenWeather API key

const input = document.querySelector('#cityinput');
const searchBtn = document.querySelector('#add');
const locateBtn = document.querySelector('#locate');
const city = document.querySelector('#cityoutput');
const description = document.querySelector('#description');
const temp = document.querySelector('#temp');
const wind = document.querySelector('#wind');
const humidity = document.querySelector('#humidity');
const forecastDiv = document.querySelector('#forecast');
const unitToggle = document.querySelector('#unitToggle');
const loading = document.querySelector('#loading');
const weatherBox = document.querySelector('#weather-box');
const alertBox = document.querySelector('#alert-box'); // Alert display box

let isCelsius = true;
let currentKelvin = null;

// Initialize Map
let map = L.map('map').setView([20, 78], 5);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);
let marker;

// Convert Kelvin to Celsius or Fahrenheit
function convertTemp(kelvin) {
  return isCelsius ? (kelvin - 273.15).toFixed(2) + " °C" : (((kelvin - 273.15) * 9/5) + 32).toFixed(2) + " °F";
}

// Fetch Weather Data
function fetchWeather(cityName) {
  if (!cityName) {
    alert("Please enter a city name!");
    return;
  }

  loading.style.display = "block";
  weatherBox.style.display = "none";
  alertBox.style.display = "none"; // Hide previous alerts

  fetch(`https://api.openweathermap.org/data/2.5/weather?q=${cityName}&appid=${apiKey}`)
    .then(response => response.json())
    .then(data => {
      if (data.cod !== 200) {
        alert("City not found!");
        return;
      }

      input.value = ""; // Clear input
      currentKelvin = data.main.temp; // Store temp in Kelvin

      city.innerHTML = `Weather in <b>${data.name}</b>`;
      description.innerHTML = `Condition: ${data.weather[0].description}`;
      temp.innerHTML = `Temperature: ${convertTemp(currentKelvin)}`;
      wind.innerHTML = `Wind Speed: ${(data.wind.speed * 3.6).toFixed(2)} km/h`;
      humidity.innerHTML = `Humidity: ${data.main.humidity}%`;

      weatherBox.style.display = "block";
      loading.style.display = "none";

      // Update Map
      updateMap(data.coord.lat, data.coord.lon, data.name);

      // Check for severe weather alerts
      checkWeatherAlerts(data);

      // Fetch 5-day forecast
      fetchForecast(cityName);
    })
    .catch(error => console.error("Error fetching data:", error));
}

// Fetch 5-day Forecast
function fetchForecast(cityName) {
  fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${cityName}&appid=${apiKey}`)
    .then(response => response.json())
    .then(data => {
      forecastDiv.innerHTML = "";
      
      let forecastData = data.list.filter((item, index) => index % 8 === 0);
      forecastData.forEach(day => {
        let date = new Date(day.dt_txt).toDateString();
        let kelvinTemp = day.main.temp;

        let forecastBox = document.createElement('div');
        forecastBox.setAttribute('data-kelvin', kelvinTemp);
        forecastBox.innerHTML = `
          <p><b>${date}</b></p>
          <p>${day.weather[0].description}</p>
          <p class="forecast-temp">${convertTemp(kelvinTemp)}</p>
        `;

        forecastDiv.appendChild(forecastBox);
      });
    })
    .catch(error => console.error("Error fetching forecast:", error));
}

// Check for Weather Alerts
function checkWeatherAlerts(data) {
  const kelvinTemp = data.main.temp;
  const windSpeed = data.wind.speed * 3.6; // Convert m/s to km/h
  const condition = data.weather[0].description.toLowerCase();
  let alertMessage = "";

  if (kelvinTemp - 273.15 > 40) {
    alertMessage += "🔥 Heatwave Alert: Temperature above 40°C!<br>";
  }
  if (kelvinTemp - 273.15 < 5) {
    alertMessage += "❄️ Cold Weather Alert: Temperature below 5°C!<br>";
  }
  if (condition.includes("heavy rain")) {
    alertMessage += "🌧️ Heavy Rain Alert: Carry an umbrella!<br>";
  }
  if (condition.includes("thunderstorm")) {
    alertMessage += "⛈️ Storm Alert: Stay indoors!<br>";
  }
  if (windSpeed > 50) {
    alertMessage += "💨 High Wind Alert: Winds above 50 km/h!<br>";
  }

  if (alertMessage) {
    displayAlert(alertMessage);
  }
}

// Display Weather Alert
function displayAlert(message) {
  alertBox.innerHTML = `<b>⚠️ Weather Alert:</b><br>${message}`;
  alertBox.style.display = "block";
  alertBox.style.background = "#ff4d4d";
  alertBox.style.color = "white";
  alertBox.style.padding = "10px";
  alertBox.style.borderRadius = "5px";

  // Play Notification Sound
  const alertSound = new Audio("https://www.soundjay.com/button/beep-07.wav");
  alertSound.play();
}

// Get User's Location
function getUserLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(position => {
      let lat = position.coords.latitude;
      let lon = position.coords.longitude;

      fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}`)
        .then(response => response.json())
        .then(data => {
          input.value = ""; 
          fetchWeather(data.name);
        })
        .catch(error => console.error("Error fetching location weather:", error));
    });
  } else {
    alert("Geolocation not supported by your browser.");
  }
}

// Update Map Function
function updateMap(lat, lon, cityName) {
  if (marker) map.removeLayer(marker);
  marker = L.marker([lat, lon]).addTo(map).bindPopup(`<b>${cityName}</b>`).openPopup();
  map.setView([lat, lon], 10);
}

// Event Listeners
unitToggle.addEventListener('click', () => {
  isCelsius = !isCelsius;
  unitToggle.textContent = isCelsius ? "Switch to °F" : "Switch to °C";

  if (currentKelvin) {
    temp.innerHTML = `Temperature: ${convertTemp(currentKelvin)}`;
  }

  document.querySelectorAll('#forecast div').forEach((forecastBox) => {
    let kelvin = parseFloat(forecastBox.getAttribute('data-kelvin'));
    forecastBox.querySelector('.forecast-temp').innerText = convertTemp(kelvin);
  });
});

const voiceSearchBtn = document.querySelector("#voiceSearch");

// Check if browser supports speech recognition
window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
recognition.lang = "en-US";
recognition.interimResults = false;

voiceSearchBtn.addEventListener("click", () => {
  displayAlert("🎙️ Listening... Speak a city name", "info");
  recognition.start();
});

recognition.onresult = (event) => {
  const spokenText = event.results[0][0].transcript;
  input.value = spokenText;
  displayAlert(`🔍 Searching for: ${spokenText}`, "info");
  fetchWeather(spokenText);
};

recognition.onerror = (event) => {
  displayAlert("⚠️ Voice search failed. Try again!", "error");
};


const darkModeToggle = document.querySelector("#darkModeToggle");

darkModeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");

  // Update button text
  darkModeToggle.textContent = document.body.classList.contains("dark-mode") ? "☀️ Light Mode" : "🌙 Dark Mode";
  
  // Save user preference
  localStorage.setItem("darkMode", document.body.classList.contains("dark-mode"));
});

// Load preference on page load
if (localStorage.getItem("darkMode") === "true") {
  document.body.classList.add("dark-mode");
  darkModeToggle.textContent = "☀️ Light Mode";
}


if (window.innerWidth < 600) {
  map.setView([20, 78], 4); // Zoom out a bit on mobile
}



// Attach Event Listeners
searchBtn.addEventListener('click', () => fetchWeather(input.value));
locateBtn.addEventListener('click', getUserLocation);
