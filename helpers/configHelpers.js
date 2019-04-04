import {Stroke, Style} from 'ol/style.js';
import GeoJSON from 'ol/format/GeoJSON';
import Layer from '../models/Layer.js';

const parseStyle = (styleObj) => {
    const olStyle = new Style({
        'stroke': new Stroke({
            'color': styleObj.stroke.color,
            'width': styleObj.stroke.width
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
            layers[streetType].source.addFeature(feature);
        }
    });

    return layers;
};

export {
    parseLayerConfig,
    parseOSMToLayers
};

