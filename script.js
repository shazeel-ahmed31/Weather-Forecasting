// Weather App JavaScript
class WeatherApp {
  constructor() {
    this.initializeElements()
    this.bindEvents()
    this.service = new WeatherService()
    this.requestId = 0
    this.abortController = null

    this.currentWeatherCondition = null
    this.particles = []

    this.createFloatingActionButton()
    this.initializeParticleSystem()
    this.loadDefaultCity()
  }

  initializeElements() {
    // Input elements
    this.cityInput = document.getElementById("cityInput")
    this.searchBtn = document.getElementById("searchBtn")
    this.suggestions = document.getElementById("suggestions")

    // State elements
    this.loading = document.getElementById("loading")
    this.error = document.getElementById("error")
    this.weatherContainer = document.getElementById("weatherContainer")
    this.errorMessage = document.getElementById("errorMessage")
    this.retryBtn = document.getElementById("retryBtn")

    // Weather display elements
    this.cityName = document.getElementById("cityName")
    this.country = document.getElementById("country")
    this.currentDate = document.getElementById("currentDate")
    this.weatherIcon = document.getElementById("weatherIcon")
    this.weatherDescription = document.getElementById("weatherDescription")
    this.currentTemp = document.getElementById("currentTemp")
    this.feelsLike = document.getElementById("feelsLike")
    this.minTemp = document.getElementById("minTemp")
    this.maxTemp = document.getElementById("maxTemp")
    this.visibility = document.getElementById("visibility")
    this.humidity = document.getElementById("humidity")
    this.windSpeed = document.getElementById("windSpeed")
    this.pressure = document.getElementById("pressure")
    this.uvIndex = document.getElementById("uvIndex")
    this.cloudiness = document.getElementById("cloudiness")
    this.forecastGrid = document.getElementById("forecastGrid")
  }

