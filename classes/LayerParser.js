import LayerCategory from './LayerCategory.js'
import Layer from './Layer.js';
import GeoJSON from 'ol/format/GeoJSON';
import {Stroke, Fill, Style} from 'ol/style.js';

const TYPE_MANUAL = 'manual';
const TYPE_AREA = 'area';

const FN_PERCENTILE = 'percentile';
const FN_FRACTION = 'fraction';
const FN_KMEANS = 'cluster';

const areaGeoms = [
    'Circle',
    'Polygon',
    'MultiPolygon'
];

export default class LayerParser {

    parseManualStyle(styleObj) {
        const olStyle = new Style({
            'stroke': new Stroke({
                'color': styleObj.stroke.color,
                'width': styleObj.stroke.width
            })
        });
        return olStyle;
    };

    parseManualHierarchy(name, categoryIndex, data, config) {
        console.log(config);
        const hierarchy = config.hierarchy.definition.layers;
        const layers = [];
        const features = new GeoJSON().readFeatures(data, {featureProjection: 'EPSG:3857'});
        console.log("checking features");

        features.forEach((feature) => {
            const level = hierarchy.findIndex(layer => {
                return layer.properties.find((prop) => {
                    if (feature.getKeys().includes(prop.key)) {
                        return feature.getProperties()[prop.key] === prop.value;
                    }
                });
            });

            // no place in the hierarchy? skip this feature
            if (level < 0) {
                return;
            }

            // add to layer at level!
            // create layer if not defined yet
            if (!layers[level]) {
                const style = this.parseManualStyle(hierarchy[level].style);
                layers[level] = new Layer(categoryIndex, level, style);
            }
            layers[level].addFeature(feature);

        });

        // filter out layers that were never defined (didn't have any features added!)
        const nonEmptyLayers = layers.filter(layer => layer);
        const category = new LayerCategory(name, nonEmptyLayers);
        console.log("parsed");
        return category;
    }

    styleAtFraction(frac) {
        const rb = 225 - Math.floor(225 * frac);
        const colourString = 'rgba(' + rb + ',255,'+ rb + ',1.0)';
        const olStyle = new Style({
            'fill': new Fill({
                'color': colourString
            })
        });
        return olStyle;
    };

    allocateByPercentile(featureData, sortOn, layers, divisions) {
        // sort
        featureData.sort((a, b) => {
            return b[sortOn] - a[sortOn];
        });
        const maxVal = featureData[0][sortOn];
        const valChunks = maxVal / divisions;
        // use sorted array to find pivots/sections according to divisions (by percentile)
        // SPLIT 
        featureData.map((elem, i) => {
            const feature = elem.feature;
            let level = 0;
            if (elem[sortOn] !== maxVal) {
                level = (divisions - 1) - Math.floor(elem[sortOn] / valChunks);
            }
            layers[level].addFeature(feature);
        });
        return layers;
    }

    allocateByFraction(featureData, sortOn, layers, divisions) {
        // sort
        featureData.sort((a, b) => {
            return b[sortOn] - a[sortOn];
        });
        const divisionSize = Math.ceil(featureData.length / divisions)
        // use sorted array to find pivots/sections according to divisions
        featureData.map((elem, i) => {
            const feature = elem.feature;
            const level = Math.floor(i / divisionSize);
            layers[level].addFeature(feature);
        });
        
        return layers;
    }

    allocateByCluster(featureData, sortOn, layers, divisions) {
        // sort
        featureData.sort((a, b) => {
            return b[sortOn] - a[sortOn];
        });

        console.log(featureData);
        // find natural clusters by largest ratios
        const maxN = new Array(divisions);
        maxN.fill(0);

        const ratios = [];

        for (let i = 0; i < featureData.length - 1; i++) {
            const ratio = featureData[i][sortOn]/featureData[i + 1][sortOn];
            ratios.push({
                "index": i,
                "ratio": ratio
            });
        }

        ratios.sort((a, b) => {
            return b.ratio - a.ratio;
        })

        const sliceIndices = ratios.map(r => r.index).slice(0, divisions - 1);
        sliceIndices.sort((a, b) => {
            return a - b;
        });
        console.log("slices");
        console.log(sliceIndices);
        let currentSlice = 0;

        featureData.forEach((elem, i) => {
            if (currentSlice < divisions && i > sliceIndices[currentSlice]) {
                currentSlice++;
            }
            layers[currentSlice].addFeature(elem.feature);
        })

        return layers;
    }


    parseAreaHierarchy(name, categoryIndex, data, config) {
        let layers = [];
        const divisions = config.hierarchy.definition.divisions;
        // initialize layers and styles
        for (let i = 0; i < divisions; i++) {
            const style = this.styleAtFraction(1- (i / divisions));
            layers[i] = new Layer(categoryIndex, i, style);
        }
        const featureAreas = [];
        const features = new GeoJSON().readFeatures(data, {featureProjection: 'EPSG:3857'});
        // get sizes of all features
        features.forEach((feature) => {
            const geometry = feature.getGeometry();
            const geometryType = geometry.getType();
            if (!areaGeoms.includes(geometryType)) {
                return;
            }
            const area = geometry.getArea();
            if (area === 0) {
                return;
            }
            featureAreas.push({
                'area': area,
                'feature': feature
            });
        });

        layers = this.allocateByCluster(featureAreas, 'area', layers, divisions);
        
        const nonEmptyLayers = layers.filter(layer => layer);
        layers.forEach(layer => {
            console.log(layer.getOlLayer().getSource().getFeatures().length);
        })
        const category = new LayerCategory(name, nonEmptyLayers);
        return category;
    }

    parseCategory(category, index) {
        const data = require('../data/geojson/' + category.dataFileName);
        const config = require('../data/configs/' + category.configFileName);

        const name = config.name;
        const hierarchyType = config.hierarchy.type;

        switch (hierarchyType) {
        case TYPE_MANUAL:
            return this.parseManualHierarchy(name, index, data, config);
            break;
        case TYPE_AREA:
            console.log("parsing");
            return this.parseAreaHierarchy(name, index, data, config);
            break;
        default:
            break;
        }
    }

    constructor(pathToConfig) {
        const config = require('../data/dataConfig.json');
        this.categories = config.categories;
    }

    parse() {
        const parsedCategories = [];
        this.categories.forEach((category, i) => {
            const parsed = this.parseCategory(category, i);
            console.log(parsed);
            parsedCategories.push(parsed);
        });
        return parsedCategories;
    }
}
