import LayerCategory from './LayerCategory.js';

export default class SliderCreator {

    createSlider(category, increment, decrement){
        const div = document.createElement('div');
        div.setAttribute('class', 'slidecontainer');
        div.innerHTML += category.name + "<br>";
        const slider = document.createElement('input');
        slider.setAttribute('type', 'range');
        slider.setAttribute('min', -1),
        slider.setAttribute('max', category.maxLevelIndex),
        slider.setAttribute('value', category.currentIndex);
        slider.setAttribute('id', category.name);

        const updateCategory = (val) => {
            const catIndex = category.getCurrentIndex();
            console.log(catIndex);
            if (val > catIndex) {
                increment(category.incrementLevel());
            } else if (val < catIndex) {
                decrement(category.decrementLevel());
            }
        }

        slider.addEventListener('input', (e) => {
            const val = e.target.value;
            updateCategory(val);
        })

        div.appendChild(slider);

        return div;
    }

    createCategorySliders(categories, increment, decrement) {
        const sliders = [];
        categories.forEach(category => {
            sliders.push(this.createSlider(category, increment, decrement));
        });
        return sliders;
    }

}