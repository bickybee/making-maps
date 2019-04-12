export default class LayerCategory {

    constructor(name, layers) {
        this.name = name;
        this.layers = layers;
        this.maxLevelIndex = layers.length - 1;
        this.currentIndex = 0;
    }

    getCurrentIndex() {
        return this.currentIndex;
    }

    getLayer(level) {
        return this.layers[level];
    }

    getLayers() {
        return this.layers;
    }

    getOlLayer(level) {
        return this.layers.getOlLayer();
    }

    getOlLayers() {
        const olLayers = []
        this.layers.forEach(layer => {
            olLayers.push(layer.getOlLayer());
        });
        return olLayers;
    }

    // visible ones
    getCurrentOlLayers() {
        const olLayers = []
        for (let i = 0; i <= this.currentIndex; i++) {
            olLayers.push(this.layers[i].getOlLayer());
        }
        return olLayers;
    }

    incrementLevel() {
        let olLayerToAdd = undefined;
        if (this.currentIndex < this.maxLevelIndex) {
            const candidate = this.layers[this.currentIndex + 1];
            if (!candidate.hasStamps()) {
                olLayerToAdd = candidate.getOlLayer();
            }
            this.currentIndex++;
        }
        return olLayerToAdd;
    }

    decrementLevel() {
        let olLayerToRemove = undefined;
        if (this.currentIndex >= 0) {
            const candidate = this.layers[this.currentIndex];
            if (!candidate.hasStamps()) {
                olLayerToRemove = candidate.getOlLayer();
            }
            this.currentIndex--;
        }
        return olLayerToRemove;
    }

    setHandlers(action, fn) {
        Object.values(this.layers).forEach((layer) => {
            layer.setHandler(action, fn);
        });
    }

    addStamp(stamp) {
        for (let i = 0; i <= this.currentIndex; i++) {
            this.layers[i].addStamp(stamp);
        }
    }

    setZIndices(offset) {
        this.layers.forEach((layer) => {
            // lowest level should have highest z-index
            const zIndex = offset + this.layers.length - 1 - layer.getLevel();
            layer.setZIndex(zIndex);
        })
    }

}

