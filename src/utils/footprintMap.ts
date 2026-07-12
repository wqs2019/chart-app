import { UserCheckin } from '../types/rank';
import { FootprintCoordinate } from '../data/footprintCoordinates';

export type MapViewCode = 'world_travel' | 'china_travel';
export type BaseMapStyle = 'vector' | 'satellite';

export type FootprintMapMarker = {
  id: string;
  name: string;
  regionLabel: string;
  latitude: number;
  longitude: number;
  recordCount: number;
};

export type FootprintMapArea = {
  id: string;
  name: string;
  regionLabel: string;
  matchNames?: string[];
  provinceCode?: string;
};

export const INITIAL_MAP_VIEW: Record<MapViewCode, { center: FootprintCoordinate; zoom: number }> = {
  world_travel: {
    center: { latitude: 24, longitude: 18 },
    zoom: 2,
  },
  china_travel: {
    center: { latitude: 35.5, longitude: 104.5 },
    zoom: 4,
  },
};

export const formatPercent = (visitedCount: number, totalCount: number) => {
  if (!totalCount) {
    return '0%';
  }

  return `${Math.round((visitedCount / totalCount) * 100)}%`;
};

export const formatDate = (value?: Date | string) => {
  if (!value) {
    return '暂无记录';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '暂无记录';
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export const getRecordCount = (checkins: UserCheckin[]) =>
  checkins.reduce((sum, checkin) => {
    const contentCount = checkin.contents?.length || 0;
    return sum + Math.max(contentCount, checkin.content ? 1 : 1);
  }, 0);

export const getLatestCheckinAt = (checkins: UserCheckin[]) =>
  checkins.reduce<Date | string | undefined>((latest, checkin) => {
    const currentValue = checkin.checked_in_at || checkin.updated_at || checkin.created_at;
    if (!currentValue) {
      return latest;
    }

    if (!latest) {
      return currentValue;
    }

    return new Date(currentValue).getTime() > new Date(latest).getTime() ? currentValue : latest;
  }, undefined);

const isInChina = (latitude: number, longitude: number) =>
  longitude > 73.66 && longitude < 135.05 && latitude > 3.86 && latitude < 53.55;

const transformLatitude = (longitude: number, latitude: number) => {
  let result =
    -100 +
    2 * longitude +
    3 * latitude +
    0.2 * latitude * latitude +
    0.1 * longitude * latitude +
    0.2 * Math.sqrt(Math.abs(longitude));
  result += ((20 * Math.sin(6 * longitude * Math.PI) + 20 * Math.sin(2 * longitude * Math.PI)) * 2) / 3;
  result += ((20 * Math.sin(latitude * Math.PI) + 40 * Math.sin((latitude / 3) * Math.PI)) * 2) / 3;
  result += ((160 * Math.sin((latitude / 12) * Math.PI) + 320 * Math.sin((latitude * Math.PI) / 30)) * 2) / 3;
  return result;
};

const transformLongitude = (longitude: number, latitude: number) => {
  let result =
    300 +
    longitude +
    2 * latitude +
    0.1 * longitude * longitude +
    0.1 * longitude * latitude +
    0.1 * Math.sqrt(Math.abs(longitude));
  result += ((20 * Math.sin(6 * longitude * Math.PI) + 20 * Math.sin(2 * longitude * Math.PI)) * 2) / 3;
  result += ((20 * Math.sin(longitude * Math.PI) + 40 * Math.sin((longitude / 3) * Math.PI)) * 2) / 3;
  result += ((150 * Math.sin((longitude / 12) * Math.PI) + 300 * Math.sin((longitude / 30) * Math.PI)) * 2) / 3;
  return result;
};

export const wgs84ToGcj02 = (coordinate: FootprintCoordinate): FootprintCoordinate => {
  const { latitude, longitude } = coordinate;
  if (!isInChina(latitude, longitude)) {
    return coordinate;
  }

  const a = 6378245.0;
  const ee = 0.00669342162296594323;
  let dLat = transformLatitude(longitude - 105.0, latitude - 35.0);
  let dLon = transformLongitude(longitude - 105.0, latitude - 35.0);
  const radLat = (latitude / 180.0) * Math.PI;
  let magic = Math.sin(radLat);
  magic = 1 - ee * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180.0) / (((a * (1 - ee)) / (magic * sqrtMagic)) * Math.PI);
  dLon = (dLon * 180.0) / ((a / sqrtMagic) * Math.cos(radLat) * Math.PI);

  return {
    latitude: latitude + dLat,
    longitude: longitude + dLon,
  };
};

export const buildFootprintMapHtml = ({
  markers,
  areas,
  activeView,
  mapStyle,
  selectedItemId,
  isDark,
  colors,
}: {
  markers: FootprintMapMarker[];
  areas: FootprintMapArea[];
  activeView: MapViewCode;
  mapStyle: BaseMapStyle;
  selectedItemId?: string;
  isDark: boolean;
  colors: {
    background: string;
    text: string;
    textSecondary: string;
    primary: string;
  };
}) => {
  const initialView = INITIAL_MAP_VIEW[activeView];
  const selected = markers.find((marker) => marker.id === selectedItemId);
  const safeMarkers = markers.map((marker) => ({
    ...marker,
    selected: marker.id === selectedItemId,
  }));

  const payload = {
    initialCenter: selected
      ? { latitude: selected.latitude, longitude: selected.longitude }
      : initialView.center,
    initialZoom: selected ? (activeView === 'world_travel' ? 4 : 6) : initialView.zoom,
    activeView,
    markers: safeMarkers,
    areas,
    colors: {
      background: colors.background,
      text: colors.text,
      textSecondary: colors.textSecondary,
      primary: colors.primary,
      selectedAccent: isDark ? '#7CE7FF' : '#0EA5E9',
      halo: isDark ? 'rgba(255,155,122,0.22)' : 'rgba(255,122,89,0.18)',
      selectedRing: '#FFFFFF',
      controlBackground: isDark ? '#18212B' : '#FFFFFF',
      mapFrame: isDark ? '#243140' : '#E7D7CC',
      emptyBackground: isDark ? 'rgba(24,33,43,0.9)' : 'rgba(255,255,255,0.94)',
    },
    mapStyle,
    tileUrls: {
      worldVector: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png',
      worldSatellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      chinaVector: 'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}',
      chinaSatellite: 'https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}',
      chinaSatelliteLabel:
        'https://webst0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
    },
  };

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
    />
    <link
      rel="stylesheet"
      href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
      crossorigin=""
    />
    <style>
      html, body, #map {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        background: ${colors.background};
        overflow: hidden;
      }
      .leaflet-container {
        background: #e5e7eb; /* 地图背景色，防止瓦片加载时不会出现突兀的空白 */
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }
      .map-control {
        position: absolute;
        right: 12px;
        bottom: 12px;
        z-index: 999;
        background: ${payload.colors.controlBackground};
        color: ${colors.text};
        border-radius: 14px;
        padding: 10px 12px;
        font-size: 12px;
        font-weight: 700;
        box-shadow: 0 6px 18px rgba(0, 0, 0, 0.14);
        border: 1px solid ${payload.colors.mapFrame};
      }
      .map-empty {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        z-index: 999;
        min-width: 180px;
        max-width: 240px;
        text-align: center;
        background: ${payload.colors.emptyBackground};
        color: ${colors.text};
        border-radius: 18px;
        padding: 16px 18px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
        border: 1px solid ${payload.colors.mapFrame};
      }
      .map-empty-title {
        font-size: 15px;
        font-weight: 800;
      }
      .map-empty-desc {
        margin-top: 6px;
        font-size: 12px;
        line-height: 18px;
        color: ${colors.textSecondary};
      }
      .map-loading {
        position: absolute;
        left: 12px;
        top: 12px;
        z-index: 999;
        background: ${payload.colors.controlBackground};
        color: ${colors.text};
        border-radius: 12px;
        padding: 8px 10px;
        font-size: 12px;
        font-weight: 700;
        box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
        border: 1px solid ${payload.colors.mapFrame};
      }
      .leaflet-tooltip.footprint-tooltip {
        background: ${payload.colors.controlBackground};
        color: ${colors.text};
        border: 0;
        border-radius: 10px;
        box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18);
        padding: 8px 10px;
      }
      .leaflet-tooltip-top.footprint-tooltip:before {
        border-top-color: ${payload.colors.controlBackground};
      }
      .region-label {
        color: ${colors.text};
        font-size: 11px;
        font-weight: 700;
        line-height: 1;
        white-space: nowrap;
        text-shadow:
          0 1px 2px rgba(255, 255, 255, 0.92),
          0 0 8px rgba(255, 255, 255, 0.88);
      }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <div id="boundary-loading" class="map-loading">正在加载行政区面...</div>
    <button class="map-control" onclick="fitMarkers()">重置视角</button>
    ${
      markers.length
        ? ''
        : '<div class="map-empty"><div class="map-empty-title">还没有足迹点亮</div><div class="map-empty-desc">先去录入一个国家或省份，这里就会像地图应用一样出现真实地图足迹。</div></div>'
    }
    <script
      src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
      integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
      crossorigin=""
    ></script>
    <script>
      const payload = ${JSON.stringify(payload)};
      const map = L.map('map', {
        zoomControl: false,
        attributionControl: false,
        worldCopyJump: payload.markers.length > 0,
        minZoom: 2,
        maxZoom: 20,
      }).setView([payload.initialCenter.latitude, payload.initialCenter.longitude], payload.initialZoom);

      if (payload.activeView === 'china_travel') {
        if (payload.mapStyle === 'vector') {
          L.tileLayer(payload.tileUrls.chinaVector, {
            subdomains: ['1', '2', '3', '4'],
            minZoom: 3,
            maxNativeZoom: 18,
            maxZoom: 20,
            keepBuffer: 4,
          }).addTo(map);
        } else {
          L.tileLayer(payload.tileUrls.chinaSatellite, {
            subdomains: ['1', '2', '3', '4'],
            minZoom: 3,
            maxNativeZoom: 18,
            maxZoom: 20,
            keepBuffer: 4,
          }).addTo(map);
          L.tileLayer(payload.tileUrls.chinaSatelliteLabel, {
            subdomains: ['1', '2', '3', '4'],
            minZoom: 3,
            maxNativeZoom: 18,
            maxZoom: 20,
            keepBuffer: 4,
            opacity: 0.96,
          }).addTo(map);
        }
      } else {
        if (payload.mapStyle === 'vector') {
          L.tileLayer(payload.tileUrls.worldVector, {
            subdomains: ['a', 'b', 'c', 'd'],
            minZoom: 2,
            maxNativeZoom: 19,
            maxZoom: 20,
            keepBuffer: 4,
          }).addTo(map);
        } else {
          L.tileLayer(payload.tileUrls.worldSatellite, {
            minZoom: 2,
            maxNativeZoom: 18,
            maxZoom: 20,
            keepBuffer: 4,
          }).addTo(map);
        }
      }

      const aggregateBounds = L.latLngBounds([]);
      let baseBoundaryLayer = null;
      let boundaryLayer = null;
      let regionLabelLayer = null;
      let latestBoundaryFeatures = [];
      const regionNameTranslator =
        payload.activeView === 'world_travel' &&
        typeof Intl !== 'undefined' &&
        typeof Intl.DisplayNames === 'function'
          ? new Intl.DisplayNames(['zh-Hans'], { type: 'region' })
          : null;
      const normalize = (value) =>
        String(value || '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\\u0300-\\u036f]/g, '')
          .replace(/&/g, 'and')
          .replace(/[^a-z0-9]+/g, ' ')
          .trim();

      const showBoundaryLoading = (visible) => {
        const loadingNode = document.getElementById('boundary-loading');
        if (loadingNode) {
          loadingNode.style.display = visible ? 'block' : 'none';
        }
      };

      const getCountryIso2 = (properties) =>
        (
          properties?.['ISO3166-1-Alpha-2'] ||
          properties?.iso_a2 ||
          properties?.ISO_A2 ||
          properties?.cca2 ||
          properties?.alpha2
        )
          ?.toString()
          .trim()
          .toUpperCase();

      const getWorldZhLabel = (feature) => {
        const properties = feature?.properties || {};
        if (properties.__areaName) {
          return properties.__areaName;
        }
        const iso2 = getCountryIso2(properties);
        if (iso2 && regionNameTranslator) {
          try {
            return regionNameTranslator.of(iso2) || properties.name || '';
          } catch (error) {
            return properties.name || '';
          }
        }
        return properties.name || '';
      };

      const renderRegionLabels = () => {
        if (payload.activeView !== 'world_travel' || !regionLabelLayer) {
          return;
        }
        regionLabelLayer.clearLayers();
        if (map.getZoom() < 3 || !latestBoundaryFeatures.length) {
          return;
        }

        latestBoundaryFeatures.forEach((feature) => {
          const labelText = feature.properties?.__labelText;
          if (!labelText) {
            return;
          }
          try {
            const featureLayer = L.geoJSON(feature);
            const bounds = featureLayer.getBounds();
            if (!bounds.isValid()) {
              return;
            }
            regionLabelLayer.addLayer(
              L.marker(bounds.getCenter(), {
                interactive: false,
                icon: L.divIcon({
                  className: 'region-label-wrapper',
                  html: '<div class="region-label">' + labelText + '</div>',
                }),
              })
            );
          } catch (error) {
            // Ignore malformed geometry labels and continue rendering others.
          }
        });
      };

      const baseBoundaryStyle = {
        color: payload.colors.mapFrame,
        weight: payload.activeView === 'world_travel' ? 0.8 : 1,
        fillColor: payload.colors.mapFrame,
        fillOpacity: payload.activeView === 'world_travel' ? 0.02 : 0.03,
      };

      const highlightStyle = (feature) => {
        const areaId = feature.properties.__areaId;
        const isSelected = areaId === ${JSON.stringify(selectedItemId || '')};
        return {
          color: isSelected ? payload.colors.selectedAccent : payload.colors.primary,
          weight: 1.2,
          fillColor: isSelected ? payload.colors.selectedAccent : payload.colors.primary,
          fillOpacity: isSelected ? 0.3 : 0.12,
        };
      };

      const onEachBoundaryFeature = (feature, layer) => {
        const areaName = feature.properties.__areaName || feature.properties.name || '足迹区域';
        const areaRegion = feature.properties.__regionLabel || '';
        const recordCount = feature.properties.__recordCount || 0;
        layer.bindTooltip(
          '<strong>' + areaName + '</strong><br/>' + areaRegion + ' · ' + recordCount + ' 条记录',
          {
            direction: 'top',
            className: 'footprint-tooltip',
          }
        );
        layer.on('click', () => {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'markerPress', id: feature.properties.__areaId }));
        });
      };

      const fetchJson = async (url) => {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to fetch geojson: ' + response.status);
        }
        return response.json();
      };

      const createVisitedAreaMap = () => {
        const areaByName = new Map();
        const areaByCode = new Map();
        payload.areas.forEach((area) => {
          if (area.provinceCode) {
            areaByCode.set(String(area.provinceCode), area);
          }
          (area.matchNames || [area.name]).forEach((name) => {
            areaByName.set(normalize(name), area);
          });
        });
        return { areaByName, areaByCode };
      };

      const addBoundaryLayer = (geojson) => {
        if (!geojson.features || !geojson.features.length) {
          return;
        }
        latestBoundaryFeatures = geojson.features;
        if (baseBoundaryLayer) {
          map.removeLayer(baseBoundaryLayer);
        }
        if (boundaryLayer) {
          map.removeLayer(boundaryLayer);
        }
        baseBoundaryLayer = L.geoJSON(geojson, {
          style: baseBoundaryStyle,
          interactive: false,
        }).addTo(map);
        boundaryLayer = L.geoJSON(geojson, {
          style: highlightStyle,
          onEachFeature: onEachBoundaryFeature,
          filter: (feature) => Boolean(feature.properties && feature.properties.__areaId),
        }).addTo(map);
        const boundaryBounds = boundaryLayer.getBounds();
        if (boundaryBounds.isValid()) {
          aggregateBounds.extend(boundaryBounds);
        }
        renderRegionLabels();
      };

      const loadBoundaryAreas = async () => {
        if (!payload.areas.length) {
          showBoundaryLoading(false);
          return;
        }

        try {
          const { areaByName, areaByCode } = createVisitedAreaMap();

          if (payload.activeView === 'china_travel') {
            const geojson = await fetchJson('https://geojson.cn/api/tiandi/100000.json');
            const features = geojson.features.map((feature) => {
              const area = areaByCode.get(String(feature.properties?.code || ''));
              return {
                ...feature,
                properties: {
                  ...feature.properties,
                  __areaId: area?.id,
                  __areaName: area?.name,
                  __regionLabel: area?.regionLabel,
                  __recordCount: area ? payload.markers.find((marker) => marker.id === area.id)?.recordCount || 0 : 0,
                },
              };
            });
            addBoundaryLayer({ type: 'FeatureCollection', features });
          } else {
            const geojson = await fetchJson('https://raw.githubusercontent.com/datasets/geo-countries/main/data/countries.geojson');
            if (!regionLabelLayer) {
              regionLabelLayer = L.layerGroup().addTo(map);
            }
            const features = geojson.features.map((feature) => {
              const area = areaByName.get(normalize(feature.properties?.name || ''));
              return {
                ...feature,
                properties: {
                  ...feature.properties,
                  __areaId: area?.id,
                  __areaName: area?.name,
                  __regionLabel: area?.regionLabel,
                  __recordCount: area ? payload.markers.find((marker) => marker.id === area.id)?.recordCount || 0 : 0,
                  __labelText: getWorldZhLabel(feature),
                },
              };
            });
            addBoundaryLayer({ type: 'FeatureCollection', features });
          }
        } catch (error) {
          console.warn('[FootprintMap] load boundary failed', error);
        } finally {
          showBoundaryLoading(false);
        }
      };

      window.fitMarkers = () => {
        if (aggregateBounds.isValid()) {
          map.fitBounds(aggregateBounds, { padding: [34, 34] });
          return;
        }
        map.setView([payload.initialCenter.latitude, payload.initialCenter.longitude], payload.initialZoom);
      };

      if (aggregateBounds.isValid()) {
        map.fitBounds(aggregateBounds, { padding: [34, 34] });
      }

      loadBoundaryAreas().then(() => {
        if (aggregateBounds.isValid()) {
          map.fitBounds(aggregateBounds, { padding: [34, 34] });
        }
      });

      map.on('zoomend', renderRegionLabels);
    </script>
  </body>
</html>`;
};
