const fs = require('fs');
const path = require('path');
const https = require('https');

const { STANDARD_ITEMS } = require('./data/chart_standard_items.seed');

const worldItems = STANDARD_ITEMS.filter((item) => item.leaderboard_code === 'world_travel');
const chinaItems = STANDARD_ITEMS.filter((item) => item.leaderboard_code === 'china_travel');

const PROVINCE_COORDINATES = {
  province_bj: [39.9042, 116.4074],
  province_tj: [39.0842, 117.2],
  province_he: [38.0428, 114.5149],
  province_sx: [37.8706, 112.5489],
  province_nm: [40.8175, 111.7652],
  province_ln: [41.8057, 123.4315],
  province_jl: [43.8171, 125.3235],
  province_hl: [45.756, 126.6424],
  province_sh: [31.2304, 121.4737],
  province_js: [32.0603, 118.7969],
  province_zj: [30.2741, 120.1551],
  province_ah: [31.8206, 117.2272],
  province_fj: [26.0745, 119.2965],
  province_jx: [28.682, 115.8579],
  province_sd: [36.6512, 117.1201],
  province_ha: [34.7466, 113.6254],
  province_hb: [30.5928, 114.3055],
  province_hn: [28.2282, 112.9388],
  province_gd: [23.1291, 113.2644],
  province_gx: [22.817, 108.3669],
  province_hi: [20.044, 110.1983],
  province_cq: [29.563, 106.5516],
  province_sc: [30.5728, 104.0668],
  province_gz: [26.647, 106.6302],
  province_yn: [25.0458, 102.71],
  province_xz: [29.6525, 91.1721],
  province_sn: [34.2655, 108.9542],
  province_gs: [36.0611, 103.8343],
  province_qh: [36.6171, 101.7782],
  province_nx: [38.4872, 106.2309],
  province_xj: [43.8256, 87.6168],
  province_hk: [22.3193, 114.1694],
  province_mo: [22.1987, 113.5439],
  province_tw: [25.033, 121.5654],
};

const MANUAL_WORLD_COORDINATES = {
  turkey: [39.0, 35.0],
  'south korea': [36.5, 127.8],
  'north korea': [40.0, 127.0],
  'czech republic': [49.8, 15.5],
  'vatican city': [41.9029, 12.4534],
  palestine: [31.9, 35.2],
  laos: [18.2, 103.8],
  moldova: [47.0, 28.8],
  russia: [61.5, 105.3],
  syria: [35.0, 38.5],
  venezuela: [7.0, -66.0],
  bolivia: [-16.3, -63.6],
  tanzania: [-6.3, 34.9],
  'cabo verde': [16.0, -24.0],
  'democratic republic of the congo': [-2.8, 23.6],
  'republic of the congo': [-0.7, 15.2],
  'cote divoire': [7.54, -5.55],
  eswatini: [-26.5, 31.5],
  'timor leste': [-8.8, 126.0],
  'united states': [39.8, -98.6],
  'united kingdom': [55.0, -3.4],
  micronesia: [6.9, 158.2],
  'sao tome and principe': [0.2, 6.7],
  'guinea bissau': [12.0, -15.2],
  'bosnia and herzegovina': [44.2, 17.7],
  'north macedonia': [41.6, 21.7],
  'trinidad and tobago': [10.4, -61.2],
  'antigua and barbuda': [17.1, -61.8],
  'saint kitts and nevis': [17.3, -62.7],
  'saint vincent and the grenadines': [13.25, -61.2],
  'papua new guinea': [-6.3, 145.4],
  'marshall islands': [7.1, 171.2],
  'solomon islands': [-9.6, 160.2],
  'united arab emirates': [24.3, 54.3],
};

const normalize = (value = '') =>
  String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const fetchJson = (url) =>
  new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        let raw = '';
        response.on('data', (chunk) => {
          raw += chunk;
        });
        response.on('end', () => {
          try {
            resolve(JSON.parse(raw));
          } catch (error) {
            reject(error);
          }
        });
      })
      .on('error', reject);
  });

const buildCountryCoordinateDict = async () => {
  const countries = await fetchJson('https://raw.githubusercontent.com/mledoze/countries/master/countries.json');
  const dict = new Map();

  countries.forEach((country) => {
    const names = new Set();
    const addName = (value) => {
      if (value) {
        names.add(normalize(value));
      }
    };

    addName(country.name?.common);
    addName(country.name?.official);
    (country.altSpellings || []).forEach(addName);
    Object.values(country.translations || {}).forEach((translation) => {
      addName(translation.common);
      addName(translation.official);
    });

    if (Array.isArray(country.latlng) && country.latlng.length >= 2) {
      names.forEach((name) => {
        if (!dict.has(name)) {
          dict.set(name, country.latlng);
        }
      });
    }
  });

  return dict;
};

const toCoordinate = (latlng) => ({
  latitude: Number(latlng[0]),
  longitude: Number(latlng[1]),
});

const writeOutput = (worldCoordinates, chinaCoordinates) => {
  const outputPath = path.join(process.cwd(), 'src', 'data', 'footprintCoordinates.ts');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const content = [
    'export type FootprintCoordinate = {',
    '  latitude: number;',
    '  longitude: number;',
    '};',
    '',
    `export const WORLD_FOOTPRINT_COORDINATES: Record<string, FootprintCoordinate> = ${JSON.stringify(worldCoordinates, null, 2)};`,
    '',
    `export const CHINA_FOOTPRINT_COORDINATES: Record<string, FootprintCoordinate> = ${JSON.stringify(chinaCoordinates, null, 2)};`,
    '',
  ].join('\n');

  fs.writeFileSync(outputPath, content, 'utf8');
  console.log(`Generated ${path.relative(process.cwd(), outputPath)}`);
};

const main = async () => {
  const worldCoordinateDict = await buildCountryCoordinateDict();
  const worldCoordinates = {};
  const chinaCoordinates = {};
  const missing = [];

  worldItems.forEach((item) => {
    const keys = [normalize(item.name_en), normalize(item.name_zh)];
    const matchedKey = keys.find((key) => worldCoordinateDict.has(key) || MANUAL_WORLD_COORDINATES[key]);
    const latlng = matchedKey ? worldCoordinateDict.get(matchedKey) || MANUAL_WORLD_COORDINATES[matchedKey] : null;

    if (!latlng) {
      missing.push(item.name_en);
      return;
    }

    worldCoordinates[item._id] = toCoordinate(latlng);
  });

  chinaItems.forEach((item) => {
    const latlng = PROVINCE_COORDINATES[item._id];
    if (!latlng) {
      missing.push(item._id);
      return;
    }

    chinaCoordinates[item._id] = toCoordinate(latlng);
  });

  if (missing.length) {
    throw new Error(`Missing coordinates for: ${missing.join(', ')}`);
  }

  writeOutput(worldCoordinates, chinaCoordinates);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
