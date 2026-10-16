import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tsImport } from 'tsx/esm/api';
const { createRequestCache, RequestCapacityError } = await tsImport('../server/requestCache.ts',import.meta.url);
const { default: handler } = await tsImport('../api/contractor-weather.ts',import.meta.url);

test('weather cache deduplicates requests and bounds pending upstream work',async()=>{
  let resolve;let calls=0;
  const cache=createRequestCache(async()=>{calls++;return new Promise(r=>{resolve=r;});},{maxPending:1});
  const one=cache.get('same'); const two=cache.get('same');
  await Promise.resolve();
  await assert.rejects(cache.get('different'),RequestCapacityError);
  resolve('weather');
  assert.deepEqual(await Promise.all([one,two]),['weather','weather']);
  assert.equal(calls,1);assert.equal(cache.inFlight,0);
});
test('weather cache expires entries, evicts the least recently used and recovers from errors',async()=>{
  let time=0;let calls=0;
  const cache=createRequestCache(async key=>{calls++;if(key==='bad')throw new Error('offline');return key;},{maxEntries:2,ttlMs:10,now:()=>time});
  await cache.get('a');await cache.get('b');await cache.get('a');await cache.get('c');
  assert.equal(cache.size,2);await cache.get('b');assert.equal(calls,4);
  time=11;await cache.get('c');assert.equal(cache.size,1);
  await assert.rejects(cache.get('bad'),/offline/);assert.equal(cache.inFlight,0);
});
test('Vercel weather function responds as JSON and awaits the shared middleware',async()=>{
  const response=()=>({statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;},end(value){this.body=JSON.parse(value);}});
  const missing=response();await handler({method:'GET',url:'/api/contractor-weather'},missing);
  assert.equal(missing.statusCode,400);assert.match(missing.body.error,/dirección/);
  const unsupported=response();await handler({method:'POST',url:'/api/contractor-weather'},unsupported);
  assert.equal(unsupported.statusCode,405);assert.equal(unsupported.headers.Allow,'GET');
  const malformed=response();await handler({method:'GET',url:'http://['},malformed);
  assert.equal(malformed.statusCode,400);assert.match(malformed.body.error,/URL/);
});

test('Vercel weather function completes all provider requests before returning a successful response',async t=>{
  let calls=0;
  t.mock.method(globalThis,'fetch',async url=>{
    calls++;
    await Promise.resolve();
    if(String(url).includes('geocoding.geo.census.gov'))return Response.json({result:{addressMatches:[{coordinates:{x:-94,y:36},addressComponents:{city:'Test',state:'AR'}}]}});
    if(String(url).includes('/points/'))return Response.json({properties:{forecastHourly:'https://api.weather.gov/gridpoints/TEST/1,1/forecast/hourly'}});
    return Response.json({properties:{periods:[{temperature:72,temperatureUnit:'F',shortForecast:'Sunny',isDaytime:true}]}});
  });
  const res={statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;},end(value){this.body=JSON.parse(value);}};
  await handler({method:'GET',url:'/api/contractor-weather?address=Test%20Address%20for%20unit%20test'},res);
  assert.equal(calls,3);assert.equal(res.statusCode,200);assert.equal(res.body.temperature,72);
  assert.match(res.headers['Cache-Control'],/private/);
});
