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

// Color picker for SVG shape coloring with model selection
class ColorPicker {
  constructor() {
    this.maxColors = 5; // Default, will be updated based on SVG
    this.maxColorsTracked = 5; // Track the maximum colors ever needed
    this.selectedColors = [];
    this.colorToSlot = new Map();
    this.currentSvgUrl = null; // No default - user must select a model
    this.currentSvgElement = null;
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
    // Color checkboxes
    const checkboxes = document.querySelectorAll('.color-picker input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', (e) => this.handleColorChange(e.target));
    });

    // Model radio buttons
    const modelRadios = document.querySelectorAll('input[name="model"]');
    modelRadios.forEach(radio => {
      radio.addEventListener('change', (e) => this.handleModelChange(e.target));
    });

    // Load initial SVG only if one is selected
    const checkedModel = document.querySelector('input[name="model"]:checked');
    if (checkedModel) {
      this.currentSvgUrl = checkedModel.getAttribute('data-svg');
      this.loadInlineSVG(this.currentSvgUrl);
    }
    // Otherwise, show empty preview or placeholder
  }

  async handleModelChange(radio) {
    const newSvgUrl = radio.getAttribute('data-svg');
    if (newSvgUrl === this.currentSvgUrl) return;

    // Store current colors
    const savedColors = this.selectedColors.filter(slot => slot !== null);
    
    // Load new SVG
    this.currentSvgUrl = newSvgUrl;
    await this.loadInlineSVG(newSvgUrl);

    // Count shapes in new SVG
    const newShapeCount = this.countColorableShapes();
    
    // Keep track of maximum colors ever needed
    this.maxColorsTracked = Math.max(this.maxColorsTracked, newShapeCount, savedColors.length);
    
    // Always maintain the maximum color slots (never reduce)
    this.maxColors = this.maxColorsTracked;
    this.selectedColors = new Array(this.maxColors).fill(null);
    this.colorToSlot.clear();

    // Reapply all saved colors to slots
    savedColors.forEach((colorData, index) => {
      this.selectedColors[index] = colorData;
      this.colorToSlot.set(colorData.colorId, index);
      
      // Only apply color to SVG if this slot index exists in current model
      if (index < newShapeCount) {
        this.updateSVGShape(index, colorData.color);
      }
    });

    this.updateUI();
  }

  countColorableShapes() {
    if (!this.currentSvgElement) return 5; // Default
    
    // Use the same logic as getColorableShapes() for consistency
    const colorableShapes = this.getColorableShapes();
    const count = colorableShapes.length;
    
    console.log(`Counted ${count} colorable shapes in SVG`);
    return count > 0 ? count : 5; // Fallback to 5
  }

  handleColorChange(checkbox) {
    const colorId = checkbox.id;
    
    if (checkbox.checked) {
      const color = checkbox.getAttribute('data-color');
      if (color) {
        this.addColor(colorId, color, checkbox);
        this.updateUI();
      }
    } else {
      this.removeColor(colorId);
      this.updateUI();
    }
  }

  addColor(colorId, color, checkbox) {
    if (this.colorToSlot.has(colorId)) {
      return;
    }

    const emptySlot = this.selectedColors.findIndex(slot => slot === null);
    
    if (emptySlot !== -1) {
      this.selectedColors[emptySlot] = { colorId, color };
      this.colorToSlot.set(colorId, emptySlot);
      this.updateSVGShape(emptySlot, color);
    } else {
      checkbox.checked = false;
    }
  }

  removeColor(colorId) {
    const slot = this.colorToSlot.get(colorId);
    if (slot !== undefined) {
      this.selectedColors[slot] = null;
      this.colorToSlot.delete(colorId);
      this.updateSVGShape(slot, 'white');
    }
  }

  updateSVGShape(slotIndex, color) {
    if (!this.currentSvgElement) return;
    
    // Get all colorable shapes (by index, not by ID)
    const shapes = this.getColorableShapes();
    
    if (slotIndex < shapes.length) {
      const shape = shapes[slotIndex];
      shape.setAttribute('fill', color);
      if (color !== 'white') {
        shape.style.fillOpacity = '1';
      }
    }
  }

  getColorableShapes() {
    if (!this.currentSvgElement) return [];
    
    // Get all shapes by their order in the SVG (rect, circle, path, polygon, ellipse)
    const allShapes = this.currentSvgElement.querySelectorAll('rect, circle, path, polygon, ellipse');
    
    return Array.from(allShapes).filter(shape => {
      const fill = shape.getAttribute('fill');
      const stroke = shape.getAttribute('stroke');
      
      // Exclude shapes that are explicitly fill="none" 
      if (fill === 'none') return false;
      
      // Include shapes with explicit fill attribute (white, color, etc.)
      if (fill && fill !== 'none') return true;
      
      // Exclude stroke-only shapes (have stroke but no fill attribute at all)
      // These are decorative lines/outlines, not colorable areas
      if (stroke && !shape.hasAttribute('fill')) return false;
      
      // Include everything else (shapes with no fill or stroke attributes default to black fill)
      return true;
    });
  }

  async loadInlineSVG(svgUrl) {
    const imgElement = document.querySelector('.svg-preview img, .svg-preview svg');
    if (!imgElement) {
      console.warn('SVG preview container not found');
      return;
    }

    try {
      const response = await fetch(svgUrl);
      const svgText = await response.text();
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
      const svgElement = svgDoc.querySelector('svg');
      
      if (!svgElement) {
        console.error('Could not parse SVG');
        return;
      }
      
      svgElement.setAttribute('data-color-picker', 'true');
      svgElement.style.maxWidth = '100%';
      svgElement.style.height = 'auto';
      
      const container = imgElement.parentElement;
      container.innerHTML = '';
      container.appendChild(svgElement);
      
      this.currentSvgElement = svgElement;
      
      console.log(`SVG loaded: ${svgUrl}`);
    } catch (error) {
      console.error('Error loading SVG:', error);
    }
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
