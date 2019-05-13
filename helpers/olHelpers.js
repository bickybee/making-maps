import {createEmpty as createEmptyExtent, extend as extendExtent} from 'ol/extent.js';

export const extentFromOlLayers = (layers) => {
    const totalExtent = createEmptyExtent();
    layers.forEach((layer) => {
        const source = layer.getSource();
        const extent = source.getExtent();
        extendExtent(totalExtent, extent);
    });
    return totalExtent;
};

export const extentFromOlGeoms = (geoms) => {
    const totalExtent = createEmptyExtent();
    geoms.forEach((geom) => {
        const extent = geom.getExtent();
        extendExtent(totalExtent, geom);
    });
    return totalExtent;
};

export const removeOlLayers = (layers, map) => {
    layers.forEach(layer => {
        map.removeLayer(layer);
    });
};

export const addOlLayers = (layers, map) => {
    layers.forEach(layer => {
        map.getLayers().insertAt(1, layer);
    });
};

export const createStamp = (olEvent, brushSize, map) => {
    const mouseCoord = olEvent.coordinate;
    const mousePixel = map.getPixelFromCoordinate(mouseCoord);
    const perimeterPixel = [mousePixel[0] + brushSize, mousePixel[1]];
    const perimeterCoord = map.getCoordinateFromPixel(perimeterPixel);
    const newStamp = {
        'center': mouseCoord,
        'perimeter': perimeterCoord
    };
    return newStamp;
};

const sampleCircle = (samples, center, r) => {
    const points = [];
    const step = (2 * Math.PI) / samples;
    for (let theta = 0; theta < 2 * Math.PI; theta += step) {
        const x = center[0] + r * Math.cos(theta);
        const y = center[1] + r * Math.sin(theta);
        points.push([x, y]);
    }
    return points;
};

export const sampleCircleCoords = (olEvent, radius, map) => {
    const centerCoord = olEvent.coordinate;
    const centerPixel = map.getPixelFromCoordinate(centerCoord);
    const perimeterPixels = sampleCircle(8, centerPixel, radius);
    const perimeterCoords = [];
    perimeterPixels.forEach((pixel) => {
        perimeterCoords.push(map.getCoordinateFromPixel(pixel));
    });
};

export const stampCoordsToPixels = (stampCoords, map) => {
    const stampPixels = [];
    stampCoords.forEach(stamp => {
        const pixelCenter = map.getPixelFromCoordinate(stamp.center);
        const pixelPerimeter = map.getPixelFromCoordinate(stamp.perimeter);
        stampPixels.push({
            'center': pixelCenter,
            'perimeter': pixelPerimeter
        });
    });
    return stampPixels;
};
