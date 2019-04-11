import LayerParser from './LayerParser.js';
import LayerCategory from './LayerCategory.js';

export default class LayerManager {

    constructor(pathToConfig) {
        
        const parser = new LayerParser(pathToConfig);
        this.categories = parser.parse();
        this.index = this.categories.length - 1; // current category

    }

    getLayer(category, level){
        return this.categories[category].getLayer(level);
    }

    getOlLayer(category, level) {
        return this.categories[category].getOlLayer(level);
    }

    getOlLayers() {
        const olLayers = []
        console.log(this.categories);
        this.categories.forEach((category) => {
            const categoryLayers = category.getOlLayers();
            olLayers.push(...categoryLayers);
        })
        return olLayers;
    }

    getCurrentLevelForCategory(category) {
        return this.categories[category].getCurrentIndex();
    }

    setCurrentCategory(newIndex) {
        this.index = newIndex;
    }

    incrementLevel() {
        return this.incrementLevelForCategory(this.index);
    }

    decrementLevel() {
        return this.decrementLevelForCategory(this.index);
    }

    incrementLevelForCategory(index) {
        const category = this.categories[index];
        const olLayersToAdd = category.incrementLevel();
        return olLayersToAdd;
    }

    decrementLevelForCategory(index) {
        const category = this.categories[index];
        const olLayersToRemove = category.decrementLevel();
        return olLayersToRemove;
    }

    setHandlers(action, fn) {
        Object.values(this.categories).forEach((category) => {
            category.setHandlers(action, fn);
        });
    }

    addStampForCategory(stamp, category) {
        this.categories[category].addStamp(stamp);
    }

    addStamp(stamp) {
        this.addStampForCategory(stamp, this.index);
    }

}
