import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import TileLayer from 'ol/layer/Tile.js';
import {defaults as defaultInteractions} from 'ol/interaction.js';
import DragPan from 'ol/interaction/DragPan';
import {shiftKeyOnly} from 'ol/events/condition';
import Stamen from 'ol/source/Stamen.js';

import geoData from './data/toronto.json';
import config from './data/torontoConfig.json';
import {extentFromOlLayers, createStamp, addOlLayers, removeOlLayers} from './helpers/olHelpers.js';
import LayerManager from './models/LayerManager';

const layerManager = new LayerManager(config, geoData, 'highway');
let brushSize = 100;
let panning = false;
const mousePos = {
    'center': null,
    'radius': 100
};

/* setup olLayers */

const stamenBgLayer = new TileLayer({
    source: new Stamen({
        layer: 'toner-background'
    })
});

const stamenLabelLayer = new TileLayer({
    source: new Stamen({
        layer: 'terrain-labels'
    })
});

const uiSource = new VectorSource();
const uiLayer = new VectorLayer({
    'source': uiSource
});

const bgSource = new VectorSource();
const bgLayer = new VectorLayer({
    'source': bgSource
});

// add olLayers in correct order

const olLayers = layerManager.getOlLayers();
olLayers.push(stamenLabelLayer);
olLayers.push(uiLayer);
olLayers.unshift(bgLayer);
olLayers.unshift(stamenBgLayer);

// make map

const map = new Map({
    target: 'map',
    layers: olLayers,
    view: new View({
        zoom: 12,
        projection: 'EPSG:3857'
    }),
    interactions: defaultInteractions({
        dragPan: false,
        shiftDragZoom: false,
        keyboardPan: false,
        keyboardZoom: false
    })
});

// configure map

const levelLayers = layerManager.getOlLayers();
map.getView().fit(extentFromOlLayers(levelLayers));


// configure interactions

map.addInteraction(new DragPan({
    condition: function(event) {
        return shiftKeyOnly(event);
    }
}));

// const selectInteraction = new Select();
// map.addInteraction(selectInteraction);

// add pre/postcompose methods to layers (these reference map so they must be done here)

const precompose = (olEvent) => {
    const layerName = olEvent.target.getProperties().name;
    const layer = layerManager.getLayerByName(layerName);
    const layerStamps = layer.stamps;
    const layerLevel = layer.level;

    if ((layerManager.currentLevel < layerLevel) && (layerStamps.length > 0)) {
        const ctx = olEvent.context;

        ctx.save();
        ctx.beginPath();

        layerStamps.forEach(stamp => {
            const pixelCenter = map.getPixelFromCoordinate(stamp.center);
            const pixelPerimeter = map.getPixelFromCoordinate(stamp.perimeter);
            const radius = Math.abs(pixelPerimeter[0] - pixelCenter[0]);
            ctx.moveTo(pixelCenter[0], pixelCenter[1]);
            ctx.arc(pixelCenter[0], pixelCenter[1], radius, 0, 2 * Math.PI);
        });

        ctx.clip();
        //ctx.restore();
    }
};

const postcompose = function(event) {
    const ctx = event.context;
    ctx.restore();
};

layerManager.setHandlers('precompose', precompose);
layerManager.setHandlers('postcompose', postcompose);

uiLayer.on('postcompose', function(event) {
    if (mousePos.center) {
        const ctx = event.context;
        ctx.save();
        ctx.beginPath();
        ctx.lineWidth = 8;
        ctx.strokeStyle = 'rgba(255,175,30,1)';
        ctx.arc(mousePos.center[0], mousePos.center[1], brushSize, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.restore();
    }
});

bgLayer.on('postcompose', function(event) {
    if (mousePos.center) {
        const ctx = event.context;
        const w = ctx.canvas.width;
        const h = ctx.canvas.height;
        ctx.save();
        ctx.beginPath();
        ctx.fillStyle = 'rgba(255,175,30,0.1)';
        ctx.arc(mousePos.center[0], mousePos.center[1], brushSize, 0, 2 * Math.PI);
        ctx.rect(w, 0, -w, h);
        ctx.fill();
        ctx.restore();
    }
});

/* map interaction */

// move brush
map.on('pointermove', (olEvent) => {
    mousePos.center = map.getPixelFromCoordinate(olEvent.coordinate);
    map.render();
});

// create stamps
map.on('pointerdrag', (olEvent) => {
    if (!panning) {
        layerManager.addStamp(createStamp(olEvent, brushSize, map));
    }
});

// create stamps
map.on('pointerdown', (olEvent) => {
    if (!panning) {
        layerManager.addStamp(createStamp(olEvent, brushSize, map));
    }
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Shift') {
        panning = true;
    }
});

document.addEventListener('keyup', (event) => {
    switch (event.key) {
    case 'Shift':
        panning = false;
        break;
    case 'ArrowLeft':
        const olLayersToRemove = layerManager.decrementLevel();
        removeOlLayers(olLayersToRemove, map);
        break;
    case 'ArrowRight':
        const olLayersToAdd = layerManager.incrementLevel();
        addOlLayers(olLayersToAdd, map);
        break;
    case 'ArrowUp':
        brushSize = brushSize + 25;
        break;
    case 'ArrowDown':
        if (brushSize > 25) {
            brushSize = brushSize - 25;
        }
        break;
    case 't':
        const currentLayers = map.getLayers();
        if (currentLayers.getArray().includes(stamenBgLayer)) {
            map.removeLayer(stamenBgLayer);
            map.removeLayer(stamenLabelLayer);
        } else {
            currentLayers.insertAt(0, stamenBgLayer);
            currentLayers.push(stamenLabelLayer);
        }
        break;
    default:
        break;
    }
    map.render();
});
