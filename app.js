// Form helper function
function fillHidden(hiddenname) {
  var checkboxes = document.querySelectorAll(
    '[hidden-data="' + hiddenname + '"]',
  );
  var hiddenfield = document.getElementById(hiddenname);
  hiddenfield.value = "";
  var i;
  for (i = 0; i < checkboxes.length; i++) {
    var x = checkboxes[i];
    if (x.checked) {
      if (hiddenfield.value == "") {
        hiddenfield.value = x.value;
      } else {
        hiddenfield.value = hiddenfield.value + ", " + x.value;
      }
    }
  }
}

// Color picker for SVG shape coloring
class ColorPicker {
  constructor() {
    this.maxColors = 5; // Number of SVG shapes (c1 to c5)
    this.selectedColors = new Array(this.maxColors).fill(null);
    this.colorToSlot = new Map();
    this.init();
  }

  init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupListeners());
    } else {
      this.setupListeners();
    }
  }

  setupListeners() {
    const checkboxes = document.querySelectorAll('.color-picker input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', (e) => this.handleColorChange(e.target));
    });
  }

  handleColorChange(checkbox) {
    const colorId = checkbox.id;
    const label = checkbox.parentElement;
    
    if (checkbox.checked) {
      // Get color from data-color attribute
      const color = checkbox.getAttribute('data-color');
      if (color) {
        this.addColor(colorId, color, checkbox);
        this.updateUI();
      } else {
        // Fallback to image extraction if no data-color
        const img = label.querySelector('img.radio');
        this.extractColorFromImage(img).then(extractedColor => {
          this.addColor(colorId, extractedColor, checkbox);
          this.updateUI();
        });
      }
    } else {
      this.removeColor(colorId);
      this.updateUI();
    }
  }

  async extractColorFromImage(img) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!img.complete) {
        img.onload = () => this.getImageColor(img, canvas, ctx, resolve);
      } else {
        this.getImageColor(img, canvas, ctx, resolve);
      }
    });
  }

  getImageColor(img, canvas, ctx, resolve) {
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    
    ctx.drawImage(img, 0, 0);
    
    const centerX = Math.floor(canvas.width / 2);
    const centerY = Math.floor(canvas.height / 2);
    const imageData = ctx.getImageData(centerX, centerY, 1, 1);
    const pixel = imageData.data;
    
    const color = `#${this.componentToHex(pixel[0])}${this.componentToHex(pixel[1])}${this.componentToHex(pixel[2])}`;
    console.log('Extracted color:', color);
    resolve(color);
  }

  componentToHex(c) {
    const hex = c.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }

  addColor(colorId, color, checkbox) {
    if (this.colorToSlot.has(colorId)) {
      return;
    }

    const emptySlot = this.selectedColors.findIndex(slot => slot === null);
    
    if (emptySlot !== -1) {
      this.selectedColors[emptySlot] = { colorId, color };
      this.colorToSlot.set(colorId, emptySlot);
      this.updateSVGShape(emptySlot + 1, color);
    } else {
      checkbox.checked = false;
    }
  }

  removeColor(colorId) {
    const slot = this.colorToSlot.get(colorId);
    if (slot !== undefined) {
      this.selectedColors[slot] = null;
      this.colorToSlot.delete(colorId);
      this.updateSVGShape(slot + 1, 'white');
    }
  }

  updateSVGShape(shapeNumber, color) {
    this.loadInlineSVG().then(svgDoc => {
      if (!svgDoc) return;
      
      const shape = svgDoc.getElementById(`c${shapeNumber}`);
      if (shape) {
        shape.setAttribute('fill', color);
        if (color !== 'white') {
          shape.style.fillOpacity = '1';
        }
      } else {
        console.warn(`Shape c${shapeNumber} not found`);
      }
    });
  }

  async loadInlineSVG() {
    let svgElement = document.querySelector('svg[data-color-picker]');
    
    if (!svgElement) {
      const imgElement = document.querySelector('img[src*="sample-vector"]');
      if (!imgElement) {
        console.warn('SVG image not found');
        return null;
      }

      try {
        const response = await fetch('sample-vector-empty.svg');
        const svgText = await response.text();
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
        svgElement = svgDoc.querySelector('svg');
        
        if (!svgElement) {
          console.error('Could not parse SVG');
          return null;
        }
        
        svgElement.setAttribute('data-color-picker', 'true');
        svgElement.style.maxWidth = '100%';
        svgElement.style.height = 'auto';
        
        const container = imgElement.parentElement;
        container.replaceChild(svgElement, imgElement);
        
        console.log('SVG loaded inline successfully');
      } catch (error) {
        console.error('Error loading SVG:', error);
        return null;
      }
    }
    
    return svgElement;
  }

  updateUI() {
    const checkboxes = document.querySelectorAll('.color-picker input[type="checkbox"]');
    const allFilled = this.selectedColors.every(slot => slot !== null);

    checkboxes.forEach(checkbox => {
      const label = checkbox.parentElement;
      const isSelected = this.colorToSlot.has(checkbox.id);
      
      if (allFilled && !isSelected) {
        label.style.opacity = '0.3';
        label.style.pointerEvents = 'none';
      } else {
        label.style.opacity = '1';
        label.style.pointerEvents = 'auto';
      }
    });
  }
}

// Initialize the color picker
const colorPicker = new ColorPicker();
