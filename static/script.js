const apiKey = "76ffcb790c096f40e9477cace29fdb86";

// DOM Elements
const elements = {
    input: document.querySelector('#cityinput'),
    searchBtn: document.querySelector('#add'),
    locateBtn: document.querySelector('#locate'),
    city: document.querySelector('#cityoutput'),
    description: document.querySelector('#description'),
    temp: document.querySelector('#temp'),
    wind: document.querySelector('#wind'),
    humidity: document.querySelector('#humidity'),
    forecastDiv: document.querySelector('#forecast'),
    unitToggle: document.querySelector('#unitToggle'),
    loading: document.querySelector('#loading'),
    weatherBox: document.querySelector('#weather-box'),
    alertBox: document.querySelector('#alert-box'),
    weatherSound: document.querySelector('#weatherSound'),
    toggleSoundBtn: document.querySelector('#toggleSound'),
    communityGallery: document.querySelector('#communityGallery'),
    weatherFilter: document.querySelector('#weatherFilter'),
    shareModal: document.querySelector('#shareModal'),
    shareToCommBtn: document.querySelector('#shareToComm'),
    closeModalBtn: document.querySelector('.close'),
    submitShareBtn: document.querySelector('#submitShare'),
    imageUploadBtn: document.querySelector('#imageUpload'),
    weatherImageContainer: document.querySelector('#weather-image-container'),
    cameraContainer: document.querySelector('#cameraContainer'),
    cameraPreview: document.querySelector('#cameraPreview'),
    openCameraBtn: document.querySelector('#openCamera'),
    capturePhotoBtn: document.querySelector('#capturePhoto'),
    switchCameraBtn: document.querySelector('#switchCamera'),
    closeCameraBtn: document.querySelector('#closeCamera'),
    dropZone: document.querySelector('#dropZone'),
    analysisModal: document.querySelector('#analysisModal'),
    analysisResults: document.querySelector('#analysisResults'),
    refreshGalleryBtn: document.querySelector('#refreshGallery')
};

// Global state
const state = {
    isCelsius: true,
    currentKelvin: null,
    currentWeatherSound: null,
    stream: null,
    facingMode: 'environment',
    currentImageData: null,
    marker: null
};

// Initialize map
const map = L.map('map').setView([20, 78], 5);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Weather sounds mapping
const weatherSounds = {
    'Clear Sky': 'sunny.mp3',
    'Cloudy': 'cloudy.mp3',
    'Rain': 'rain.mp3',
    'Thunderstorm': 'thunder.mp3',
    'Snow': 'snow.mp3',
    'Windy': 'wind.mp3'
};

// Weather Functions
function updateWeatherSound(condition) {
    const soundFile = weatherSounds[condition] || weatherSounds.default;
    elements.weatherSound.src = `/static/sounds/${soundFile}`;
    elements.weatherSound.load();
    elements.toggleSoundBtn.textContent = 'Play Ambience';
}

function convertTemp(kelvin) {
    return state.isCelsius ? 
        (kelvin - 273.15).toFixed(2) + " °C" : 
        (((kelvin - 273.15) * 9/5) + 32).toFixed(2) + " °F";
}

