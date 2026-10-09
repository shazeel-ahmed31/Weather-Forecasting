class WeatherService {
  constructor(fetcher = (...args) => fetch(...args)) { this.fetcher = fetcher; }
  async json(url, signal) {
    const response = await this.fetcher(url, {signal});
    if (!response.ok) throw new Error(`Weather service unavailable (HTTP ${response.status}). Try again.`);
    const data = await response.json();
    if (data.error) throw new Error('Weather service returned an error. Try again.');
    return data;
  }
  async city(name, signal) {
    name = name.trim();
    if (name.length < 2 || name.length > 100) throw new Error('Enter a city name between 2 and 100 characters.');
    const data = await this.json(`https://geocoding-api.open-meteo.com/v1/search?${new URLSearchParams({name,count:'1',language:'en',format:'json'})}`, signal);
    if (!Array.isArray(data.results) || !data.results.length) throw new Error(`City not found: ${name}`);
    const location = data.results[0];
    return {location, weather: await this.coords(location.latitude, location.longitude, signal)};
  }
  async coords(lat, lon, signal) {
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat)>90 || Math.abs(lon)>180) throw new Error('Invalid location coordinates.');
    const params = new URLSearchParams({latitude:String(lat),longitude:String(lon),
      current:'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,cloud_cover,pressure_msl,wind_speed_10m',
      hourly:'visibility',daily:'weather_code,temperature_2m_max,temperature_2m_min,uv_index_max',
      timezone:'auto',temperature_unit:'celsius',wind_speed_unit:'kmh',forecast_days:'6'});
    const data = await this.json(`https://api.open-meteo.com/v1/forecast?${params}`, signal);
    const daily = data.daily;
    if (!data.current || typeof data.current.time !== 'string' || !Array.isArray(daily?.time) || daily.time.length < 6 ||
        !['weather_code','temperature_2m_max','temperature_2m_min','uv_index_max'].every(key=>Array.isArray(daily[key]) && daily[key].length===daily.time.length)) {
      throw new Error('Incomplete weather response. Please try again.');
    }
    return data;
  }
}
function weatherValue(value, unit='', digits=0) {
  return Number.isFinite(value) ? `${value.toFixed(digits)}${unit}` : 'N/A';
}
function visibilityAtCurrentHour(data) {
  const hour=data.current.time.slice(0,13);
  const index=data.hourly?.time?.findIndex(time=>time.slice(0,13)===hour) ?? -1;
  return index>=0 && Number.isFinite(data.hourly.visibility?.[index]) ? data.hourly.visibility[index]/1000 : null;
}
function forecastDate(date, options) {
  // An API date is a calendar date at the searched location, not a UTC instant.
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', {...options,timeZone:'UTC'});
}
if (typeof module !== 'undefined') module.exports = {WeatherService,weatherValue,visibilityAtCurrentHour,forecastDate};
