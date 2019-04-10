import LayerCategory from './LayerCategory.js'
import Layer from './Layer.js';
import GeoJSON from 'ol/format/GeoJSON';
import {Stroke, Style} from 'ol/style.js';

const TYPE_MANUAL = 'manual';
const TYPE_SIZE = 'size';

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

    parseSizeHierarchy(name, data, config) {
        return;
    }

    parseCategory(category, index) {
        const data = require('../data/geojson/' + category.dataFileName);
        const config = require('../data/configs/' + category.configFileName);

        const name = config.name;
        const hierarchyType = config.hierarchy.type;

        switch (hierarchyType) {
        case TYPE_MANUAL:
            console.log("parsing");
            return this.parseManualHierarchy(name, index, data, config);
            break;
        case TYPE_SIZE:
            return this.parseSizeHierarchy(name, data, config);
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
            parsedCategories.push(parsed);
        });
        return parsedCategories;
    }
}