async function fetchWeather(cityName) {
  if (!cityName) {
        displayAlert("Please enter a city name!", "error");
    return;
  }

    elements.loading.style.display = "block";
    elements.weatherBox.style.display = "none";
    elements.alertBox.style.display = "none";

    try {
        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${cityName}&appid=${apiKey}`);
        const data = await response.json();

      if (data.cod !== 200) {
            displayAlert("City not found!", "error");
        return;
      }

        elements.input.value = "";
        state.currentKelvin = data.main.temp;

        const iconCode = data.weather[0].icon;
        const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
      const currentTime = new Date().toLocaleString();

        elements.city.innerHTML = `Weather in <b>${data.name}</b>`;
        elements.description.innerHTML = `Condition: ${data.weather[0].description}`;
        elements.temp.innerHTML = `Temperature: ${convertTemp(state.currentKelvin)}`;
        elements.wind.innerHTML = `Wind Speed: ${(data.wind.speed * 3.6).toFixed(2)} km/h`;
        elements.humidity.innerHTML = `Humidity: ${data.main.humidity}%`;

      document.querySelector('#weather-icon').src = iconUrl;
      document.querySelector('#weather-time').innerHTML = `🕒 ${currentTime}`;

        elements.weatherBox.style.display = "block";
        updateMap(data.coord.lat, data.coord.lon, data.name);
        checkWeatherAlerts(data);
        fetchForecast(cityName);
        updateWeatherSound(data.weather[0].main);

    } catch (error) {
        console.error("Error fetching weather:", error);
        displayAlert("Error fetching weather data. Please try again.", "error");
    } finally {
        elements.loading.style.display = "none";
    }
}

// Image Analysis Functions
async function handleImageUpload(event) {
    const file = event.target.files ? event.target.files[0] : event;
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
        elements.loading.style.display = "block";
        elements.weatherImageContainer.style.display = "none";

        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        
        if (data.error) {
            displayAlert(data.error, "error");
            return;
        }

        elements.weatherImageContainer.innerHTML = `
            <div class="uploaded-image">
                <img src="${data.image_url}" alt="Weather Image">
            </div>
        `;
        elements.weatherImageContainer.style.display = 'block';
        
        displayAnalysisResults({
            predicted_weather: data.predicted_weather || 'Unknown',
            brightness: Math.round((data.brightness || 0) * 100),
            cloud_coverage: Math.round((data.cloud_coverage || 0) * 100)
        });
        
        elements.shareToCommBtn.disabled = false;
        state.currentImageData = {
            imageUrl: data.image_url,
            weather: data.predicted_weather
        };
        
    } catch (error) {
        console.error('Error:', error);
        displayAlert("Error analyzing image. Please try again.", "error");
    } finally {
        elements.loading.style.display = "none";
    }
}

// Camera Functions
async function initializeCamera() {
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Camera access not supported');
        }

        if (state.stream) {
            state.stream.getTracks().forEach(track => track.stop());
        }

        const constraints = {
            video: {
                facingMode: state.facingMode,
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            }
        };

        state.stream = await navigator.mediaDevices.getUserMedia(constraints);
        elements.cameraPreview.srcObject = state.stream;
        elements.cameraContainer.style.display = 'block';
        elements.dropZone.style.display = 'none';
        elements.capturePhotoBtn.disabled = false;
        
    } catch (error) {
        console.error('Error accessing camera:', error);
        displayAlert('Error accessing camera. Please make sure you have granted camera permissions.', 'error');
    }
}

function stopCamera() {
    if (state.stream) {
        state.stream.getTracks().forEach(track => track.stop());
        state.stream = null;
    }
    elements.cameraContainer.style.display = 'none';
    elements.dropZone.style.display = 'block';
}

async function switchCamera() {
    state.facingMode = state.facingMode === 'environment' ? 'user' : 'environment';
    await initializeCamera();
}

function capturePhoto() {
    const canvas = document.createElement('canvas');
    canvas.width = elements.cameraPreview.videoWidth;
    canvas.height = elements.cameraPreview.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (state.facingMode === 'user') {
        ctx.scale(-1, 1);
        ctx.translate(-canvas.width, 0);
    }
    
    ctx.drawImage(elements.cameraPreview, 0, 0);
    
    canvas.toBlob(blob => {
        const file = new File([blob], "camera-capture.jpg", { type: "image/jpeg" });
        handleImageUpload({ target: { files: [file] } });
    }, 'image/jpeg', 0.9);
}

// Display Functions
function displayAnalysisResults(data) {
    elements.analysisResults.innerHTML = `
        <div class="weather-details">
            <div class="weather-detail-item">
                <i class="fas fa-cloud"></i>
                <h3>Weather Condition</h3>
                <p>${data.predicted_weather}</p>
            </div>
            <div class="weather-detail-item">
                <i class="fas fa-sun"></i>
                <h3>Brightness</h3>
                <p>${data.brightness}%</p>
            </div>
            <div class="weather-detail-item">
                <i class="fas fa-tint"></i>
                <h3>Cloud Coverage</h3>
                <p>${data.cloud_coverage}%</p>
            </div>
        </div>
    `;
    elements.analysisModal.style.display = "block";
}

function displayAlert(message, type = 'info') {
    elements.alertBox.innerHTML = message;
    elements.alertBox.style.display = "block";
    elements.alertBox.className = 'alert-box ' + type;
    
    setTimeout(() => {
        elements.alertBox.style.display = "none";
    }, 5000);
}

// Event Listeners
elements.imageUploadBtn.addEventListener('change', handleImageUpload);
elements.shareToCommBtn.addEventListener('click', () => elements.shareModal.style.display = 'block');
elements.submitShareBtn.addEventListener('click', submitShare);
elements.openCameraBtn.addEventListener('click', initializeCamera);
elements.closeCameraBtn.addEventListener('click', stopCamera);
elements.switchCameraBtn.addEventListener('click', switchCamera);
elements.capturePhotoBtn.addEventListener('click', capturePhoto);
elements.searchBtn.addEventListener('click', () => fetchWeather(elements.input.value));
elements.locateBtn.addEventListener('click', getUserLocation);
elements.unitToggle.addEventListener('click', () => {
    state.isCelsius = !state.isCelsius;
    elements.unitToggle.textContent = state.isCelsius ? "Switch to °F" : "Switch to °C";
    if (state.currentKelvin) {
        elements.temp.innerHTML = `Temperature: ${convertTemp(state.currentKelvin)}`;
    }
});

// Drag and Drop Events
elements.dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    elements.dropZone.classList.add('drag-over');
});

elements.dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    elements.dropZone.classList.remove('drag-over');
});

elements.dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    elements.dropZone.classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
        handleImageUpload({ target: { files: [files[0]] } });
    } else {
        displayAlert('Please drop an image file.', 'error');
    }
});

// Close modals
document.querySelectorAll('.modal .close').forEach(closeBtn => {
    closeBtn.addEventListener('click', () => {
        closeBtn.closest('.modal').style.display = 'none';
    });
});

// Close modals when clicking outside
window.addEventListener('click', (event) => {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
});

// Forecast Functions
async function fetchForecast(cityName) {
    try {
        const response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${cityName}&appid=${apiKey}`);
        const data = await response.json();
        
        elements.forecastDiv.innerHTML = "";
        
        const forecastData = data.list.filter((item, index) => index % 8 === 0);
      forecastData.forEach(day => {
            const date = new Date(day.dt_txt).toDateString();
            const kelvinTemp = day.main.temp;
            const iconCode = day.weather[0].icon;
            const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;

            const forecastBox = document.createElement('div');
        forecastBox.setAttribute('data-kelvin', kelvinTemp);
        forecastBox.innerHTML = `
          <p><b>${date}</b></p>
          <p>${day.weather[0].description} <img src="${iconUrl}" alt="Weather icon"></p>
          <p class="forecast-temp">${convertTemp(kelvinTemp)}</p>
        `;

            elements.forecastDiv.appendChild(forecastBox);
        });
    } catch (error) {
        console.error("Error fetching forecast:", error);
        displayAlert("Error fetching forecast data", "error");
    }
}