  bindEvents() {
    this.searchBtn.addEventListener("click", () => this.handleSearch())
    this.cityInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        this.handleSearch()
      }
    })
    this.cityInput.addEventListener("input", (e) => this.handleInputChange(e))
    this.retryBtn.addEventListener("click", () => {
      if (this.lastLocation) this.getWeatherByCoords(this.lastLocation.latitude, this.lastLocation.longitude);
      else this.handleSearch();
    })
    this.locationNotice = document.getElementById('locationNotice')
    document.getElementById('locationBtn').addEventListener('click', () => this.useLocation())
    this.cityInput.addEventListener('keydown', event => { if(event.key==='Escape') this.hideSuggestions(); })
    document.addEventListener('keydown', event => {
      if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('.detail-item, .forecast-item')) {
        event.preventDefault(); event.target.click();
      }
    })

    // Hide suggestions when clicking outside
    document.addEventListener("click", (e) => {
      if (!this.cityInput.contains(e.target) && !this.suggestions.contains(e.target)) {
        this.hideSuggestions()
      }
    })

    // Add click events for detail items
    document.addEventListener("click", (e) => {
      if (e.target.closest(".detail-item")) {
        const detailItem = e.target.closest(".detail-item")
        const label = detailItem.querySelector("span").textContent
        const value = detailItem.querySelector("span:last-child").textContent

        const content = this.getDetailExplanation(label, value)
        this.showWeatherModal(label, content)
      }
    })

    // Add forecast item click events
    document.addEventListener("click", (e) => {
      if (e.target.closest(".forecast-item")) {
        const forecastItem = e.target.closest(".forecast-item")
        const date = forecastItem.querySelector(".forecast-date").textContent
        const desc = forecastItem.querySelector(".forecast-desc").textContent
        const temps = forecastItem.querySelector(".forecast-temps").textContent

        this.showWeatherModal(
          `Weather for ${date}`,
          `Condition: ${desc}. Temperature: ${temps}.`,
        )
      }
    })
  }

  loadDefaultCity() { this.cityInput.value = 'London'; this.getWeatherByCity('London'); }

  useLocation() {
    const requestId = ++this.requestId;
    this.abortController?.abort();
    this.showLoading();
    if (!navigator.geolocation) { this.locationNotice.textContent = 'Geolocation is unavailable. Showing London.'; this.loadDefaultCity(); return; }
    navigator.geolocation.getCurrentPosition(position => {
      if (requestId === this.requestId) this.getWeatherByCoords(position.coords.latitude, position.coords.longitude);
    }, () => {
      if (requestId === this.requestId) {
        this.locationNotice.textContent = 'Location unavailable or permission denied. Showing London; you can search another city.';
        this.loadDefaultCity();
      }
    }, {timeout:10000,maximumAge:300000});
  }

  handleSearch() {
    const city = this.cityInput.value.trim()
    this.hideSuggestions()
    this.lastLocation = null
    this.getWeatherByCity(city)
  }

  handleInputChange(e) {
    const query = e.target.value.trim()
    if (query.length > 2) {
      this.showSuggestions(query)
    } else {
      this.hideSuggestions()
    }
  }

  showSuggestions(query) {
    // Simple city suggestions (in a real app, you might use a cities API)
    const cities = [
      "London, UK",
      "New York, US",
      "Tokyo, JP",
      "Paris, FR",
      "Sydney, AU",
      "Berlin, DE",
      "Moscow, RU",
      "Beijing, CN",
      "Mumbai, IN",
      "Cairo, EG",
      "Los Angeles, US",
      "Chicago, US",
      "Toronto, CA",
      "Mexico City, MX",
      "São Paulo, BR",
      "Buenos Aires, AR",
      "Lagos, NG",
      "Istanbul, TR",
    ]

    const filteredCities = cities.filter((city) => city.toLowerCase().includes(query.toLowerCase()))

    if (filteredCities.length > 0) {
      this.suggestions.replaceChildren()
      filteredCities.slice(0,5).forEach(city => {
        const button = document.createElement('button')
        button.type = 'button'; button.className = 'suggestion-item'; button.textContent = city
        button.addEventListener('click', () => this.selectSuggestion(city.split(',')[0]))
        this.suggestions.appendChild(button)
      })
      this.suggestions.style.display = "block"
    } else {
      this.hideSuggestions()
    }
  }

  selectSuggestion(city) {
    this.cityInput.value = city
    this.hideSuggestions()
    this.getWeatherByCity(city)
  }

  hideSuggestions() {
    this.suggestions.style.display = "none"
  }

  showLoading() {
    this.loading.style.display = "block"
    this.error.style.display = "none"
    this.weatherContainer.style.display = "none"
    this.showToast("Loading weather data...", "info")
  }

  hideLoading() {
    this.loading.style.display = "none"
  }

  showError(message) {
    this.hideLoading()
    this.error.style.display = "block"
    this.weatherContainer.style.display = "none"
    this.errorMessage.textContent = message
    this.showToast(message, "error")
  }

  showWeather() {
    this.hideLoading()
    this.error.style.display = "none"
    this.weatherContainer.style.display = "block"
    this.weatherContainer.classList.add("fade-in")
  }

  async requestWeather(load) {
    const id = ++this.requestId;
    this.abortController?.abort();
    this.abortController = new AbortController();
    const controller = this.abortController;
    const timeout = setTimeout(() => controller.abort(), 15000);
    this.showLoading();
    try {
      const {location,weather} = await load(controller.signal);
      if (id === this.requestId) this.displayWeather(location, weather);
    } catch (error) {
      if (id === this.requestId) this.showError(error.name === 'AbortError' ? 'Request timed out. Please try again.' : error.message || 'Unable to load weather. Please try again.');
    } finally { clearTimeout(timeout); }
  }

  getWeatherByCity(city) {
    this.lastLocation = null;
    return this.requestWeather(signal => this.service.city(city, signal));
  }

  getWeatherByCoords(latitude, longitude) {
    this.lastLocation = {latitude,longitude};
    return this.requestWeather(async signal => ({
      location:{name:'Your location',country:'',latitude,longitude},
      weather:await this.service.coords(latitude,longitude,signal)
    }));
  }

  displayWeather(location, weatherData) {
    const current = weatherData.current
    const daily = weatherData.daily

    // Display current weather
    this.cityName.textContent = location.name
    this.country.textContent = location.country || ""
    this.currentDate.textContent = `${forecastDate(current.time.slice(0,10), {weekday:'long',year:'numeric',month:'long',day:'numeric'})} · ${current.time.slice(11,16)} (${weatherData.timezone || 'location time'})`

    // Get weather icon and description based on weather code
    const weatherInfo = this.getWeatherInfo(current.weather_code, current.is_day)
    this.weatherIcon.src = weatherInfo.icon
    this.weatherIcon.alt = weatherInfo.description
    this.weatherDescription.textContent = weatherInfo.description

    this.currentTemp.textContent = weatherValue(current.temperature_2m, '°C')
    this.feelsLike.textContent = weatherValue(current.apparent_temperature, '°C')
    this.minTemp.textContent = weatherValue(daily.temperature_2m_min[0], '°C')
    this.maxTemp.textContent = weatherValue(daily.temperature_2m_max[0], '°C')

    this.visibility.textContent = weatherValue(visibilityAtCurrentHour(weatherData), ' km', 1)
    this.humidity.textContent = weatherValue(current.relative_humidity_2m, '%')
    this.windSpeed.textContent = weatherValue(current.wind_speed_10m, ' km/h', 1)
    this.pressure.textContent = weatherValue(current.pressure_msl, ' hPa')
    this.uvIndex.textContent = weatherValue(daily.uv_index_max[0], '', 1)
    this.cloudiness.textContent = weatherValue(current.cloud_cover, '%')

    // Display 5-day forecast
    this.displayForecast(daily)

    // Add weather-specific animations and effects
    const weatherCode = weatherData.current.weather_code
    this.currentWeatherCondition = weatherCode

    // Create particles based on weather
    this.createWeatherParticles(weatherCode)

    // Update background theme
    this.updateBackgroundTheme(weatherCode)

    // Show success toast
    this.showToast(`Weather updated for ${location.name}!`, "success")

    this.showWeather()
  }

  getWeatherInfo(weatherCode, isDay) {
    const weatherCodes = {
      0: { description: "Clear sky", day: "☀️", night: "🌙" },
      1: { description: "Mainly clear", day: "🌤️", night: "🌙" },
      2: { description: "Partly cloudy", day: "⛅", night: "☁️" },
      3: { description: "Overcast", day: "☁️", night: "☁️" },
      45: { description: "Foggy", day: "🌫️", night: "🌫️" },
      48: { description: "Depositing rime fog", day: "🌫️", night: "🌫️" },
      51: { description: "Light drizzle", day: "🌦️", night: "🌧️" },
      53: { description: "Moderate drizzle", day: "🌦️", night: "🌧️" },
      55: { description: "Dense drizzle", day: "🌧️", night: "🌧️" },
      56: { description: "Light freezing drizzle", day: "🌨️", night: "🌨️" },
      57: { description: "Dense freezing drizzle", day: "🌨️", night: "🌨️" },
      61: { description: "Slight rain", day: "🌦️", night: "🌧️" },
      63: { description: "Moderate rain", day: "🌧️", night: "🌧️" },
      65: { description: "Heavy rain", day: "🌧️", night: "🌧️" },
      66: { description: "Light freezing rain", day: "🌨️", night: "🌨️" },
      67: { description: "Heavy freezing rain", day: "🌨️", night: "🌨️" },
      71: { description: "Slight snow fall", day: "🌨️", night: "🌨️" },
      73: { description: "Moderate snow fall", day: "❄️", night: "❄️" },
      75: { description: "Heavy snow fall", day: "❄️", night: "❄️" },
      77: { description: "Snow grains", day: "🌨️", night: "🌨️" },
      80: { description: "Slight rain showers", day: "🌦️", night: "🌧️" },
      81: { description: "Moderate rain showers", day: "🌧️", night: "🌧️" },
      82: { description: "Violent rain showers", day: "⛈️", night: "⛈️" },
      85: { description: "Slight snow showers", day: "🌨️", night: "🌨️" },
      86: { description: "Heavy snow showers", day: "❄️", night: "❄️" },
      95: { description: "Thunderstorm", day: "⛈️", night: "⛈️" },
      96: { description: "Thunderstorm with slight hail", day: "⛈️", night: "⛈️" },
      99: { description: "Thunderstorm with heavy hail", day: "⛈️", night: "⛈️" },
    }

    const weather = weatherCodes[weatherCode] || {description:"Unknown condition",day:"❔",night:"❔"}
    const icon = isDay ? weather.day : weather.night

    // Create a data URL for the emoji icon
    const canvas = document.createElement("canvas")
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext("2d")
    ctx.font = "48px Arial"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(icon, 32, 32)

    return {
      description: weather.description,
      icon: canvas.toDataURL(),
    }
  }

  displayForecast(daily) {
    const forecastItems = []

    // Skip today (index 0) and show next 5 days
    for (let i = 1; i < Math.min(6, daily.time.length); i++) {
      const date = daily.time[i]
      const dayName = forecastDate(date, { weekday: "short" })
      const monthDay = forecastDate(date, { month: "short", day: "numeric" })

      const weatherInfo = this.getWeatherInfo(daily.weather_code[i], true)

      forecastItems.push(`
      <div class="forecast-item" role="button" tabindex="0">
        <div class="forecast-date">${dayName}<br><small>${monthDay}</small></div>
        <div class="forecast-icon">
          <img src="${weatherInfo.icon}" alt="${weatherInfo.description}" style="width: 50px; height: 50px;">
        </div>
        <div class="forecast-desc">${weatherInfo.description}</div>
        <div class="forecast-temps">
          <span class="forecast-high">${weatherValue(daily.temperature_2m_max[i], '°')}</span>
          <span class="forecast-low">${weatherValue(daily.temperature_2m_min[i], '°')}</span>
        </div>
      </div>
    `)
    }

    this.forecastGrid.innerHTML = forecastItems.join("")
  }

  createFloatingActionButton() {
    const fab = document.createElement("button")
    fab.className = "fab"
    fab.innerHTML = '<i class="fas fa-sync-alt"></i>'
    fab.title = "Refresh Weather"
    fab.setAttribute("aria-label", "Refresh weather")
    fab.addEventListener("click", () => {
      this.showToast("Refreshing weather data...", "info")
      if (this.lastLocation) this.getWeatherByCoords(this.lastLocation.latitude, this.lastLocation.longitude)
      else this.handleSearch()
    })
    document.body.appendChild(fab)
  }

  initializeParticleSystem() {
    const particleContainer = document.createElement("div")
    particleContainer.className = "weather-particles"
    document.body.appendChild(particleContainer)
    this.particleContainer = particleContainer
  }

  createWeatherParticles(weatherCode) {
    // Clear existing particles
    this.clearParticles()
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    let particleType = "cloud"
    let particleCount = 15

    // Determine particle type based on weather code
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(weatherCode)) {
      particleType = "rain"
      particleCount = 50
    } else if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) {
      particleType = "snow"
      particleCount = 30
    } else if ([2, 3, 45, 48].includes(weatherCode)) {
      particleType = "cloud"
      particleCount = 20
    }

    // Create particles
    for (let i = 0; i < particleCount; i++) {
      setTimeout(() => {
        if (this.currentWeatherCondition === weatherCode && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) this.createParticle(particleType)
      }, i * 100)
    }
  }

  createParticle(type) {
    const particle = document.createElement("div")
    particle.className = `particle ${type}`

    // Random positioning
    particle.style.left = Math.random() * 100 + "%"
    particle.style.animationDelay = Math.random() * 2 + "s"
    particle.style.animationDuration = Math.random() * 3 + 2 + "s"

    if (type === "rain") {
      particle.style.animationDuration = Math.random() * 0.5 + 0.5 + "s"
    }

    this.particleContainer.appendChild(particle)
    this.particles.push(particle)

    // Remove particle after animation
    setTimeout(() => {
      if (particle.parentNode) {
        particle.parentNode.removeChild(particle)
      }
    }, 5000)
  }

  clearParticles() {
    this.particles.forEach((particle) => {
      if (particle.parentNode) {
        particle.parentNode.removeChild(particle)
      }
    })
    this.particles = []
  }

  showToast(message, type = "info") {
    // Remove existing toast
    const existingToast = document.querySelector(".toast")
    if (existingToast) {
      existingToast.remove()
    }

    const toast = document.createElement("div")
    toast.className = `toast ${type}`
    toast.textContent = message

    document.body.appendChild(toast)

    // Show toast
    setTimeout(() => {
      toast.classList.add("show")
    }, 100)

    // Hide toast after 3 seconds
    setTimeout(() => {
      toast.classList.remove("show")
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast)
        }
      }, 400)
    }, 3000)
  }

  showWeatherModal(title, content) {
    const previous = document.activeElement;
    const modal = document.createElement('dialog');
    modal.className = 'weather-dialog';
    const heading = document.createElement('h2'); heading.textContent=title;
    const text = document.createElement('p'); text.textContent=content;
    const close = document.createElement('button'); close.textContent='Close'; close.type='button';
    modal.append(heading,text,close); document.body.appendChild(modal);
    modal.setAttribute('aria-label',title);
    close.addEventListener('click', () => modal.close());
    modal.addEventListener('close', () => { modal.remove(); previous?.focus(); });
    modal.showModal(); close.focus();
  }

  updateBackgroundTheme(weatherCode) {
    const body = document.body

    // Remove existing weather classes
    body.classList.remove("weather-bg-sunny", "weather-bg-cloudy", "weather-bg-rainy", "weather-bg-snowy")

    // Add appropriate class based on weather
    if ([0, 1].includes(weatherCode)) {
      body.classList.add("weather-bg-sunny")
    } else if ([2, 3, 45, 48].includes(weatherCode)) {
      body.classList.add("weather-bg-cloudy")
    } else if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(weatherCode)) {
      body.classList.add("weather-bg-rainy")
    } else if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) {
      body.classList.add("weather-bg-snowy")
    }
  }

  getDetailExplanation(label, value) {
    const explanations = {
      Visibility: `Current visibility is ${value}. Good visibility is above 10km. Reduced visibility can be caused by fog, rain, or pollution.`,
      Humidity: `Relative humidity is ${value}. Comfortable humidity levels are between 30-50%. High humidity can make temperatures feel warmer.`,
      "Wind Speed": `Current wind speed is ${value}. Light breeze is 6-11 km/h, moderate breeze is 20-28 km/h, and strong breeze is 39-49 km/h.`,
      Pressure: `Atmospheric pressure is ${value}. Normal pressure is around 1013 hPa. Rising pressure usually means improving weather.`,
      "UV Index": `UV Index is ${value}. 0-2 is low, 3-5 is moderate, 6-7 is high, 8-10 is very high, and 11+ is extreme. Use sunscreen when UV is 3+.`,
      Cloudiness: `Cloud cover is ${value}. This represents the percentage of sky covered by clouds. 0% is clear sky, 100% is completely overcast.`,
    }

    return explanations[label] || `Current ${label.toLowerCase()} is ${value}.`
  }

  getWeatherTip(condition) {
    const tips = {
      "Clear sky": "Perfect day for outdoor activities! Don't forget sunscreen.",
      "Partly cloudy": "Great weather for a walk or outdoor sports.",
      Overcast: "Good day for indoor activities or a cozy coffee.",
      "Light rain": "Don't forget your umbrella!",
      "Heavy rain": "Stay indoors and enjoy a good book.",
      Snow: "Perfect for winter sports or building a snowman!",
      Thunderstorm: "Stay safe indoors and avoid outdoor activities.",
    }

    return tips[condition] || "Have a great day!"
  }
}

// Initialize the weather app when the page loads
let weatherApp
if (typeof document !== "undefined") document.addEventListener("DOMContentLoaded", () => {
  weatherApp = new WeatherApp()
})

if (typeof module !== 'undefined') module.exports = {WeatherApp};
