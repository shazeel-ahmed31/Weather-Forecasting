// Weather App JavaScript
class WeatherApp {
  constructor() {
    // Using Open-Meteo API (free, no API key required)
    this.WEATHER_API = "https://api.open-meteo.com/v1/forecast"
    this.GEOCODING_API = "https://geocoding-api.open-meteo.com/v1/search"

    this.initializeElements()
    this.bindEvents()
    this.loadDefaultCity()

    this.currentWeatherCondition = null
    this.particles = []
    this.animationFrame = null

    this.createFloatingActionButton()
    this.initializeParticleSystem()
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
    this.retryBtn.addEventListener("click", () => this.handleSearch())

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
          `
        <p><strong>Condition:</strong> ${desc}</p>
        <p><strong>Temperature:</strong> ${temps}</p>
        <p><strong>Tip:</strong> ${this.getWeatherTip(desc)}</p>
      `,
        )
      }
    })
  }

  async loadDefaultCity() {
    // Try to get user's location or load a default city
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.getWeatherByCoords(position.coords.latitude, position.coords.longitude)
        },
        () => {
          // Fallback to default city if geolocation fails
          this.getWeatherByCity("London")
        },
      )
    } else {
      this.getWeatherByCity("London")
    }
  }

  handleSearch() {
    const city = this.cityInput.value.trim()
    if (city) {
      this.getWeatherByCity(city)
    }
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
      this.suggestions.innerHTML = filteredCities
        .slice(0, 5)
        .map(
          (city) =>
            `<div class="suggestion-item" onclick="weatherApp.selectSuggestion('${city.split(",")[0]}')">${city}</div>`,
        )
        .join("")
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

  async getWeatherByCity(city) {
    this.showLoading()

    try {
      // First, get coordinates for the city
      const geocodingResponse = await fetch(
        `${this.GEOCODING_API}?name=${encodeURIComponent(city)}&count=1&language=en&format=json`,
      )

      if (!geocodingResponse.ok) {
        throw new Error("Failed to find city location")
      }

      const geocodingData = await geocodingResponse.json()

      if (!geocodingData.results || geocodingData.results.length === 0) {
        throw new Error(`City not found: ${city}`)
      }

      const location = geocodingData.results[0]

      // Get weather data using coordinates
      const weatherResponse = await fetch(
        `${this.WEATHER_API}?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=temperature_2m,relative_humidity_2m,dew_point_2m,apparent_temperature,precipitation_probability,precipitation,rain,showers,snowfall,snow_depth,weather_code,pressure_msl,surface_pressure,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,visibility,evapotranspiration,et0_fao_evapotranspiration,vapour_pressure_deficit,wind_speed_10m,wind_speed_80m,wind_speed_120m,wind_speed_180m,wind_direction_10m,wind_direction_80m,wind_direction_120m,wind_direction_180m,wind_gusts_10m,temperature_80m,temperature_120m,temperature_180m,soil_temperature_0cm,soil_temperature_6cm,soil_temperature_18cm,soil_temperature_54cm,soil_moisture_0_1cm,soil_moisture_1_3cm,soil_moisture_3_9cm,soil_moisture_9_27cm,soil_moisture_27_81cm&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,daylight_duration,sunshine_duration,uv_index_max,uv_index_clear_sky_max,precipitation_sum,rain_sum,showers_sum,snowfall_sum,precipitation_hours,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,shortwave_radiation_sum,et0_fao_evapotranspiration&timezone=auto`,
      )

      if (!weatherResponse.ok) {
        throw new Error("Failed to fetch weather data")
      }

      const weatherData = await weatherResponse.json()

      this.displayWeather(location, weatherData)
    } catch (error) {
      console.error("Weather fetch error:", error)
      this.showError(error.message || "Failed to fetch weather data. Please try again.")
    }
  }

  async getWeatherByCoords(lat, lon) {
    this.showLoading()

    try {
      // Get location name from coordinates
      const geocodingResponse = await fetch(
        `${this.GEOCODING_API}?latitude=${lat}&longitude=${lon}&count=1&language=en&format=json`,
      )

      let locationName = "Your Location"
      if (geocodingResponse.ok) {
        const geocodingData = await geocodingResponse.json()
        if (geocodingData.results && geocodingData.results.length > 0) {
          locationName = geocodingData.results[0].name
        }
      }

      // Get weather data
      const weatherResponse = await fetch(
        `${this.WEATHER_API}?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=temperature_2m,relative_humidity_2m,dew_point_2m,apparent_temperature,precipitation_probability,precipitation,rain,showers,snowfall,snow_depth,weather_code,pressure_msl,surface_pressure,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,visibility,evapotranspiration,et0_fao_evapotranspiration,vapour_pressure_deficit,wind_speed_10m,wind_speed_80m,wind_speed_120m,wind_speed_180m,wind_direction_10m,wind_direction_80m,wind_direction_120m,wind_direction_180m,wind_gusts_10m,temperature_80m,temperature_120m,temperature_180m,soil_temperature_0cm,soil_temperature_6cm,soil_temperature_18cm,soil_temperature_54cm,soil_moisture_0_1cm,soil_moisture_1_3cm,soil_moisture_3_9cm,soil_moisture_9_27cm,soil_moisture_27_81cm&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,daylight_duration,sunshine_duration,uv_index_max,uv_index_clear_sky_max,precipitation_sum,rain_sum,showers_sum,snowfall_sum,precipitation_hours,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,shortwave_radiation_sum,et0_fao_evapotranspiration&timezone=auto`,
      )

      const weatherData = await weatherResponse.json()

      const location = {
        name: locationName,
        country: "",
        latitude: lat,
        longitude: lon,
      }

      this.displayWeather(location, weatherData)
    } catch (error) {
      console.error("Weather fetch error:", error)
      this.showError("Failed to fetch weather data for your location.")
    }
  }

  displayWeather(location, weatherData) {
    const current = weatherData.current
    const daily = weatherData.daily

    // Display current weather
    this.cityName.textContent = location.name
    this.country.textContent = location.country || ""
    this.currentDate.textContent = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    // Get weather icon and description based on weather code
    const weatherInfo = this.getWeatherInfo(current.weather_code, current.is_day)
    this.weatherIcon.src = weatherInfo.icon
    this.weatherIcon.alt = weatherInfo.description
    this.weatherDescription.textContent = weatherInfo.description

    this.currentTemp.textContent = `${Math.round(current.temperature_2m)}°C`
    this.feelsLike.textContent = `${Math.round(current.apparent_temperature)}°C`
    this.minTemp.textContent = `${Math.round(daily.temperature_2m_min[0])}°C`
    this.maxTemp.textContent = `${Math.round(daily.temperature_2m_max[0])}°C`

    // Convert visibility from meters to kilometers (if available)
    const visibility = weatherData.hourly.visibility ? weatherData.hourly.visibility[0] / 1000 : 10
    this.visibility.textContent = `${visibility.toFixed(1)} km`
    this.humidity.textContent = `${current.relative_humidity_2m}%`
    this.windSpeed.textContent = `${current.wind_speed_10m} km/h`
    this.pressure.textContent = `${Math.round(current.pressure_msl)} hPa`
    this.uvIndex.textContent = daily.uv_index_max[0] ? daily.uv_index_max[0].toFixed(1) : "N/A"
    this.cloudiness.textContent = `${current.cloud_cover}%`

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
      97: { description: "Thunderstorm with heavy hail", day: "⛈️", night: "⛈️" },
    }

    const weather = weatherCodes[weatherCode] || weatherCodes[0]
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
      const date = new Date(daily.time[i])
      const dayName = date.toLocaleDateString("en-US", { weekday: "short" })
      const monthDay = date.toLocaleDateString("en-US", { month: "short", day: "numeric" })

      const weatherInfo = this.getWeatherInfo(daily.weather_code[i], true)

      forecastItems.push(`
      <div class="forecast-item">
        <div class="forecast-date">${dayName}<br><small>${monthDay}</small></div>
        <div class="forecast-icon">
          <img src="${weatherInfo.icon}" alt="${weatherInfo.description}" style="width: 50px; height: 50px;">
        </div>
        <div class="forecast-desc">${weatherInfo.description}</div>
        <div class="forecast-temps">
          <span class="forecast-high">${Math.round(daily.temperature_2m_max[i])}°</span>
          <span class="forecast-low">${Math.round(daily.temperature_2m_min[i])}°</span>
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
    fab.addEventListener("click", () => {
      this.showToast("Refreshing weather data...", "info")
      if (this.cityInput.value.trim()) {
        this.getWeatherByCity(this.cityInput.value.trim())
      } else {
        this.loadDefaultCity()
      }
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
        this.createParticle(particleType)
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
    toast.innerHTML = `
    <i class="fas ${type === "success" ? "fa-check-circle" : type === "error" ? "fa-exclamation-circle" : "fa-info-circle"}"></i>
    <span style="margin-left: 10px;">${message}</span>
  `

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
    // Create modal
    const modal = document.createElement("div")
    modal.className = "modal"
    modal.innerHTML = `
    <div class="modal-content">
      <span class="close">&times;</span>
      <h2 style="color: #0984e3; margin-bottom: 20px;">
        <i class="fas fa-info-circle"></i> ${title}
      </h2>
      <div style="line-height: 1.6;">
        ${content}
      </div>
    </div>
  `

    document.body.appendChild(modal)
    modal.style.display = "block"

    // Close modal events
    const closeBtn = modal.querySelector(".close")
    closeBtn.addEventListener("click", () => {
      modal.style.display = "none"
      setTimeout(() => {
        if (modal.parentNode) {
          modal.parentNode.removeChild(modal)
        }
      }, 300)
    })

    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeBtn.click()
      }
    })
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
document.addEventListener("DOMContentLoaded", () => {
  weatherApp = new WeatherApp()
})

// Utility functions
function formatTime(timestamp) {
  return new Date(timestamp * 1000).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getWindDirection(degrees) {
  const directions = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ]
  return directions[Math.round(degrees / 22.5) % 16]
}

function getUVIndexLevel(uv) {
  if (uv <= 2) return "Low"
  if (uv <= 5) return "Moderate"
  if (uv <= 7) return "High"
  if (uv <= 10) return "Very High"
  return "Extreme"
}
