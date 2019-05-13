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
import Select from 'ol/interaction/Select'
import Translate from 'ol/interaction/Translate'
import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import GeoJSON from 'ol/format/GeoJSON.js';

import {extentFromOlLayers, extentFromOlGeoms, createStamp, addOlLayers, removeOlLayers} from './helpers/olHelpers.js';
import LayerManager from './classes/LayerManager';
import {Stroke, Fill, Style, Text} from 'ol/style.js';
import SliderCreator from './classes/SliderCreator';

import {getDistance} from 'ol/sphere.js'
import Circle from 'ol/geom/Circle';
import GeometryCollection from 'ol/geom/GeometryCollection'

const layerManager = new LayerManager('./dataConfig.json');
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

const uiStyleFunc = (feature) => {
    if (feature.getGeometry().getType() === 'Point') {
        return new Style({
            'text': new Text({
                'text': feature.get('name'),
                'scale': 1.75,
                'stroke': new Stroke({
                    'color': 'white',
                    'width': 3
                })
            })
        });
    } else {
        return new Style({
            'stroke': new Stroke({
                'color': 'black',
                'width': 2
            }),
            'fill': new Fill({
                'color': "#93d076"
            })
        });
    }
};

const uiSource = new VectorSource();
const uiLayer = new VectorLayer({
    'source': uiSource,
    'declutter': false,
    'style': uiStyleFunc,
    'zIndex': 100
});

const bgSource = new VectorSource();
const bgLayer = new VectorLayer({
    'source': bgSource
});

// add olLayers in correct order

const olLayers = layerManager.getCurrentOlLayers();
//olLayers.push(stamenLabelLayer);
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


const increment = (olLayerToAdd) => {
    if (olLayerToAdd) {
        map.addLayer(olLayerToAdd);
    }
};

const decrement = (olLayerToRemove) => {
    if (olLayerToRemove) {
        map.removeLayer(olLayerToRemove);
    }
}

const sliderCreator = new SliderCreator();
const sliders = sliderCreator.createCategorySliders(layerManager.categories, increment, decrement);
console.log(sliders);
const controls = document.getElementById("controls");
sliders.forEach(slider => {
    controls.appendChild(slider);
})



// configure map

const levelLayers = layerManager.getCurrentOlLayers();
map.getView().fit(extentFromOlLayers(levelLayers));

// configure interactions

map.addInteraction(new DragPan({
    condition: function(event) {
        return shiftKeyOnly(event);
    }
}));

const selectInteraction = new Select();
//map.addInteraction(selectInteraction);
const translateInteraction = new Translate({"source": uiSource});
map.addInteraction(translateInteraction);

// add pre/postcompose methods to layers (these reference map so they must be done here)

const precompose = (olEvent) => {
    const olLayer = olEvent.target;
    const props = olLayer.getProperties(); 
    const category = props.category;
    const level = props.level;
    const layer = layerManager.getLayer(category, level);
    const stamps = layer.stamps;

    if ((layerManager.getCurrentLevelForCategory(category) < level) && (stamps.length > 0)) {
        const ctx = olEvent.context;

        ctx.save();
        ctx.beginPath();

        stamps.forEach(stamp => {
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

let myCircles = [];

// move brush
map.on('pointermove', (olEvent) => {
    mousePos.center = map.getPixelFromCoordinate(olEvent.coordinate);
    map.render();
});

// create stamps
map.on('pointerdrag', (olEvent) => {
    if (!panning) {

        const mouseCoord = olEvent.coordinate;
        const mousePixel = map.getPixelFromCoordinate(mouseCoord);
        const perimeterPixel = [mousePixel[0] + brushSize, mousePixel[1]];
        const perimeterCoord = map.getCoordinateFromPixel(perimeterPixel);
        const line = new LineString([mouseCoord, perimeterCoord]);
        const radius = line.getLength();

        myCircles.push(new Circle(mouseCoord, radius));
        //layerManager.addStamp(createStamp(olEvent, brushSize, map));
    }
});

// create stamps
map.on('pointerdown', (olEvent) => {
    if (!panning) {


        const mouseCoord = olEvent.coordinate;
        const mousePixel = map.getPixelFromCoordinate(mouseCoord);
        const perimeterPixel = [mousePixel[0] + brushSize, mousePixel[1]];
        const perimeterCoord = map.getCoordinateFromPixel(perimeterPixel);
        const line = new LineString([mouseCoord, perimeterCoord]);
        const radius = line.getLength();

        myCircles.push(new Circle(mouseCoord, radius));

//        layerManager.addStamp(createStamp(olEvent, brushSize, map));
    }
});
const format = new GeoJSON();

map.on('pointerup', (olEvent) => {

    const circleCollection = new GeometryCollection(myCircles);

    const strokeExtent = circleCollection.getExtent();
    const currentSources = layerManager.getCurrentOlLayers().map(layer => layer.getSource());
    const hits = [];
    currentSources.forEach(source => {
        const candidates = [];
        source.forEachFeatureInExtent(strokeExtent, (feature) => {
            candidates.push(feature);
        });

         const circleFeature = new Feature({
             "geometry": circleCollection
         });
         source.addFeature(circleFeature);
        candidates.forEach((candidate) => {
            source.forEachFeatureIntersectingExtent(candidate.getGeometry().getExtent(), (feature) => {
                if (feature === circleFeature) {
                    hits.push(candidate);
                }
            })
        })

        // const turfCircle = turf.circle(myCircle.getCenter(), myCircle.getRadius());
        // console.log(turfCircle);
        // const tc = format.readFeature(turfCircle);
        // source.addFeature(tc);
        // candidates.forEach((candidate) => {
        //     const turfFeature = format.writeFeatureObject(candidate);
        //     console.log(turfFeature);
        //     if (turf.booleanContains(turfCircle, turfFeature)) {
        //         hits.push(candidate);
        //     }
        // })

        source.removeFeature(circleFeature);
    });
    const selectedFeatures = selectInteraction.getFeatures();
    console.log(hits.length);
    hits.forEach(hit => {
        const simpleGeom = hit.getGeometry().simplify(5);
        hit.setGeometry(simpleGeom);
        uiLayer.getSource().addFeature(hit);
    });

    myCircles = [];

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
        console.log("remove");
        const olLayerToRemove = layerManager.decrementLevel();
        if (olLayerToRemove) {
            console.log(olLayerToRemove);
            map.removeLayer(olLayerToRemove);
        }
        break;
    case 'ArrowRight':
        console.log("add");
        const olLayerToAdd = layerManager.incrementLevel();
        if (olLayerToAdd) {
            map.addLayer(olLayerToAdd);
        }
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
    case 'c': 
        layerManager.toggleCategory();
        break;
    default:
        break;
    }
    map.render();
});