// Weather Alert Functions
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

// Map Functions
function updateMap(lat, lon, cityName) {
    if (state.marker) map.removeLayer(state.marker);
    state.marker = L.marker([lat, lon]).addTo(map).bindPopup(`<b>${cityName}</b>`).openPopup();
    map.setView([lat, lon], 10);
}

// Voice Search Setup
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = "en-US";
recognition.interimResults = false;

// Community Functions
async function loadCommunityPhotos(filter = 'all') {
    try {
        const response = await fetch('/community-photos');
        const photos = await response.json();
        
        elements.communityGallery.innerHTML = '';
        
        const filteredPhotos = filter === 'all' 
            ? photos 
            : photos.filter(photo => photo.weather === filter);
        
        if (filteredPhotos.length === 0) {
            elements.communityGallery.innerHTML = '<p class="no-photos">No photos available</p>';
            return;
        }
        
        filteredPhotos.forEach(photo => {
            const photoElement = document.createElement('div');
            photoElement.className = 'gallery-item fade-in';
            photoElement.innerHTML = `
                <img src="/static/community_pics/${photo.filename}" alt="Weather photo from ${photo.location}">
                <div class="gallery-info">
                    <h4>${photo.location}</h4>
                    <p>${photo.weather}</p>
                    <p class="description">${photo.description}</p>
                    <p class="timestamp">${new Date(photo.timestamp).toLocaleDateString()}</p>
                </div>
            `;
            elements.communityGallery.appendChild(photoElement);
        });
    } catch (error) {
        console.error('Error loading community photos:', error);
        elements.communityGallery.innerHTML = '<p class="error">Error loading photos</p>';
    }
}

