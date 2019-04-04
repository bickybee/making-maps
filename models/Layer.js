import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';

export default class Layer {

    constructor(name, level, style) {
        this.name = name;
        this.level = level;
        this.stamps = [];
        this.olLayer = new VectorLayer({
            name: this.name,
            source: new VectorSource(),
            style: style,
            declutter: true
        });
    }

    get source() {
        return this.olLayer.getSource();
    }

    setHandler(action, fn) {
        this.olLayer.on(action, fn);
    }

    addStamp(stamp) {
        this.stamps.push(stamp);
    }

    hasStamps() {
        return this.stamps.length > 0;
    }
}
