import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';

export default class Layer {

    constructor(category, level, style) {
        this.category = category;
        this.level = level;
        this.stamps = [];
        this.olLayer = new VectorLayer({
            category: this.category,
            level: this.level,
            source: new VectorSource(),
            style: style,
            declutter: true
        });
    }

    getOlLayer() {
        return this.olLayer;
    }

    getSource() {
        return this.olLayer.getSource();
    }

    setHandler(action, fn) {
        this.olLayer.on(action, fn);
    }

    addFeature(feature) {
        feature.set('category', this.category);
        feature.set('level', this.level);
        this.olLayer.getSource().addFeature(feature);
    }

    getFeatures() {
        return this.olLayer.getSource().getFeatures();
    }

    addStamp(stamp) {
        this.stamps.push(stamp);
    }

    hasStamps() {
        return this.stamps.length > 0;
    }
}