async function submitShare() {
    const location = document.querySelector('#photoLocation').value;
    const description = document.querySelector('#photoDescription').value;

    if (!location) {
        displayAlert("Please enter a location.", "error");
        return;
    }

    try {
        elements.loading.style.display = "block";
        
        const formData = new FormData();
        formData.append('location', location);
        formData.append('description', description);
        formData.append('weather', state.currentImageData.weather);
        formData.append('image_url', state.currentImageData.imageUrl);

        const response = await fetch('/share-photo', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        
        if (data.success) {
            displayAlert("Photo shared successfully!", "success");
            elements.shareModal.style.display = "none";
            loadCommunityPhotos();
            
            // Clear form
            document.querySelector('#photoLocation').value = '';
            document.querySelector('#photoDescription').value = '';
  } else {
            displayAlert(data.error || "Error sharing photo.", "error");
        }
    } catch (error) {
        console.error('Error:', error);
        displayAlert("Error sharing photo. Please try again.", "error");
    } finally {
        elements.loading.style.display = "none";
    }
}

// Location Functions
async function getUserLocation() {
    if (!navigator.geolocation) {
        displayAlert("Geolocation is not supported by your browser.", "error");
        return;
    }

    try {
        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
        });

        const { latitude: lat, longitude: lon } = position.coords;
        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}`);
        const data = await response.json();
        
        elements.input.value = "";
        fetchWeather(data.name);
    } catch (error) {
        console.error("Error getting location:", error);
        displayAlert("Error getting your location. Please try searching manually.", "error");
    }
}

// Additional Event Listeners
elements.weatherSound.addEventListener('play', () => {
    elements.toggleSoundBtn.textContent = 'Pause Ambience';
});

elements.weatherSound.addEventListener('pause', () => {
    elements.toggleSoundBtn.textContent = 'Play Ambience';
});

elements.toggleSoundBtn.addEventListener('click', () => {
    if (elements.weatherSound.paused) {
        elements.weatherSound.play();
    } else {
        elements.weatherSound.pause();
    }
});

elements.weatherFilter.addEventListener('change', (e) => loadCommunityPhotos(e.target.value));

document.querySelector("#voiceSearch").addEventListener("click", () => {
  displayAlert("🎙️ Listening... Speak a city name", "info");
  recognition.start();
});

recognition.onresult = (event) => {
  const spokenText = event.results[0][0].transcript;
    elements.input.value = spokenText;
  displayAlert(`🔍 Searching for: ${spokenText}`, "info");
  fetchWeather(spokenText);
};

recognition.onerror = () => {
  displayAlert("⚠️ Voice search failed. Try again!", "error");
};

// Dark Mode
const darkModeToggle = document.querySelector("#darkModeToggle");

darkModeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
  darkModeToggle.textContent = document.body.classList.contains("dark-mode") ? "☀️ Light Mode" : "🌙 Dark Mode";
  localStorage.setItem("darkMode", document.body.classList.contains("dark-mode"));
});

// Load dark mode preference
if (localStorage.getItem("darkMode") === "true") {
  document.body.classList.add("dark-mode");
  darkModeToggle.textContent = "☀️ Light Mode";
}

// Mobile view adjustment
if (window.innerWidth < 600) {
    map.setView([20, 78], 4);
}

// Initialize
loadCommunityPhotos();
