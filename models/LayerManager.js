import {parseLayerConfig, parseOSMToLayers} from '../helpers/configHelpers.js';

export default class LayerManager {

    constructor(configJSON, osmJSON, toplvl) {
        const config = parseLayerConfig(configJSON);
        this.order = config.layerOrders[toplvl];
        this.styles = config.layerStyles[toplvl];
        this.maxLevelIndex = this.order.length - 1;
        this.layers = parseOSMToLayers(osmJSON, this.order, this.styles, toplvl);
        this.currentLevel = this.maxLevelIndex;
    }

    getLayerByName(name) {
        return this.layers[name];
    }

    getLayersByLevel(level) {
        const layersAtLevel = [];
        const layerNames = this.order[level];
        layerNames.forEach(name => {
            layersAtLevel.push(this.layers[name]);
        });
        return layersAtLevel;
    }

    getOlLayers() {
        return Object.values(this.layers).map(layer => {
            return layer.olLayer;
        });
    }

    incrementLevel() {
        const olLayersToAdd = [];
        if (this.currentLevel < this.maxLevelIndex) {
            const candidates = this.order[this.currentLevel + 1];
            candidates.forEach((layerName) => {
                const layer = this.layers[layerName];
                if (!layer.hasStamps()) {
                    olLayersToAdd.push(this.layers[layerName].olLayer);
                }
            });
            this.currentLevel++;
        }
        return olLayersToAdd;
    }

    decrementLevel() {
        const olLayersToRemove = [];
        console.log(this.currentLevel);
        if (this.currentLevel >= 0) {
            const candidates = this.order[this.currentLevel];
            candidates.forEach((layerName) => {
                const layer = this.layers[layerName];
                if (!layer.hasStamps()) {
                    olLayersToRemove.push(this.layers[layerName].olLayer);
                }
            });
            this.currentLevel--;
        }
        return olLayersToRemove;
    }

    setHandlers(action, fn) {
        Object.values(this.layers).forEach((layer) => {
            layer.setHandler(action, fn);
        });
    }

    addStamp(stamp) {
        for (let i = 0; i <= this.currentLevel; i++) {
            const layerNames = this.order[i];
            layerNames.forEach(layerName => {
                const layer = this.layers[layerName];
                if (layer) {
                    layer.addStamp(stamp);
                }
            });
        }
    }

}
