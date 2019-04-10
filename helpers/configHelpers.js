import {Stroke, Style} from 'ol/style.js';
import GeoJSON from 'ol/format/GeoJSON';
import Layer from '../classes/Layer.js';

const areaGeoms = [
    'Circle',
    'Polygon',
    'MultiPolygon'
];

const parseStyle = (styleObj) => {
    const olStyle = new Style({
        'stroke': new Stroke({
            'color': styleObj.stroke.color,
            'width': styleObj.stroke.width
        })
    });
    return olStyle;
};

const styleAtFraction = (frac) => {
    const red = Math.floor(255 * frac);
    const colourString = 'rgba(' + red + ',255,255,1)';
    const olStyle = new Style({
        'stroke': new Stroke({
            'color': colourString
        })
    });
    return olStyle;
};

const parseLayerConfig = (json) => {
    const categories = json.categories;
    const layerOrders = {};
    const layerStyles = {};
    Object.keys(categories).forEach((layerCategory) => {
        layerOrders[layerCategory] = [];
        layerStyles[layerCategory] = [];
        const layers = categories[layerCategory];
        layers.forEach((layer) => {
            layerOrders[layerCategory].push(layer.values);
            layerStyles[layerCategory].push(parseStyle(layer.style));
        });
    });
    return {layerOrders, layerStyles};
};


//TODO: FIX TO RETURN ACTUAL LAYERS
const parseOSMToLayersBySize = (osmJSON, divisions) => {
    const layers = {};
    const styles = {};
    // initialize layers and styles
    for (let i = 0; i < divisions; i++) {
        styles[i] = styleAtFraction(i / divisions);
        layers[i] = new Layer(i, i, styles[i]);
    }
    const featureAreas = [];
    const features = new GeoJSON().readFeatures(osmJSON, {featureProjection: 'EPSG:3857'});
    // get sizes of all features
    features.forEach((feature) => {
        const geometry = feature.getGeometry();
        const geometryType = geometry.getType();
        if (!areaGeoms.includes(geometryType)) {
            return;
        }
        const area = geometry.getArea();
        featureAreas.push({
            'area': area,
            'feature': feature
        });
    });
    // sort by area
    featureAreas.sort((a, b) => {
        return b.area - a.area;
    });
    const divisionSize = Math.ceil(featureAreas.length / divisions)
    // use sorted array to find pivots/sections according to divisions (by percentile)
    featureAreas.map((elem, i) => {
        const feature = elem.feature;
        const level = Math.floor(i / divisionSize);
        layers[level].addFeature(feature);
    });
    
    return {layers, styles};
};

const parseOSMToLayers = (osmJSON, layerOrder, layerStyles, toplvl) => {

    const layers = {};
    const features = new GeoJSON().readFeatures(osmJSON, {featureProjection: 'EPSG:3857'});

    features.forEach((feature) => {
        if (feature.getKeys().includes(toplvl)) {
            const streetType = feature.getProperties()[toplvl];
            // Create new layer for each LEVEL
            if (!layers[streetType]) {
                const layerLevel = layerOrder.findIndex((layerNames) => {
                    return layerNames.includes(streetType);
                });
                if (layerLevel < 0) {
                    return;
                }
                layers[streetType] = new Layer(streetType, layerLevel, layerStyles[layerLevel]);
            }
            feature.set('layerName', streetType);
            feature.set('layerLevel', layers[streetType].level);
            layers[streetType].addFeature(feature);
        }
    });

    return layers;
};

export {
    parseLayerConfig,
    parseOSMToLayers,
    parseOSMToLayersBySize
};

