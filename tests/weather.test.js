const {test}=require('node:test');
const assert=require('node:assert/strict');
const {WeatherService,weatherValue,visibilityAtCurrentHour,forecastDate}=require('../weather-service');
const {WeatherApp}=require('../script');
function fixture() {return {timezone:'Asia/Tokyo',current:{time:'2026-10-09T13:15',temperature_2m:20},hourly:{time:['2026-10-09T00:00','2026-10-09T13:00'],visibility:[1000,8000]},daily:{time:Array.from({length:6},(_,i)=>`2026-10-${String(9+i).padStart(2,'0')}`),weather_code:[0,1,2,3,45,61],temperature_2m_max:[20,21,22,23,24,25],temperature_2m_min:[10,11,12,13,14,15],uv_index_max:[0,1,2,3,4,5]}};}
const response=data=>({ok:true,json:async()=>data});
test('city lookup encodes input and requests explicit units and only used fields',async()=>{
 const urls=[];const mock=async url=>{urls.push(url);return response(urls.length===1?{results:[{name:'Test',latitude:35,longitude:139}]}:fixture());};
 const result=await new WeatherService(mock).city(' A&B ');
 assert.equal(new URL(urls[0]).searchParams.get('name'),'A&B');
 assert.equal(new URL(urls[1]).searchParams.get('wind_speed_unit'),'kmh');
 assert.equal(new URL(urls[1]).searchParams.get('hourly'),'visibility');
 assert.equal(result.location.name,'Test');
});
test('missing city, invalid input, HTTP, API and malformed responses reject',async()=>{
 await assert.rejects(()=>new WeatherService(async()=>response({})).city('Unknown'),/City not found/);
 await assert.rejects(()=>new WeatherService().city(' '),/city name/);
 await assert.rejects(()=>new WeatherService().coords(NaN,0),/coordinates/);
 await assert.rejects(()=>new WeatherService(async()=>({ok:false,status:503})).coords(0,0),/HTTP 503/);
 await assert.rejects(()=>new WeatherService(async()=>response({error:true})).coords(0,0),/returned an error/);
 await assert.rejects(()=>new WeatherService(async()=>response({current:{}})).coords(0,0),/Incomplete/);
 await assert.rejects(()=>new WeatherService(async()=>{throw new TypeError('Network unavailable')}).coords(0,0),/Network unavailable/);
});
test('zero UV stays zero, missing data is N/A, visibility matches current hour',()=>{
 assert.equal(weatherValue(0,'',1),'0.0');assert.equal(weatherValue(null),'N/A');assert.equal(weatherValue(NaN),'N/A');
 assert.equal(visibilityAtCurrentHour(fixture()),8);
 const data=fixture();data.current.time='2026-10-10T13:15';assert.equal(visibilityAtCurrentHour(data),null);
 assert.equal(forecastDate('2026-10-09',{weekday:'short'}),'Fri');
});
test('latest search wins and aborts its predecessor',async()=>{
 const app=Object.create(WeatherApp.prototype);app.requestId=0;app.showLoading=()=>{};const shown=[];app.displayWeather=(l)=>shown.push(l.name);app.showError=()=>assert.fail('stale request error');
 let resolveFirst, firstSignal;
 const first=app.requestWeather(signal=>{firstSignal=signal;return new Promise(resolve=>resolveFirst=resolve);});
 await app.requestWeather(async()=>({location:{name:'new'},weather:fixture()}));
 assert.equal(firstSignal.aborted,true);
 resolveFirst({location:{name:'old'},weather:fixture()});await first;assert.deepEqual(shown,['new']);
});
test('current request failures reach the error state',async()=>{
 const app=Object.create(WeatherApp.prototype);app.requestId=0;app.showLoading=()=>{};let message;app.showError=value=>message=value;
 await app.requestWeather(async()=>{throw new Error('offline')});assert.equal(message,'offline');
});

test('geolocation denial falls back and late callbacks cannot replace a new search',()=>{
 const old=Object.getOwnPropertyDescriptor(globalThis,'navigator'); let denied;
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{geolocation:{getCurrentPosition:(success,failure)=>{denied=failure;}}}});
 try {
  const app=Object.create(WeatherApp.prototype);app.requestId=0;app.showLoading=()=>{};app.locationNotice={};let fallback=0;app.loadDefaultCity=()=>fallback++;
  app.useLocation();denied();assert.equal(fallback,1);assert.match(app.locationNotice.textContent,/permission denied/);
  app.useLocation();app.requestId++;denied();assert.equal(fallback,1);
 } finally { if(old)Object.defineProperty(globalThis,'navigator',old);else delete globalThis.navigator; }
});
