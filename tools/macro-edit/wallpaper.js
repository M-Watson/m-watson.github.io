/**
 * Wallpaper Studio - Advanced Multi-Image Wallpaper Compositor
 * Supports: Multi-layer Selection & Universal Editing, Crop, Move, Transform, Mask, Merge, Layout, Filter, and Ultrawide Wallpaper Export
 */

(function (window) {
    'use strict';

    // Preset Wallpaper Dimensions
    const RESOLUTION_PRESETS = {
        '3440x1440': { name: 'Ultrawide 21:9 (3440 × 1440)', width: 3440, height: 1440, category: 'ultrawide' },
        '2560x1080': { name: 'WFHD 21:9 (2560 × 1080)', width: 2560, height: 1080, category: 'ultrawide' },
        '5120x1440': { name: 'Super Ultrawide 32:9 (5120 × 1440)', width: 5120, height: 1440, category: 'super-ultrawide' },
        '3840x1080': { name: 'Dual Monitor (3840 × 1080)', width: 3840, height: 1080, category: 'multi-monitor' },
        '5760x1080': { name: 'Triple Monitor (5760 × 1080)', width: 5760, height: 1080, category: 'multi-monitor' },
        '3840x2160': { name: '4K UHD 16:9 (3840 × 2160)', width: 3840, height: 2160, category: 'standard' },
        '2560x1440': { name: '2K QHD 16:9 (2560 × 1440)', width: 2560, height: 1440, category: 'standard' },
        '1920x1080': { name: '1080p FHD 16:9 (1920 × 1080)', width: 1920, height: 1080, category: 'standard' },
        '2560x1600': { name: 'MacBook 16:10 (2560 × 1600)', width: 2560, height: 1600, category: 'laptop' }
    };

    // Background Gradient Presets
    const GRADIENT_PRESETS = {
        'nebula': {
            name: 'Midnight Nebula',
            render: (ctx, w, h) => {
                const g = ctx.createLinearGradient(0, 0, w, h);
                g.addColorStop(0, '#0a0a1a');
                g.addColorStop(0.35, '#1e103c');
                g.addColorStop(0.7, '#2e1065');
                g.addColorStop(1, '#030712');
                return g;
            }
        },
        'sunset': {
            name: 'Sunset Horizon',
            render: (ctx, w, h) => {
                const g = ctx.createLinearGradient(0, 0, w, 0);
                g.addColorStop(0, '#0c0a20');
                g.addColorStop(0.35, '#3b0764');
                g.addColorStop(0.7, '#831843');
                g.addColorStop(0.9, '#c2410c');
                g.addColorStop(1, '#f97316');
                return g;
            }
        },
        'cyberpunk': {
            name: 'Cyberpunk Dusk',
            render: (ctx, w, h) => {
                const g = ctx.createLinearGradient(0, 0, w, h);
                g.addColorStop(0, '#050510');
                g.addColorStop(0.3, '#172554');
                g.addColorStop(0.65, '#4338ca');
                g.addColorStop(0.85, '#701a75');
                g.addColorStop(1, '#030712');
                return g;
            }
        },
        'aurora': {
            name: 'Aurora Borealis',
            render: (ctx, w, h) => {
                const g = ctx.createLinearGradient(0, 0, w, 0);
                g.addColorStop(0, '#022c22');
                g.addColorStop(0.35, '#064e3b');
                g.addColorStop(0.65, '#0f766e');
                g.addColorStop(1, '#1e1b4b');
                return g;
            }
        },
        'charcoal': {
            name: 'Charcoal Minimal',
            render: (ctx, w, h) => {
                const g = ctx.createLinearGradient(0, 0, 0, h);
                g.addColorStop(0, '#1c1917');
                g.addColorStop(1, '#09090b');
                return g;
            }
        },
        'studio': {
            name: 'Slate Studio',
            render: (ctx, w, h) => {
                const g = ctx.createLinearGradient(0, 0, 0, h);
                g.addColorStop(0, '#1e293b');
                g.addColorStop(1, '#0f172a');
                return g;
            }
        }
    };

    // Central Studio State
    const state = {
        initialized: false,
        canvasWidth: 3440,
        canvasHeight: 1440,
        presetKey: '3440x1440',
        bgType: 'gradient', // 'color', 'gradient', 'blur'
        bgColor: '#090d16',
        bgGradientKey: 'nebula',
        zoom: 0.35,
        layers: [],
        selectedIds: [], // Multi-selection support (IDs of selected layers)
        selectedId: null, // Primary / active selected layer ID
        activeTab: 'layers', // 'layers', 'layout', 'mask', 'adjust', 'crop'
        // Layout settings
        layoutGap: 24,
        layoutMargin: 40,
        layoutRadius: 16,
        layoutBorderWidth: 0,
        layoutBorderColor: '#ffffff',
        layoutShadow: 'soft',
        // Interactive canvas transform
        currentAction: null, // 'dragging', 'resizing', 'rotating', 'crop-panning'
        activeHandle: null, // 'nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w', 'rot'
        dragStart: { x: 0, y: 0 },
        layerStart: null,
        dragLayerStarts: new Map(), // Starting positions for multi-drag
        cropStart: null,
        snapGuides: { x: null, y: null },
        // History for undo/redo
        history: [],
        historyIndex: -1,
        isCropMode: false
    };

    // DOM Elements Cache
    let dom = {};

    function init() {
        if (state.initialized) {
            handleResize();
            return;
        }

        cacheDOMElements();
        setupEventListeners();
        loadHistoryState();
        updatePresetUI();
        handleResize();
        state.initialized = true;

        // If no layers exist, load sample demo images after a brief tick
        if (state.layers.length === 0) {
            loadDemoImages();
        }

        render();
    }

    function cacheDOMElements() {
        dom = {
            viewport: document.getElementById('wp-viewport'),
            canvas: document.getElementById('wp-canvas'),
            ctx: document.getElementById('wp-canvas') ? document.getElementById('wp-canvas').getContext('2d') : null,
            // Header / Top controls
            presetSelect: document.getElementById('wp-preset-select'),
            customSizeBox: document.getElementById('wp-custom-size-box'),
            customWidth: document.getElementById('wp-custom-width'),
            customHeight: document.getElementById('wp-custom-height'),
            applyCustomSizeBtn: document.getElementById('wp-apply-custom-size'),
            bgTypeSelect: document.getElementById('wp-bg-type-select'),
            bgColorPicker: document.getElementById('wp-bg-color-picker'),
            bgGradientSelect: document.getElementById('wp-bg-gradient-select'),
            zoomSlider: document.getElementById('wp-zoom-slider'),
            zoomValueLabel: document.getElementById('wp-zoom-value-label'),
            zoomFitBtn: document.getElementById('wp-zoom-fit-btn'),
            zoomInBtn: document.getElementById('wp-zoom-in-btn'),
            zoomOutBtn: document.getElementById('wp-zoom-out-btn'),
            undoBtn: document.getElementById('wp-undo-btn'),
            redoBtn: document.getElementById('wp-redo-btn'),
            addPhotosInput: document.getElementById('wp-add-photos-input'),
            addPhotosBtn: document.getElementById('wp-add-photos-btn'),
            demoPhotosBtn: document.getElementById('wp-demo-photos-btn'),
            exportBtn: document.getElementById('wp-export-btn'),
            exportFormatSelect: document.getElementById('wp-export-format'),
            exportScaleSelect: document.getElementById('wp-export-scale'),
            copyClipboardBtn: document.getElementById('wp-copy-clipboard-btn'),
            // Navigation tabs
            sidebarTabs: document.querySelectorAll('.wp-sidebar-tab'),
            tabPanels: document.querySelectorAll('.wp-tab-panel'),
            // Multi-selection UI
            selectAllBtn: document.getElementById('wp-select-all-btn'),
            selectNoneBtn: document.getElementById('wp-select-none-btn'),
            multiSelectIndicator: document.getElementById('wp-multi-select-indicator'),
            selectedCountLabel: document.getElementById('wp-selected-count'),
            multiEditBanner: document.getElementById('wp-multi-edit-banner'),
            multiEditCountLabel: document.getElementById('wp-multi-edit-count'),
            bannerClearBtn: document.getElementById('wp-banner-clear-btn'),
            mergeSelectedBtn: document.getElementById('wp-merge-selected-btn'),
            // Layers list & controls
            layersList: document.getElementById('wp-layers-list'),
            noLayersMsg: document.getElementById('wp-no-layers-msg'),
            deleteLayerBtn: document.getElementById('wp-delete-layer-btn'),
            duplicateLayerBtn: document.getElementById('wp-duplicate-layer-btn'),
            bringForwardBtn: document.getElementById('wp-bring-forward-btn'),
            sendBackwardBtn: document.getElementById('wp-send-backward-btn'),
            mergeAllBtn: document.getElementById('wp-merge-all-btn'),
            // Layout panel
            layoutGapInput: document.getElementById('wp-layout-gap'),
            layoutMarginInput: document.getElementById('wp-layout-margin'),
            layoutRadiusInput: document.getElementById('wp-layout-radius'),
            layoutBorderWidthInput: document.getElementById('wp-layout-border-width'),
            layoutBorderColorPicker: document.getElementById('wp-layout-border-color'),
            layoutShadowSelect: document.getElementById('wp-layout-shadow'),
            // Mask panel
            maskTypeSelect: document.getElementById('wp-mask-type'),
            maskFeatherInput: document.getElementById('wp-mask-feather'),
            maskFeatherVal: document.getElementById('wp-mask-feather-val'),
            maskRadiusInput: document.getElementById('wp-mask-radius'),
            maskRadiusVal: document.getElementById('wp-mask-radius-val'),
            maskInvertCheckbox: document.getElementById('wp-mask-invert'),
            blendModeSelect: document.getElementById('wp-blend-mode'),
            layerOpacityInput: document.getElementById('wp-layer-opacity'),
            layerOpacityVal: document.getElementById('wp-layer-opacity-val'),
            // Adjustments panel
            filterPresetSelect: document.getElementById('wp-filter-preset'),
            brightnessInput: document.getElementById('wp-adj-brightness'),
            brightnessVal: document.getElementById('wp-adj-brightness-val'),
            contrastInput: document.getElementById('wp-adj-contrast'),
            contrastVal: document.getElementById('wp-adj-contrast-val'),
            saturationInput: document.getElementById('wp-adj-saturation'),
            saturationVal: document.getElementById('wp-adj-saturation-val'),
            warmthInput: document.getElementById('wp-adj-warmth'),
            warmthVal: document.getElementById('wp-adj-warmth-val'),
            hueInput: document.getElementById('wp-adj-hue'),
            hueVal: document.getElementById('wp-adj-hue-val'),
            blurInput: document.getElementById('wp-adj-blur'),
            blurVal: document.getElementById('wp-adj-blur-val'),
            vignetteInput: document.getElementById('wp-adj-vignette'),
            vignetteVal: document.getElementById('wp-adj-vignette-val'),
            resetAdjBtn: document.getElementById('wp-reset-adj-btn'),
            // Crop & Transform panel
            toggleCropModeBtn: document.getElementById('wp-toggle-crop-mode'),
            cropPanXInput: document.getElementById('wp-crop-pan-x'),
            cropPanYInput: document.getElementById('wp-crop-pan-y'),
            cropZoomInput: document.getElementById('wp-crop-zoom'),
            cropZoomVal: document.getElementById('wp-crop-zoom-val'),
            flipHBtn: document.getElementById('wp-flip-h-btn'),
            flipVBtn: document.getElementById('wp-flip-v-btn'),
            fitFrameBtn: document.getElementById('wp-fit-frame-btn'),
            fillFrameBtn: document.getElementById('wp-fill-frame-btn'),
            resetCropBtn: document.getElementById('wp-reset-crop-btn'),
            // Align buttons
            alignLeftBtn: document.getElementById('wp-align-left'),
            alignCenterHBtn: document.getElementById('wp-align-center-h'),
            alignRightBtn: document.getElementById('wp-align-right'),
            alignTopBtn: document.getElementById('wp-align-top'),
            alignCenterVBtn: document.getElementById('wp-align-center-v'),
            alignBottomBtn: document.getElementById('wp-align-bottom'),
            distributeHBtn: document.getElementById('wp-distribute-h')
        };
    }

    function setupEventListeners() {
        if (!dom.canvas) return;

        // Viewport & Zoom
        if (dom.zoomSlider) {
            dom.zoomSlider.addEventListener('input', (e) => setZoom(parseFloat(e.target.value)));
        }
        if (dom.zoomFitBtn) dom.zoomFitBtn.addEventListener('click', fitZoomToScreen);
        if (dom.zoomInBtn) dom.zoomInBtn.addEventListener('click', () => setZoom(state.zoom + 0.1));
        if (dom.zoomOutBtn) dom.zoomOutBtn.addEventListener('click', () => setZoom(state.zoom - 0.1));

        // Resolution Presets
        if (dom.presetSelect) {
            dom.presetSelect.addEventListener('change', (e) => {
                const key = e.target.value;
                state.presetKey = key;
                if (key === 'custom') {
                    if (dom.customSizeBox) dom.customSizeBox.classList.remove('hidden');
                } else {
                    if (dom.customSizeBox) dom.customSizeBox.classList.add('hidden');
                    const p = RESOLUTION_PRESETS[key];
                    if (p) setCanvasDimensions(p.width, p.height);
                }
            });
        }

        if (dom.applyCustomSizeBtn) {
            dom.applyCustomSizeBtn.addEventListener('click', () => {
                const w = parseInt(dom.customWidth.value) || 3440;
                const h = parseInt(dom.customHeight.value) || 1440;
                setCanvasDimensions(w, h);
            });
        }

        // Background Controls
        if (dom.bgTypeSelect) {
            dom.bgTypeSelect.addEventListener('change', (e) => {
                state.bgType = e.target.value;
                updateBgControlsVisibility();
                render();
            });
        }
        if (dom.bgColorPicker) {
            dom.bgColorPicker.addEventListener('input', (e) => {
                state.bgColor = e.target.value;
                render();
            });
        }
        if (dom.bgGradientSelect) {
            dom.bgGradientSelect.addEventListener('change', (e) => {
                state.bgGradientKey = e.target.value;
                render();
            });
        }

        // Sidebar Navigation Tabs
        dom.sidebarTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.dataset.tab;
                switchSidebarTab(target);
            });
        });

        // Photo Upload / Add
        if (dom.addPhotosInput) {
            dom.addPhotosInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files.length > 0) {
                    loadUserFiles(Array.from(e.target.files));
                    e.target.value = '';
                }
            });
        }
        if (dom.addPhotosBtn) {
            dom.addPhotosBtn.addEventListener('click', () => dom.addPhotosInput.click());
        }
        if (dom.demoPhotosBtn) {
            dom.demoPhotosBtn.addEventListener('click', loadDemoImages);
        }

        // Multi-Selection Toolbar Buttons
        if (dom.selectAllBtn) dom.selectAllBtn.addEventListener('click', selectAllLayers);
        if (dom.selectNoneBtn) dom.selectNoneBtn.addEventListener('click', deselectAllLayers);
        if (dom.bannerClearBtn) dom.bannerClearBtn.addEventListener('click', deselectAllLayers);
        if (dom.mergeSelectedBtn) dom.mergeSelectedBtn.addEventListener('click', mergeSelectedLayers);

        // Drag & Drop onto Viewport / Canvas
        if (dom.viewport) {
            dom.viewport.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
                dom.viewport.classList.add('ring-2', 'ring-indigo-500');
            });
            dom.viewport.addEventListener('dragleave', (e) => {
                e.preventDefault();
                dom.viewport.classList.remove('ring-2', 'ring-indigo-500');
            });
            dom.viewport.addEventListener('drop', (e) => {
                e.preventDefault();
                dom.viewport.classList.remove('ring-2', 'ring-indigo-500');
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    loadUserFiles(Array.from(e.dataTransfer.files));
                }
            });
        }

        // Layer Actions (Support Multi-Selection)
        if (dom.deleteLayerBtn) dom.deleteLayerBtn.addEventListener('click', deleteSelectedLayers);
        if (dom.duplicateLayerBtn) dom.duplicateLayerBtn.addEventListener('click', duplicateSelectedLayers);
        if (dom.bringForwardBtn) dom.bringForwardBtn.addEventListener('click', () => moveSelectedLayer(1));
        if (dom.sendBackwardBtn) dom.sendBackwardBtn.addEventListener('click', () => moveSelectedLayer(-1));
        if (dom.mergeAllBtn) dom.mergeAllBtn.addEventListener('click', mergeAllLayers);

        // Alignment Buttons
        if (dom.alignLeftBtn) dom.alignLeftBtn.addEventListener('click', () => alignSelected('left'));
        if (dom.alignCenterHBtn) dom.alignCenterHBtn.addEventListener('click', () => alignSelected('center-h'));
        if (dom.alignRightBtn) dom.alignRightBtn.addEventListener('click', () => alignSelected('right'));
        if (dom.alignTopBtn) dom.alignTopBtn.addEventListener('click', () => alignSelected('top'));
        if (dom.alignCenterVBtn) dom.alignCenterVBtn.addEventListener('click', () => alignSelected('center-v'));
        if (dom.alignBottomBtn) dom.alignBottomBtn.addEventListener('click', () => alignSelected('bottom'));
        if (dom.distributeHBtn) dom.distributeHBtn.addEventListener('click', distributeLayersHorizontally);

        // Layout Preset Buttons
        document.querySelectorAll('.wp-layout-preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const preset = btn.dataset.layout;
                applyLayoutPreset(preset);
            });
        });

        // Layout Style Inputs (Apply Universally to Selected)
        if (dom.layoutGapInput) dom.layoutGapInput.addEventListener('input', (e) => { state.layoutGap = parseInt(e.target.value); render(); });
        if (dom.layoutMarginInput) dom.layoutMarginInput.addEventListener('input', (e) => { state.layoutMargin = parseInt(e.target.value); render(); });
        if (dom.layoutRadiusInput) dom.layoutRadiusInput.addEventListener('input', (e) => { state.layoutRadius = parseInt(e.target.value); syncSelectedLayoutProps(); render(); });
        if (dom.layoutBorderWidthInput) dom.layoutBorderWidthInput.addEventListener('input', (e) => { state.layoutBorderWidth = parseInt(e.target.value); syncSelectedLayoutProps(); render(); });
        if (dom.layoutBorderColorPicker) dom.layoutBorderColorPicker.addEventListener('input', (e) => { state.layoutBorderColor = e.target.value; syncSelectedLayoutProps(); render(); });
        if (dom.layoutShadowSelect) dom.layoutShadowSelect.addEventListener('change', (e) => { state.layoutShadow = e.target.value; syncSelectedLayoutProps(); render(); });

        // Masking Controls (Universal Application to All Selected Layers)
        if (dom.maskTypeSelect) {
            dom.maskTypeSelect.addEventListener('change', (e) => {
                const selected = getSelectedLayers();
                if (selected.length === 0) return;
                selected.forEach(layer => {
                    layer.maskType = e.target.value;
                });
                render();
                pushHistory('Change Mask');
            });
        }
        if (dom.maskFeatherInput) {
            dom.maskFeatherInput.addEventListener('input', (e) => {
                const val = parseInt(e.target.value);
                const selected = getSelectedLayers();
                selected.forEach(layer => {
                    layer.maskFeather = val;
                });
                if (dom.maskFeatherVal) dom.maskFeatherVal.textContent = val + '%';
                render();
            });
            dom.maskFeatherInput.addEventListener('change', () => pushHistory('Change Feather'));
        }
        if (dom.maskRadiusInput) {
            dom.maskRadiusInput.addEventListener('input', (e) => {
                const val = parseInt(e.target.value);
                const selected = getSelectedLayers();
                selected.forEach(layer => {
                    layer.maskRadius = val;
                });
                if (dom.maskRadiusVal) dom.maskRadiusVal.textContent = val + 'px';
                render();
            });
            dom.maskRadiusInput.addEventListener('change', () => pushHistory('Change Mask Radius'));
        }
        if (dom.maskInvertCheckbox) {
            dom.maskInvertCheckbox.addEventListener('change', (e) => {
                const val = e.target.checked;
                const selected = getSelectedLayers();
                selected.forEach(layer => {
                    layer.maskInvert = val;
                });
                render();
                pushHistory('Invert Mask');
            });
        }
        if (dom.blendModeSelect) {
            dom.blendModeSelect.addEventListener('change', (e) => {
                const val = e.target.value;
                const selected = getSelectedLayers();
                selected.forEach(layer => {
                    layer.blendMode = val;
                });
                render();
                pushHistory('Change Blend Mode');
            });
        }
        if (dom.layerOpacityInput) {
            dom.layerOpacityInput.addEventListener('input', (e) => {
                const val = parseInt(e.target.value);
                const selected = getSelectedLayers();
                selected.forEach(layer => {
                    layer.opacity = val;
                });
                if (dom.layerOpacityVal) dom.layerOpacityVal.textContent = val + '%';
                render();
            });
            dom.layerOpacityInput.addEventListener('change', () => pushHistory('Change Opacity'));
        }

        // Adjustments Controls (Universal Application to All Selected Layers)
        if (dom.filterPresetSelect) {
            dom.filterPresetSelect.addEventListener('change', (e) => {
                const selected = getSelectedLayers();
                if (selected.length === 0) return;
                selected.forEach(layer => {
                    applyFilterPreset(layer, e.target.value);
                });
                const primary = getSelectedLayer();
                if (primary) updateAdjustmentInputs(primary);
                render();
                pushHistory('Apply Filter Preset');
            });
        }

        const bindAdjInput = (elem, valElem, prop, suffix = '%') => {
            if (!elem) return;
            elem.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                const selected = getSelectedLayers();
                if (selected.length === 0) return;
                selected.forEach(layer => {
                    layer[prop] = val;
                });
                if (valElem) valElem.textContent = (val > 0 ? '+' : '') + val + suffix;
                render();
            });
            elem.addEventListener('change', () => pushHistory('Change ' + prop));
        };

        bindAdjInput(dom.brightnessInput, dom.brightnessVal, 'brightness', '%');
        bindAdjInput(dom.contrastInput, dom.contrastVal, 'contrast', '%');
        bindAdjInput(dom.saturationInput, dom.saturationVal, 'saturation', '%');
        bindAdjInput(dom.warmthInput, dom.warmthVal, 'warmth', '');
        bindAdjInput(dom.hueInput, dom.hueVal, 'hue', '°');
        bindAdjInput(dom.blurInput, dom.blurVal, 'blur', 'px');
        bindAdjInput(dom.vignetteInput, dom.vignetteVal, 'vignette', '%');

        if (dom.resetAdjBtn) {
            dom.resetAdjBtn.addEventListener('click', () => {
                const selected = getSelectedLayers();
                if (selected.length === 0) return;
                selected.forEach(layer => {
                    layer.brightness = 0;
                    layer.contrast = 0;
                    layer.saturation = 0;
                    layer.warmth = 0;
                    layer.hue = 0;
                    layer.blur = 0;
                    layer.vignette = 0;
                    layer.filterPreset = 'none';
                });
                const primary = getSelectedLayer();
                if (primary) updateAdjustmentInputs(primary);
                render();
                pushHistory('Reset Adjustments');
            });
        }

        // Crop & Transform Controls (Universal Application)
        if (dom.toggleCropModeBtn) {
            dom.toggleCropModeBtn.addEventListener('click', toggleCropMode);
        }
        if (dom.cropPanXInput) {
            dom.cropPanXInput.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                getSelectedLayers().forEach(l => l.cropPanX = val);
                render();
            });
        }
        if (dom.cropPanYInput) {
            dom.cropPanYInput.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                getSelectedLayers().forEach(l => l.cropPanY = val);
                render();
            });
        }
        if (dom.cropZoomInput) {
            dom.cropZoomInput.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                getSelectedLayers().forEach(l => l.cropZoom = val);
                if (dom.cropZoomVal) dom.cropZoomVal.textContent = Math.round(val * 100) + '%';
                render();
            });
        }
        if (dom.flipHBtn) {
            dom.flipHBtn.addEventListener('click', () => {
                const selected = getSelectedLayers();
                selected.forEach(l => l.flipH = !l.flipH);
                render();
                pushHistory('Flip H');
            });
        }
        if (dom.flipVBtn) {
            dom.flipVBtn.addEventListener('click', () => {
                const selected = getSelectedLayers();
                selected.forEach(l => l.flipV = !l.flipV);
                render();
                pushHistory('Flip V');
            });
        }
        if (dom.fitFrameBtn) {
            dom.fitFrameBtn.addEventListener('click', () => {
                const selected = getSelectedLayers();
                selected.forEach(layer => {
                    if (layer.img) {
                        layer.cropPanX = 0;
                        layer.cropPanY = 0;
                        layer.cropZoom = 1.0;
                        const aspect = layer.img.width / layer.img.height;
                        layer.height = layer.width / aspect;
                    }
                });
                render();
                pushHistory('Fit Frame');
            });
        }
        if (dom.fillFrameBtn) {
            dom.fillFrameBtn.addEventListener('click', () => {
                const selected = getSelectedLayers();
                selected.forEach(layer => {
                    layer.width = state.canvasWidth;
                    layer.height = state.canvasHeight;
                    layer.x = state.canvasWidth / 2;
                    layer.y = state.canvasHeight / 2;
                    layer.rotation = 0;
                });
                render();
                pushHistory('Fill Canvas');
            });
        }
        if (dom.resetCropBtn) {
            dom.resetCropBtn.addEventListener('click', () => {
                const selected = getSelectedLayers();
                selected.forEach(layer => {
                    layer.cropPanX = 0;
                    layer.cropPanY = 0;
                    layer.cropZoom = 1.0;
                });
                if (dom.cropPanXInput) dom.cropPanXInput.value = 0;
                if (dom.cropPanYInput) dom.cropPanYInput.value = 0;
                if (dom.cropZoomInput) dom.cropZoomInput.value = 1.0;
                if (dom.cropZoomVal) dom.cropZoomVal.textContent = '100%';
                render();
                pushHistory('Reset Crop');
            });
        }

        // Export Actions
        if (dom.exportBtn) dom.exportBtn.addEventListener('click', exportWallpaper);
        if (dom.copyClipboardBtn) dom.copyClipboardBtn.addEventListener('click', copyWallpaperToClipboard);

        // Undo / Redo
        if (dom.undoBtn) dom.undoBtn.addEventListener('click', undo);
        if (dom.redoBtn) dom.redoBtn.addEventListener('click', redo);

        // Canvas Mouse / Pointer Interaction
        dom.canvas.addEventListener('mousedown', onCanvasMouseDown);
        window.addEventListener('mousemove', onCanvasMouseMove);
        window.addEventListener('mouseup', onCanvasMouseUp);
        dom.canvas.addEventListener('dblclick', (e) => {
            const p = getCanvasCoords(e);
            const clicked = hitTest(p.x, p.y);
            if (clicked) {
                selectLayer(clicked.id, false);
                toggleCropMode();
            }
        });

        // Keyboard Shortcuts
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('resize', handleResize);
    }

    function switchSidebarTab(tabId) {
        state.activeTab = tabId;
        dom.sidebarTabs.forEach(btn => {
            if (btn.dataset.tab === tabId) {
                btn.classList.add('bg-indigo-600', 'text-white', 'shadow-sm');
                btn.classList.remove('text-slate-400', 'hover:text-slate-200');
            } else {
                btn.classList.remove('bg-indigo-600', 'text-white', 'shadow-sm');
                btn.classList.add('text-slate-400', 'hover:text-slate-200');
            }
        });

        dom.tabPanels.forEach(panel => {
            if (panel.id === `wp-tab-${tabId}`) {
                panel.classList.remove('hidden');
            } else {
                panel.classList.add('hidden');
            }
        });
    }

    function setCanvasDimensions(width, height) {
        state.canvasWidth = width;
        state.canvasHeight = height;
        dom.canvas.width = width;
        dom.canvas.height = height;
        updatePresetUI();
        fitZoomToScreen();
        render();
        pushHistory('Change Canvas Size');
    }

    function updatePresetUI() {
        if (dom.presetSelect) dom.presetSelect.value = state.presetKey;
        if (dom.customWidth) dom.customWidth.value = state.canvasWidth;
        if (dom.customHeight) dom.customHeight.value = state.canvasHeight;
        const resLabel = document.getElementById('wp-current-res-label');
        if (resLabel) resLabel.textContent = `${state.canvasWidth} × ${state.canvasHeight}`;
    }

    function updateBgControlsVisibility() {
        const colorBox = document.getElementById('wp-bg-color-box');
        const gradientBox = document.getElementById('wp-bg-gradient-box');
        if (colorBox) colorBox.classList.toggle('hidden', state.bgType !== 'color');
        if (gradientBox) gradientBox.classList.toggle('hidden', state.bgType !== 'gradient');
    }

    function setZoom(val) {
        state.zoom = Math.max(0.1, Math.min(2.0, val));
        if (dom.zoomSlider) dom.zoomSlider.value = state.zoom;
        if (dom.zoomValueLabel) dom.zoomValueLabel.textContent = Math.round(state.zoom * 100) + '%';
        applyZoomStyle();
    }

    function fitZoomToScreen() {
        if (!dom.viewport) return;
        const padding = 60;
        const availW = dom.viewport.clientWidth - padding;
        const availH = dom.viewport.clientHeight - padding;
        const scaleX = availW / state.canvasWidth;
        const scaleY = availH / state.canvasHeight;
        const fitScale = Math.min(scaleX, scaleY, 1.0);
        setZoom(fitScale);
    }

    function applyZoomStyle() {
        if (!dom.canvas) return;
        dom.canvas.style.width = Math.round(state.canvasWidth * state.zoom) + 'px';
        dom.canvas.style.height = Math.round(state.canvasHeight * state.zoom) + 'px';
    }

    function handleResize() {
        if (dom.canvas) {
            dom.canvas.width = state.canvasWidth;
            dom.canvas.height = state.canvasHeight;
            fitZoomToScreen();
            render();
        }
    }

    // --- Rendering Engine ---
    function render() {
        if (!dom.ctx) return;
        const ctx = dom.ctx;
        const w = state.canvasWidth;
        const h = state.canvasHeight;

        ctx.clearRect(0, 0, w, h);

        // 1. Draw Canvas Background
        drawBackground(ctx, w, h);

        // 2. Draw Layers from bottom to top
        state.layers.forEach(layer => {
            if (!layer.visible) return;
            drawLayer(ctx, layer);
        });

        // 3. Draw Selection Bounding Boxes on ALL selected layers
        const selectedLayers = getSelectedLayers();
        selectedLayers.forEach(layer => {
            if (!layer.visible) return;
            const isPrimary = layer.id === state.selectedId;
            drawSelectionOverlay(ctx, layer, isPrimary, selectedLayers.length > 1);
        });

        // 4. Draw Snapping Guides
        drawSnapGuides(ctx);
    }

    function drawBackground(ctx, w, h) {
        if (state.bgType === 'color') {
            ctx.fillStyle = state.bgColor;
            ctx.fillRect(0, 0, w, h);
        } else if (state.bgType === 'gradient') {
            const preset = GRADIENT_PRESETS[state.bgGradientKey] || GRADIENT_PRESETS['nebula'];
            ctx.fillStyle = preset.render(ctx, w, h);
            ctx.fillRect(0, 0, w, h);
        } else if (state.bgType === 'blur') {
            const baseLayer = state.layers[0];
            if (baseLayer && baseLayer.img) {
                ctx.save();
                ctx.filter = 'blur(60px) brightness(0.6)';
                ctx.drawImage(baseLayer.img, -50, -50, w + 100, h + 100);
                ctx.restore();
            } else {
                ctx.fillStyle = '#090d16';
                ctx.fillRect(0, 0, w, h);
            }
        }
    }

    function drawLayer(ctx, layer) {
        if (!layer.img) return;

        // Render layer to offscreen canvas to apply cropping, filters, and mask
        const offCanvas = document.createElement('canvas');
        offCanvas.width = Math.max(1, Math.round(layer.width));
        offCanvas.height = Math.max(1, Math.round(layer.height));
        const offCtx = offCanvas.getContext('2d');

        // Apply Layer Adjustments / Filters
        let filterStr = `brightness(${100 + layer.brightness}%) contrast(${100 + layer.contrast}%) saturate(${100 + layer.saturation}%) hue-rotate(${layer.hue}deg) blur(${layer.blur}px)`;
        if (layer.warmth !== 0) {
            if (layer.warmth > 0) filterStr += ` sepia(${layer.warmth * 0.8}%)`;
            else filterStr += ` hue-rotate(${layer.warmth * 0.5}deg)`;
        }
        offCtx.filter = filterStr;

        // Draw image with pan/zoom and flip
        offCtx.save();
        if (layer.flipH || layer.flipV) {
            offCtx.translate(layer.flipH ? offCanvas.width : 0, layer.flipV ? offCanvas.height : 0);
            offCtx.scale(layer.flipH ? -1 : 1, layer.flipV ? -1 : 1);
        }

        const imgAspect = layer.img.width / layer.img.height;
        const boxAspect = offCanvas.width / offCanvas.height;
        let sWidth = layer.img.width;
        let sHeight = layer.img.height;

        if (imgAspect > boxAspect) {
            sWidth = layer.img.height * boxAspect;
        } else {
            sHeight = layer.img.width / boxAspect;
        }

        const zoom = Math.max(0.2, layer.cropZoom || 1.0);
        sWidth /= zoom;
        sHeight /= zoom;

        const maxPanX = (layer.img.width - sWidth) / 2;
        const maxPanY = (layer.img.height - sHeight) / 2;
        const panX = ((layer.cropPanX || 0) / 100) * maxPanX;
        const panY = ((layer.cropPanY || 0) / 100) * maxPanY;

        const sx = Math.max(0, Math.min(layer.img.width - sWidth, (layer.img.width - sWidth) / 2 + panX));
        const sy = Math.max(0, Math.min(layer.img.height - sHeight, (layer.img.height - sHeight) / 2 + panY));

        offCtx.drawImage(layer.img, sx, sy, sWidth, sHeight, 0, 0, offCanvas.width, offCanvas.height);
        offCtx.restore();

        // Apply Vignette
        if (layer.vignette > 0) {
            applyVignetteToCanvas(offCtx, offCanvas.width, offCanvas.height, layer.vignette);
        }

        // Apply Mask
        if (layer.maskType && layer.maskType !== 'none') {
            applyMaskToCanvas(offCtx, layer, offCanvas.width, offCanvas.height);
        }

        // Draw offscreen canvas onto main wallpaper canvas
        ctx.save();
        ctx.translate(layer.x, layer.y);
        ctx.rotate((layer.rotation || 0) * Math.PI / 180);
        ctx.globalAlpha = (layer.opacity !== undefined ? layer.opacity : 100) / 100;
        ctx.globalCompositeOperation = layer.blendMode || 'source-over';

        if (layer.shadow && layer.shadow !== 'none') {
            applyShadowToContext(ctx, layer.shadow);
        }

        ctx.drawImage(offCanvas, -layer.width / 2, -layer.height / 2, layer.width, layer.height);

        // Draw Border
        if (layer.borderWidth > 0) {
            ctx.shadowColor = 'transparent';
            ctx.strokeStyle = layer.borderColor || '#ffffff';
            ctx.lineWidth = layer.borderWidth;
            if (layer.borderRadius > 0) {
                drawRoundedRectPath(ctx, -layer.width / 2, -layer.height / 2, layer.width, layer.height, layer.borderRadius);
                ctx.stroke();
            } else {
                ctx.strokeRect(-layer.width / 2, -layer.height / 2, layer.width, layer.height);
            }
        }

        ctx.restore();
    }

    function applyVignetteToCanvas(ctx, w, h, strength) {
        ctx.save();
        const rMax = Math.hypot(w / 2, h / 2);
        const grad = ctx.createRadialGradient(w / 2, h / 2, rMax * (1 - strength / 100), w / 2, h / 2, rMax);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, `rgba(0,0,0,${Math.min(0.9, strength / 100)})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
    }

    function applyMaskToCanvas(ctx, layer, w, h) {
        ctx.save();
        ctx.globalCompositeOperation = layer.maskInvert ? 'destination-out' : 'destination-in';

        const feather = (layer.maskFeather !== undefined ? layer.maskFeather : 30) / 100;

        if (layer.maskType === 'fade-right') {
            const grad = ctx.createLinearGradient(0, 0, w, 0);
            grad.addColorStop(0, 'rgba(0,0,0,1)');
            grad.addColorStop(Math.max(0, 1 - feather), 'rgba(0,0,0,1)');
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);
        } else if (layer.maskType === 'fade-left') {
            const grad = ctx.createLinearGradient(0, 0, w, 0);
            grad.addColorStop(0, 'rgba(0,0,0,0)');
            grad.addColorStop(feather, 'rgba(0,0,0,1)');
            grad.addColorStop(1, 'rgba(0,0,0,1)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);
        } else if (layer.maskType === 'fade-both') {
            const grad = ctx.createLinearGradient(0, 0, w, 0);
            grad.addColorStop(0, 'rgba(0,0,0,0)');
            grad.addColorStop(feather, 'rgba(0,0,0,1)');
            grad.addColorStop(Math.max(feather, 1 - feather), 'rgba(0,0,0,1)');
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);
        } else if (layer.maskType === 'fade-top') {
            const grad = ctx.createLinearGradient(0, 0, 0, h);
            grad.addColorStop(0, 'rgba(0,0,0,0)');
            grad.addColorStop(feather, 'rgba(0,0,0,1)');
            grad.addColorStop(1, 'rgba(0,0,0,1)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);
        } else if (layer.maskType === 'fade-bottom') {
            const grad = ctx.createLinearGradient(0, 0, 0, h);
            grad.addColorStop(0, 'rgba(0,0,0,1)');
            grad.addColorStop(Math.max(0, 1 - feather), 'rgba(0,0,0,1)');
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);
        } else if (layer.maskType === 'radial-fade') {
            const cx = w / 2, cy = h / 2;
            const rMax = Math.hypot(cx, cy);
            const rMin = Math.max(1, rMax * (1 - feather));
            const grad = ctx.createRadialGradient(cx, cy, rMin, cx, cy, rMax);
            grad.addColorStop(0, 'rgba(0,0,0,1)');
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);
        } else if (layer.maskType === 'rounded-rect') {
            const r = layer.maskRadius !== undefined ? layer.maskRadius : 16;
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            drawRoundedRectPath(ctx, 0, 0, w, h, r);
            ctx.fill();
        } else if (layer.maskType === 'circle') {
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
            ctx.fill();
        } else if (layer.maskType === 'hexagon') {
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            drawHexagonPath(ctx, w, h);
            ctx.fill();
        } else if (layer.maskType === 'diagonal-slash') {
            ctx.fillStyle = '#000000';
            const offset = w * 0.25;
            ctx.beginPath();
            ctx.moveTo(offset, 0);
            ctx.lineTo(w, 0);
            ctx.lineTo(w - offset, h);
            ctx.lineTo(0, h);
            ctx.closePath();
            ctx.fill();
        } else if (layer.maskType === 'diamond') {
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.moveTo(w / 2, 0);
            ctx.lineTo(w, h / 2);
            ctx.lineTo(w / 2, h);
            ctx.lineTo(0, h / 2);
            ctx.closePath();
            ctx.fill();
        } else if (layer.maskType === 'star') {
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            drawStarPath(ctx, w / 2, h / 2, 5, Math.min(w, h) / 2, Math.min(w, h) / 4);
            ctx.fill();
        } else if (layer.maskType === 'heart') {
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            drawHeartPath(ctx, w, h);
            ctx.fill();
        }

        ctx.restore();
    }

    function applyShadowToContext(ctx, shadowType) {
        if (shadowType === 'soft') {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
            ctx.shadowBlur = 25;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 12;
        } else if (shadowType === 'deep') {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
            ctx.shadowBlur = 45;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 20;
        } else if (shadowType === 'neon-cyan') {
            ctx.shadowColor = 'rgba(6, 182, 212, 0.6)';
            ctx.shadowBlur = 30;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        } else if (shadowType === 'neon-purple') {
            ctx.shadowColor = 'rgba(168, 85, 247, 0.6)';
            ctx.shadowBlur = 30;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        }
    }

    // --- Interactive Overlay & Handles ---
    function drawSelectionOverlay(ctx, layer, isPrimary, isGroupSelected) {
        ctx.save();
        ctx.translate(layer.x, layer.y);
        ctx.rotate((layer.rotation || 0) * Math.PI / 180);

        const w = layer.width;
        const h = layer.height;

        // Bounding box dashed stroke
        ctx.strokeStyle = isPrimary ? '#6366f1' : '#818cf8';
        ctx.lineWidth = Math.max(2, (isPrimary ? 2 : 1.5) / state.zoom);
        ctx.setLineDash([6 / state.zoom, 4 / state.zoom]);
        ctx.strokeRect(-w / 2, -h / 2, w, h);
        ctx.setLineDash([]);

        // If multiple layers selected, show small badge in corner
        if (isGroupSelected) {
            ctx.fillStyle = '#6366f1';
            ctx.beginPath();
            ctx.arc(-w / 2 + 10 / state.zoom, -h / 2 + 10 / state.zoom, 6 / state.zoom, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5 / state.zoom;
            ctx.stroke();
        }

        // Only draw interactive handles for the primary active layer
        if (isPrimary) {
            // Rotation stalk & handle
            const rotDist = 30 / state.zoom;
            ctx.beginPath();
            ctx.moveTo(0, -h / 2);
            ctx.lineTo(0, -h / 2 - rotDist);
            ctx.strokeStyle = '#6366f1';
            ctx.stroke();

            ctx.fillStyle = '#6366f1';
            ctx.beginPath();
            ctx.arc(0, -h / 2 - rotDist, 6 / state.zoom, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2 / state.zoom;
            ctx.stroke();

            // 8 Resize Handles
            const hs = 8 / state.zoom;
            const handles = getHandleCoordinates(w, h);
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#6366f1';
            ctx.lineWidth = 2 / state.zoom;

            for (const key in handles) {
                const pt = handles[key];
                ctx.fillRect(pt.x - hs / 2, pt.y - hs / 2, hs, hs);
                ctx.strokeRect(pt.x - hs / 2, pt.y - hs / 2, hs, hs);
            }

            // Crop Mode Grid
            if (state.isCropMode) {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.lineWidth = 1 / state.zoom;
                ctx.beginPath();
                ctx.moveTo(-w / 6, -h / 2); ctx.lineTo(-w / 6, h / 2);
                ctx.moveTo(w / 6, -h / 2); ctx.lineTo(w / 6, h / 2);
                ctx.moveTo(-w / 2, -h / 6); ctx.lineTo(w / 2, -h / 6);
                ctx.moveTo(-w / 2, h / 6); ctx.lineTo(w / 2, h / 6);
                ctx.stroke();

                ctx.font = `bold ${Math.round(14 / state.zoom)}px Inter, sans-serif`;
                ctx.fillStyle = '#6366f1';
                ctx.textAlign = 'center';
                ctx.fillText('CROP MODE (Drag to pan, slider to zoom)', 0, h / 2 + 25 / state.zoom);
            }
        }

        ctx.restore();
    }

    function getHandleCoordinates(w, h) {
        return {
            nw: { x: -w / 2, y: -h / 2 },
            n:  { x: 0,      y: -h / 2 },
            ne: { x: w / 2,  y: -h / 2 },
            e:  { x: w / 2,  y: 0 },
            se: { x: w / 2,  y: h / 2 },
            s:  { x: 0,      y: h / 2 },
            sw: { x: -w / 2, y: h / 2 },
            w:  { x: -w / 2, y: 0 }
        };
    }

    function drawSnapGuides(ctx) {
        if (!state.snapGuides.x && !state.snapGuides.y) return;
        ctx.save();
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 1.5 / state.zoom;
        ctx.setLineDash([4 / state.zoom, 4 / state.zoom]);

        if (state.snapGuides.x !== null) {
            ctx.beginPath();
            ctx.moveTo(state.snapGuides.x, 0);
            ctx.lineTo(state.snapGuides.x, state.canvasHeight);
            ctx.stroke();
        }
        if (state.snapGuides.y !== null) {
            ctx.beginPath();
            ctx.moveTo(0, state.snapGuides.y);
            ctx.lineTo(state.canvasWidth, state.snapGuides.y);
            ctx.stroke();
        }
        ctx.restore();
    }

    // --- Shape Helper Paths ---
    function drawRoundedRectPath(ctx, x, y, w, h, r) {
        const radius = Math.min(r, Math.min(w, h) / 2);
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + w - radius, y);
        ctx.arcTo(x + w, y, x + w, y + radius, radius);
        ctx.lineTo(x + w, y + h - radius);
        ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
        ctx.lineTo(x + radius, y + h);
        ctx.arcTo(x, y + h, x, y + h - radius, radius);
        ctx.lineTo(x, y + radius);
        ctx.arcTo(x, y, x + radius, y, radius);
        ctx.closePath();
    }

    function drawHexagonPath(ctx, w, h) {
        const points = [
            { x: w * 0.25, y: 0 },
            { x: w * 0.75, y: 0 },
            { x: w, y: h * 0.5 },
            { x: w * 0.75, y: h },
            { x: w * 0.25, y: h },
            { x: 0, y: h * 0.5 }
        ];
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
        ctx.closePath();
    }

    function drawStarPath(ctx, cx, cy, spikes, outerRadius, innerRadius) {
        let rot = Math.PI / 2 * 3;
        let x = cx;
        let y = cy;
        const step = Math.PI / spikes;

        ctx.beginPath();
        ctx.moveTo(cx, cy - outerRadius);
        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;

            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
        }
        ctx.lineTo(cx, cy - outerRadius);
        ctx.closePath();
    }

    function drawHeartPath(ctx, w, h) {
        const x = w / 2;
        const y = h * 0.35;
        const topCurveHeight = h * 0.3;
        ctx.beginPath();
        ctx.moveTo(x, y + topCurveHeight);
        ctx.bezierCurveTo(x, y, x - w / 2, y, x - w / 2, y + topCurveHeight / 2);
        ctx.bezierCurveTo(x - w / 2, y + (h + topCurveHeight) / 2, x, y + (h + topCurveHeight) / 2, x, h * 0.95);
        ctx.bezierCurveTo(x, y + (h + topCurveHeight) / 2, x + w / 2, y + (h + topCurveHeight) / 2, x + w / 2, y + topCurveHeight / 2);
        ctx.bezierCurveTo(x + w / 2, y, x, y, x, y + topCurveHeight);
        ctx.closePath();
    }

    // --- Interactive Mouse Handlers ---
    function getCanvasCoords(e) {
        const rect = dom.canvas.getBoundingClientRect();
        const clientX = e.clientX;
        const clientY = e.clientY;
        const x = (clientX - rect.left) / state.zoom;
        const y = (clientY - rect.top) / state.zoom;
        return { x, y };
    }

    function hitTest(x, y) {
        // Test in reverse order (top layer first)
        for (let i = state.layers.length - 1; i >= 0; i--) {
            const layer = state.layers[i];
            if (!layer.visible || layer.locked) continue;
            if (isPointInsideRotatedRect(x, y, layer.x, layer.y, layer.width, layer.height, layer.rotation || 0)) {
                return layer;
            }
        }
        return null;
    }

    function isPointInsideRotatedRect(px, py, cx, cy, w, h, rotDeg) {
        const rad = -rotDeg * Math.PI / 180;
        const dx = px - cx;
        const dy = py - cy;
        const rx = dx * Math.cos(rad) - dy * Math.sin(rad);
        const ry = dx * Math.sin(rad) + dy * Math.cos(rad);
        return Math.abs(rx) <= w / 2 && Math.abs(ry) <= h / 2;
    }

    function getHandleAtPoint(layer, px, py) {
        const rad = -(layer.rotation || 0) * Math.PI / 180;
        const dx = px - layer.x;
        const dy = py - layer.y;
        const rx = dx * Math.cos(rad) - dy * Math.sin(rad);
        const ry = dx * Math.sin(rad) + dy * Math.cos(rad);

        const tol = 12 / state.zoom;
        const rotDist = 30 / state.zoom;

        if (Math.hypot(rx - 0, ry - (-layer.height / 2 - rotDist)) <= tol) {
            return 'rot';
        }

        const handles = getHandleCoordinates(layer.width, layer.height);
        for (const key in handles) {
            const hPt = handles[key];
            if (Math.hypot(rx - hPt.x, ry - hPt.y) <= tol) {
                return key;
            }
        }
        return null;
    }

    function onCanvasMouseDown(e) {
        const p = getCanvasCoords(e);
        const active = getSelectedLayer();

        if (active) {
            const handle = getHandleAtPoint(active, p.x, p.y);
            if (handle) {
                state.currentAction = handle === 'rot' ? 'rotating' : 'resizing';
                state.activeHandle = handle;
                state.dragStart = { x: p.x, y: p.y };
                state.layerStart = { ...active };
                return;
            }
        }

        // Hit test layers
        const clickedLayer = hitTest(p.x, p.y);
        if (clickedLayer) {
            if (e.shiftKey || e.ctrlKey || e.metaKey) {
                // Multi-select toggle
                selectLayer(clickedLayer.id, true);
            } else if (!state.selectedIds.includes(clickedLayer.id)) {
                // Single select
                selectLayer(clickedLayer.id, false);
            }

            if (state.isCropMode) {
                state.currentAction = 'crop-panning';
                state.dragStart = { x: p.x, y: p.y };
                state.cropStart = { panX: clickedLayer.cropPanX || 0, panY: clickedLayer.cropPanY || 0 };
            } else {
                state.currentAction = 'dragging';
                state.dragStart = { x: p.x, y: p.y };
                state.layerStart = { ...clickedLayer };
                // Record initial positions of all selected layers for group movement
                state.dragLayerStarts = new Map();
                getSelectedLayers().forEach(l => {
                    state.dragLayerStarts.set(l.id, { x: l.x, y: l.y });
                });
            }
        } else {
            if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
                selectLayer(null, false);
                if (state.isCropMode) toggleCropMode(false);
            }
        }
    }

    function onCanvasMouseMove(e) {
        if (!state.currentAction) {
            const p = getCanvasCoords(e);
            const active = getSelectedLayer();
            if (active) {
                const handle = getHandleAtPoint(active, p.x, p.y);
                if (handle === 'rot') { dom.canvas.style.cursor = 'grab'; return; }
                if (handle) { dom.canvas.style.cursor = `${handle}-resize`; return; }
            }
            const hit = hitTest(p.x, p.y);
            dom.canvas.style.cursor = hit ? 'move' : 'default';
            return;
        }

        const p = getCanvasCoords(e);
        const layer = getSelectedLayer();
        if (!layer) return;

        if (state.currentAction === 'dragging') {
            const dx = p.x - state.dragStart.x;
            const dy = p.y - state.dragStart.y;

            // Move ALL selected layers simultaneously!
            const selected = getSelectedLayers();
            selected.forEach(l => {
                const start = state.dragLayerStarts ? state.dragLayerStarts.get(l.id) : null;
                if (start) {
                    l.x = start.x + dx;
                    l.y = start.y + dy;
                }
            });

            // Magnetic snap check on primary layer
            if (layer) checkSnapping(layer);

            render();
        } else if (state.currentAction === 'rotating') {
            const rad = Math.atan2(p.y - layer.y, p.x - layer.x);
            let deg = (rad * 180 / Math.PI) + 90;
            if (e.shiftKey) deg = Math.round(deg / 45) * 45;
            const deltaRot = deg - (layer.rotation || 0);

            // Apply rotation to all selected layers
            const selected = getSelectedLayers();
            selected.forEach(l => {
                l.rotation = (l.rotation || 0) + deltaRot;
            });
            render();
        } else if (state.currentAction === 'resizing') {
            handleResizeHandleMove(layer, p, e.shiftKey);
            render();
        } else if (state.currentAction === 'crop-panning') {
            const dx = p.x - state.dragStart.x;
            const dy = p.y - state.dragStart.y;
            layer.cropPanX = Math.max(-50, Math.min(50, state.cropStart.panX + (dx / layer.width) * 100));
            layer.cropPanY = Math.max(-50, Math.min(50, state.cropStart.panY + (dy / layer.height) * 100));
            if (dom.cropPanXInput) dom.cropPanXInput.value = layer.cropPanX;
            if (dom.cropPanYInput) dom.cropPanYInput.value = layer.cropPanY;
            render();
        }
    }

    function onCanvasMouseUp() {
        if (state.currentAction) {
            pushHistory('Transform Layer(s)');
            state.currentAction = null;
            state.activeHandle = null;
            state.dragLayerStarts = new Map();
            state.snapGuides = { x: null, y: null };
            render();
        }
    }

    function checkSnapping(layer) {
        const threshold = 15;
        state.snapGuides = { x: null, y: null };

        const centerX = state.canvasWidth / 2;
        if (Math.abs(layer.x - centerX) < threshold) {
            layer.x = centerX;
            state.snapGuides.x = centerX;
        }

        const centerY = state.canvasHeight / 2;
        if (Math.abs(layer.y - centerY) < threshold) {
            layer.y = centerY;
            state.snapGuides.y = centerY;
        }
    }

    function handleResizeHandleMove(layer, p, maintainAspect) {
        const handle = state.activeHandle;
        const rad = -(state.layerStart.rotation || 0) * Math.PI / 180;
        const dx = p.x - state.dragStart.x;
        const dy = p.y - state.dragStart.y;
        const localDx = dx * Math.cos(rad) - dy * Math.sin(rad);
        const localDy = dx * Math.sin(rad) + dy * Math.cos(rad);

        const origW = state.layerStart.width;
        const origH = state.layerStart.height;
        const aspect = origW / origH;

        let newW = origW;
        let newH = origH;

        if (handle === 'e') newW = origW + localDx * 2;
        else if (handle === 'w') newW = origW - localDx * 2;
        else if (handle === 's') newH = origH + localDy * 2;
        else if (handle === 'n') newH = origH - localDy * 2;
        else if (handle === 'se') {
            newW = origW + localDx * 2;
            newH = origH + localDy * 2;
            if (maintainAspect) newH = newW / aspect;
        } else if (handle === 'sw') {
            newW = origW - localDx * 2;
            newH = origH + localDy * 2;
            if (maintainAspect) newH = newW / aspect;
        } else if (handle === 'ne') {
            newW = origW + localDx * 2;
            newH = origH - localDy * 2;
            if (maintainAspect) newH = newW / aspect;
        } else if (handle === 'nw') {
            newW = origW - localDx * 2;
            newH = origH - localDy * 2;
            if (maintainAspect) newH = newW / aspect;
        }

        const scaleRatio = Math.max(50, newW) / origW;

        // Apply scale to primary layer and any other selected layers
        layer.width = Math.max(50, newW);
        layer.height = Math.max(50, newH);

        const selected = getSelectedLayers();
        if (selected.length > 1) {
            selected.forEach(l => {
                if (l.id !== layer.id) {
                    l.width = Math.max(50, l.width * scaleRatio);
                    l.height = Math.max(50, l.height * scaleRatio);
                }
            });
        }
    }

    function toggleCropMode(force) {
        const layer = getSelectedLayer();
        if (!layer) return;
        state.isCropMode = force !== undefined ? force : !state.isCropMode;
        if (dom.toggleCropModeBtn) {
            dom.toggleCropModeBtn.textContent = state.isCropMode ? 'Done Cropping' : 'Crop Image';
            dom.toggleCropModeBtn.classList.toggle('bg-emerald-600', state.isCropMode);
            dom.toggleCropModeBtn.classList.toggle('hover:bg-emerald-700', state.isCropMode);
        }
        render();
    }

    // --- Multi-Selection & Layer Operations ---
    function selectLayer(id, isMulti = false) {
        if (id === null) {
            state.selectedIds = [];
            state.selectedId = null;
        } else if (isMulti) {
            if (state.selectedIds.includes(id)) {
                state.selectedIds = state.selectedIds.filter(x => x !== id);
                state.selectedId = state.selectedIds[state.selectedIds.length - 1] || null;
            } else {
                state.selectedIds.push(id);
                state.selectedId = id;
            }
        } else {
            state.selectedIds = [id];
            state.selectedId = id;
        }

        updateLayersListUI();
        updateSelectedPropertiesUI();
        render();
    }

    function selectAllLayers() {
        state.selectedIds = state.layers.map(l => l.id);
        state.selectedId = state.layers.length > 0 ? state.layers[state.layers.length - 1].id : null;
        updateLayersListUI();
        updateSelectedPropertiesUI();
        render();
        showToast(`All ${state.layers.length} layers selected! Universal changes enabled.`);
    }

    function deselectAllLayers() {
        state.selectedIds = [];
        state.selectedId = null;
        if (state.isCropMode) toggleCropMode(false);
        updateLayersListUI();
        updateSelectedPropertiesUI();
        render();
    }

    function getSelectedLayers() {
        return state.layers.filter(l => state.selectedIds.includes(l.id));
    }

    function getSelectedLayer() {
        if (!state.selectedId && state.selectedIds.length > 0) {
            state.selectedId = state.selectedIds[0];
        }
        return state.layers.find(l => l.id === state.selectedId) || null;
    }

    function deleteSelectedLayers() {
        if (state.selectedIds.length === 0) return;
        const count = state.selectedIds.length;
        state.layers = state.layers.filter(l => !state.selectedIds.includes(l.id));
        state.selectedIds = [];
        state.selectedId = state.layers.length > 0 ? state.layers[state.layers.length - 1].id : null;
        if (state.selectedId) state.selectedIds = [state.selectedId];

        updateLayersListUI();
        updateSelectedPropertiesUI();
        render();
        pushHistory('Delete ' + count + ' Layer(s)');
        showToast(`Deleted ${count} layer${count > 1 ? 's' : ''}`);
    }

    function duplicateSelectedLayers() {
        if (state.selectedIds.length === 0) return;
        const selected = getSelectedLayers();
        const newSelectedIds = [];

        selected.forEach((cur, idx) => {
            const copy = {
                ...cur,
                id: 'layer_' + Date.now() + '_' + idx + '_' + Math.random().toString(36).substr(2, 5),
                name: cur.name + ' (Copy)',
                x: cur.x + 40,
                y: cur.y + 40
            };
            state.layers.push(copy);
            newSelectedIds.push(copy.id);
        });

        state.selectedIds = newSelectedIds;
        state.selectedId = newSelectedIds[newSelectedIds.length - 1] || null;
        updateLayersListUI();
        updateSelectedPropertiesUI();
        render();
        pushHistory('Duplicate ' + selected.length + ' Layer(s)');
        showToast(`Duplicated ${selected.length} layer${selected.length > 1 ? 's' : ''}`);
    }

    function moveSelectedLayer(direction) {
        if (state.selectedIds.length === 0) return;
        const idx = state.layers.findIndex(l => l.id === state.selectedId);
        if (idx === -1) return;
        const newIdx = idx + direction;
        if (newIdx >= 0 && newIdx < state.layers.length) {
            const temp = state.layers[idx];
            state.layers[idx] = state.layers[newIdx];
            state.layers[newIdx] = temp;
            updateLayersListUI();
            render();
            pushHistory('Reorder Layer');
        }
    }

    function mergeSelectedLayers() {
        const selected = getSelectedLayers();
        if (selected.length < 2) {
            showToast('Select at least 2 layers to merge!');
            return;
        }

        // Bounding box of selected layers
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        selected.forEach(l => {
            minX = Math.min(minX, l.x - l.width / 2);
            minY = Math.min(minY, l.y - l.height / 2);
            maxX = Math.max(maxX, l.x + l.width / 2);
            maxY = Math.max(maxY, l.y + l.height / 2);
        });

        const mergedW = Math.max(10, Math.round(maxX - minX));
        const mergedH = Math.max(10, Math.round(maxY - minY));
        const mergedCenterX = minX + mergedW / 2;
        const mergedCenterY = minY + mergedH / 2;

        const offCanvas = document.createElement('canvas');
        offCanvas.width = mergedW;
        offCanvas.height = mergedH;
        const offCtx = offCanvas.getContext('2d');

        // Draw selected layers in order
        selected.forEach(layer => {
            if (!layer.visible) return;
            offCtx.save();
            offCtx.translate(layer.x - minX, layer.y - minY);
            // Draw layer onto offscreen relative to center
            const origX = layer.x;
            const origY = layer.y;
            layer.x = 0;
            layer.y = 0;
            drawLayer(offCtx, layer);
            layer.x = origX;
            layer.y = origY;
            offCtx.restore();
        });

        const mergedImg = new Image();
        mergedImg.onload = () => {
            const mergedLayer = {
                id: 'layer_merged_' + Date.now(),
                name: 'Merged (' + selected.length + ' photos)',
                img: mergedImg,
                visible: true,
                locked: false,
                x: mergedCenterX,
                y: mergedCenterY,
                width: mergedW,
                height: mergedH,
                rotation: 0,
                cropZoom: 1.0,
                cropPanX: 0,
                cropPanY: 0,
                flipH: false,
                flipV: false,
                maskType: 'none',
                maskFeather: 30,
                maskRadius: 16,
                maskInvert: false,
                brightness: 0,
                contrast: 0,
                saturation: 0,
                warmth: 0,
                hue: 0,
                blur: 0,
                vignette: 0,
                filterPreset: 'none',
                opacity: 100,
                blendMode: 'source-over',
                borderRadius: 0,
                borderWidth: 0,
                borderColor: '#ffffff',
                shadow: 'none'
            };

            const firstIdx = state.layers.findIndex(l => state.selectedIds.includes(l.id));
            state.layers = state.layers.filter(l => !state.selectedIds.includes(l.id));
            state.layers.splice(firstIdx >= 0 ? firstIdx : state.layers.length, 0, mergedLayer);

            selectLayer(mergedLayer.id, false);
            render();
            pushHistory('Merge ' + selected.length + ' Selected Layers');
            showToast(`Merged ${selected.length} layers into one!`);
        };
        mergedImg.src = offCanvas.toDataURL('image/png');
    }

    function mergeAllLayers() {
        if (state.layers.length < 2) return;
        const offCanvas = document.createElement('canvas');
        offCanvas.width = state.canvasWidth;
        offCanvas.height = state.canvasHeight;
        const offCtx = offCanvas.getContext('2d');

        state.layers.forEach(layer => {
            if (layer.visible) drawLayer(offCtx, layer);
        });

        const mergedImg = new Image();
        mergedImg.onload = () => {
            const mergedLayer = {
                id: 'layer_merged_' + Date.now(),
                name: 'Merged Composition',
                img: mergedImg,
                visible: true,
                locked: false,
                x: state.canvasWidth / 2,
                y: state.canvasHeight / 2,
                width: state.canvasWidth,
                height: state.canvasHeight,
                rotation: 0,
                cropZoom: 1.0,
                cropPanX: 0,
                cropPanY: 0,
                flipH: false,
                flipV: false,
                maskType: 'none',
                maskFeather: 30,
                maskRadius: 16,
                maskInvert: false,
                brightness: 0,
                contrast: 0,
                saturation: 0,
                warmth: 0,
                hue: 0,
                blur: 0,
                vignette: 0,
                filterPreset: 'none',
                opacity: 100,
                blendMode: 'source-over',
                borderRadius: 0,
                borderWidth: 0,
                borderColor: '#ffffff',
                shadow: 'none'
            };
            state.layers = [mergedLayer];
            selectLayer(mergedLayer.id, false);
            render();
            pushHistory('Merge All Layers');
            showToast('All layers merged into a single image!');
        };
        mergedImg.src = offCanvas.toDataURL('image/png');
    }

    function alignSelected(type) {
        const selected = getSelectedLayers();
        if (selected.length === 0) return;

        if (selected.length === 1) {
            // Align relative to canvas
            const layer = selected[0];
            if (type === 'left') layer.x = layer.width / 2 + state.layoutMargin;
            else if (type === 'center-h') layer.x = state.canvasWidth / 2;
            else if (type === 'right') layer.x = state.canvasWidth - layer.width / 2 - state.layoutMargin;
            else if (type === 'top') layer.y = layer.height / 2 + state.layoutMargin;
            else if (type === 'center-v') layer.y = state.canvasHeight / 2;
            else if (type === 'bottom') layer.y = state.canvasHeight - layer.height / 2 - state.layoutMargin;
        } else {
            // Multi-selection: Align selected layers relative to each other!
            if (type === 'left') {
                const targetLeft = Math.min(...selected.map(l => l.x - l.width / 2));
                selected.forEach(l => l.x = targetLeft + l.width / 2);
            } else if (type === 'center-h') {
                const avgCenterX = selected.reduce((sum, l) => sum + l.x, 0) / selected.length;
                selected.forEach(l => l.x = avgCenterX);
            } else if (type === 'right') {
                const targetRight = Math.max(...selected.map(l => l.x + l.width / 2));
                selected.forEach(l => l.x = targetRight - l.width / 2);
            } else if (type === 'top') {
                const targetTop = Math.min(...selected.map(l => l.y - l.height / 2));
                selected.forEach(l => l.y = targetTop + l.height / 2);
            } else if (type === 'center-v') {
                const avgCenterY = selected.reduce((sum, l) => sum + l.y, 0) / selected.length;
                selected.forEach(l => l.y = avgCenterY);
            } else if (type === 'bottom') {
                const targetBottom = Math.max(...selected.map(l => l.y + l.height / 2));
                selected.forEach(l => l.y = targetBottom - l.height / 2);
            }
        }

        render();
        pushHistory('Align Layer(s)');
    }

    function distributeLayersHorizontally() {
        const selected = getSelectedLayers().length >= 2 ? getSelectedLayers() : state.layers;
        const count = selected.length;
        if (count < 2) return;

        // Sort by X coordinate
        const sorted = [...selected].sort((a, b) => a.x - b.x);
        const minX = sorted[0].x;
        const maxX = sorted[count - 1].x;
        const span = maxX - minX;

        if (span > 0) {
            const step = span / (count - 1);
            sorted.forEach((layer, i) => {
                layer.x = minX + step * i;
            });
        } else {
            const totalW = state.canvasWidth - state.layoutMargin * 2;
            const step = totalW / (count - 1);
            sorted.forEach((layer, i) => {
                layer.x = state.layoutMargin + step * i;
            });
        }

        render();
        pushHistory('Distribute Horizontally');
    }

    // --- Layout Presets Engine ---
    function applyLayoutPreset(presetName) {
        const count = state.layers.length;
        if (count === 0) {
            showToast('Please add at least 1 image first!');
            return;
        }

        const margin = state.layoutMargin;
        const gap = state.layoutGap;
        const canvasW = state.canvasWidth;
        const canvasH = state.canvasHeight;
        const usableW = canvasW - margin * 2;
        const usableH = canvasH - margin * 2;

        if (presetName === 'panoramic') {
            const overlapRatio = 0.20;
            const singleW = usableW / (count - (count - 1) * overlapRatio);
            const step = singleW * (1 - overlapRatio);

            state.layers.forEach((layer, idx) => {
                layer.x = margin + singleW / 2 + step * idx;
                layer.y = canvasH / 2;
                layer.width = singleW;
                layer.height = usableH;
                layer.rotation = 0;
                layer.borderRadius = 0;
                layer.borderWidth = 0;
                layer.shadow = 'none';

                if (count === 1) {
                    layer.maskType = 'none';
                } else if (idx === 0) {
                    layer.maskType = 'fade-right';
                    layer.maskFeather = 25;
                } else if (idx === count - 1) {
                    layer.maskType = 'fade-left';
                    layer.maskFeather = 25;
                } else {
                    layer.maskType = 'fade-both';
                    layer.maskFeather = 25;
                }
            });
            showToast('Panoramic Blend layout applied!');
        } else if (presetName === 'split-2') {
            const colW = (usableW - gap) / 2;
            state.layers.forEach((layer, idx) => {
                if (idx < 2) {
                    layer.x = margin + colW / 2 + (colW + gap) * idx;
                    layer.y = canvasH / 2;
                    layer.width = colW;
                    layer.height = usableH;
                    layer.rotation = 0;
                    layer.maskType = 'rounded-rect';
                    layer.maskRadius = state.layoutRadius;
                    layer.borderWidth = state.layoutBorderWidth;
                    layer.borderColor = state.layoutBorderColor;
                    layer.shadow = state.layoutShadow;
                }
            });
            showToast('2-Panel Split layout applied!');
        } else if (presetName === 'triptych') {
            const colW = (usableW - gap * 2) / 3;
            state.layers.forEach((layer, idx) => {
                if (idx < 3) {
                    layer.x = margin + colW / 2 + (colW + gap) * idx;
                    layer.y = canvasH / 2;
                    layer.width = colW;
                    layer.height = usableH;
                    layer.rotation = 0;
                    layer.maskType = 'rounded-rect';
                    layer.maskRadius = state.layoutRadius;
                    layer.borderWidth = state.layoutBorderWidth;
                    layer.borderColor = state.layoutBorderColor;
                    layer.shadow = state.layoutShadow;
                }
            });
            showToast('3-Panel Triptych layout applied!');
        } else if (presetName === 'hero-3') {
            const flankW = (usableW - gap * 2) * 0.25;
            const heroW = (usableW - gap * 2) * 0.50;
            state.layers.forEach((layer, idx) => {
                if (idx === 0) {
                    layer.x = margin + flankW / 2;
                    layer.width = flankW;
                } else if (idx === 1) {
                    layer.x = margin + flankW + gap + heroW / 2;
                    layer.width = heroW;
                } else if (idx === 2) {
                    layer.x = margin + flankW + gap + heroW + gap + flankW / 2;
                    layer.width = flankW;
                }
                layer.y = canvasH / 2;
                layer.height = usableH;
                layer.rotation = 0;
                layer.maskType = 'rounded-rect';
                layer.maskRadius = state.layoutRadius;
                layer.borderWidth = state.layoutBorderWidth;
                layer.borderColor = state.layoutBorderColor;
                layer.shadow = state.layoutShadow;
            });
            showToast('Hero Center layout applied!');
        } else if (presetName === 'quad-4') {
            const colW = (usableW - gap * 3) / 4;
            state.layers.forEach((layer, idx) => {
                if (idx < 4) {
                    layer.x = margin + colW / 2 + (colW + gap) * idx;
                    layer.y = canvasH / 2;
                    layer.width = colW;
                    layer.height = usableH;
                    layer.rotation = 0;
                    layer.maskType = 'rounded-rect';
                    layer.maskRadius = state.layoutRadius;
                    layer.borderWidth = state.layoutBorderWidth;
                    layer.borderColor = state.layoutBorderColor;
                    layer.shadow = state.layoutShadow;
                }
            });
            showToast('4-Column Quad layout applied!');
        } else if (presetName === 'grid-2x2') {
            const colW = (usableW - gap) / 2;
            const rowH = (usableH - gap) / 2;
            state.layers.forEach((layer, idx) => {
                if (idx < 4) {
                    const col = idx % 2;
                    const row = Math.floor(idx / 2);
                    layer.x = margin + colW / 2 + (colW + gap) * col;
                    layer.y = margin + rowH / 2 + (rowH + gap) * row;
                    layer.width = colW;
                    layer.height = rowH;
                    layer.rotation = 0;
                    layer.maskType = 'rounded-rect';
                    layer.maskRadius = state.layoutRadius;
                    layer.borderWidth = state.layoutBorderWidth;
                    layer.borderColor = state.layoutBorderColor;
                    layer.shadow = state.layoutShadow;
                }
            });
            showToast('2x2 Grid layout applied!');
        } else if (presetName === 'polaroid') {
            const angles = [-4, 3, -2, 5, -3];
            const itemW = Math.min(800, usableW / Math.max(2, count * 0.7));
            const itemH = itemW * 0.85;
            const step = (usableW - itemW) / Math.max(1, count - 1);

            state.layers.forEach((layer, idx) => {
                layer.x = margin + itemW / 2 + step * idx;
                layer.y = canvasH / 2 + (idx % 2 === 0 ? -20 : 20);
                layer.width = itemW;
                layer.height = itemH;
                layer.rotation = angles[idx % angles.length];
                layer.maskType = 'none';
                layer.borderWidth = 14;
                layer.borderColor = '#ffffff';
                layer.borderRadius = 6;
                layer.shadow = 'deep';
            });
            showToast('Polaroid collage layout applied!');
        }

        render();
        updateSelectedPropertiesUI();
        pushHistory('Apply ' + presetName + ' Layout');
    }

    function syncSelectedLayoutProps() {
        const selected = getSelectedLayers();
        selected.forEach(layer => {
            layer.borderRadius = state.layoutRadius;
            layer.borderWidth = state.layoutBorderWidth;
            layer.borderColor = state.layoutBorderColor;
            layer.shadow = state.layoutShadow;
        });
    }

    // --- Adjustments & Filters ---
    function applyFilterPreset(layer, preset) {
        layer.filterPreset = preset;
        if (preset === 'cyberpunk') {
            layer.brightness = 5;
            layer.contrast = 35;
            layer.saturation = 45;
            layer.warmth = -15;
            layer.hue = 330;
            layer.vignette = 25;
        } else if (preset === 'cinematic') {
            layer.brightness = 0;
            layer.contrast = 25;
            layer.saturation = 15;
            layer.warmth = 20;
            layer.hue = 0;
            layer.vignette = 35;
        } else if (preset === 'moody') {
            layer.brightness = -10;
            layer.contrast = 40;
            layer.saturation = -30;
            layer.warmth = 0;
            layer.hue = 0;
            layer.vignette = 45;
        } else if (preset === 'warm') {
            layer.brightness = 5;
            layer.contrast = 15;
            layer.saturation = 20;
            layer.warmth = 35;
            layer.hue = 0;
            layer.vignette = 15;
        } else if (preset === 'bw') {
            layer.brightness = 0;
            layer.contrast = 35;
            layer.saturation = -100;
            layer.warmth = 0;
            layer.hue = 0;
            layer.vignette = 20;
        } else if (preset === 'vintage') {
            layer.brightness = 5;
            layer.contrast = -10;
            layer.saturation = -20;
            layer.warmth = 30;
            layer.hue = 0;
            layer.vignette = 30;
        } else {
            layer.brightness = 0;
            layer.contrast = 0;
            layer.saturation = 0;
            layer.warmth = 0;
            layer.hue = 0;
            layer.blur = 0;
            layer.vignette = 0;
        }
    }

    function updateAdjustmentInputs(layer) {
        if (!layer) return;
        if (dom.filterPresetSelect) dom.filterPresetSelect.value = layer.filterPreset || 'none';
        if (dom.brightnessInput) dom.brightnessInput.value = layer.brightness || 0;
        if (dom.brightnessVal) dom.brightnessVal.textContent = (layer.brightness > 0 ? '+' : '') + (layer.brightness || 0) + '%';
        if (dom.contrastInput) dom.contrastInput.value = layer.contrast || 0;
        if (dom.contrastVal) dom.contrastVal.textContent = (layer.contrast > 0 ? '+' : '') + (layer.contrast || 0) + '%';
        if (dom.saturationInput) dom.saturationInput.value = layer.saturation || 0;
        if (dom.saturationVal) dom.saturationVal.textContent = (layer.saturation > 0 ? '+' : '') + (layer.saturation || 0) + '%';
        if (dom.warmthInput) dom.warmthInput.value = layer.warmth || 0;
        if (dom.warmthVal) dom.warmthVal.textContent = (layer.warmth > 0 ? '+' : '') + (layer.warmth || 0);
        if (dom.hueInput) dom.hueInput.value = layer.hue || 0;
        if (dom.hueVal) dom.hueVal.textContent = (layer.hue || 0) + '°';
        if (dom.blurInput) dom.blurInput.value = layer.blur || 0;
        if (dom.blurVal) dom.blurVal.textContent = (layer.blur || 0) + 'px';
        if (dom.vignetteInput) dom.vignetteInput.value = layer.vignette || 0;
        if (dom.vignetteVal) dom.vignetteVal.textContent = (layer.vignette || 0) + '%';
    }

    function updateSelectedPropertiesUI() {
        const selected = getSelectedLayers();
        const hasSelection = selected.length > 0;
        const layer = getSelectedLayer();

        // Enable / disable action buttons
        if (dom.deleteLayerBtn) dom.deleteLayerBtn.disabled = !hasSelection;
        if (dom.duplicateLayerBtn) dom.duplicateLayerBtn.disabled = !hasSelection;
        if (dom.bringForwardBtn) dom.bringForwardBtn.disabled = !hasSelection;
        if (dom.sendBackwardBtn) dom.sendBackwardBtn.disabled = !hasSelection;

        // Multi-select Indicator & Universal Edit Banner
        const count = selected.length;
        if (dom.multiSelectIndicator) {
            dom.multiSelectIndicator.classList.toggle('hidden', count === 0);
            if (dom.selectedCountLabel) dom.selectedCountLabel.textContent = count;
        }

        if (dom.multiEditBanner) {
            dom.multiEditBanner.classList.toggle('hidden', count < 2);
            if (dom.multiEditCountLabel) dom.multiEditCountLabel.textContent = `${count} layers`;
        }

        if (dom.mergeSelectedBtn) {
            dom.mergeSelectedBtn.classList.toggle('hidden', count < 2);
            dom.mergeSelectedBtn.disabled = count < 2;
        }

        if (!hasSelection || !layer) return;

        // Masking inputs
        if (dom.maskTypeSelect) dom.maskTypeSelect.value = layer.maskType || 'none';
        if (dom.maskFeatherInput) dom.maskFeatherInput.value = layer.maskFeather !== undefined ? layer.maskFeather : 30;
        if (dom.maskFeatherVal) dom.maskFeatherVal.textContent = (layer.maskFeather !== undefined ? layer.maskFeather : 30) + '%';
        if (dom.maskRadiusInput) dom.maskRadiusInput.value = layer.maskRadius !== undefined ? layer.maskRadius : 16;
        if (dom.maskRadiusVal) dom.maskRadiusVal.textContent = (layer.maskRadius !== undefined ? layer.maskRadius : 16) + 'px';
        if (dom.maskInvertCheckbox) dom.maskInvertCheckbox.checked = !!layer.maskInvert;
        if (dom.blendModeSelect) dom.blendModeSelect.value = layer.blendMode || 'source-over';
        if (dom.layerOpacityInput) dom.layerOpacityInput.value = layer.opacity !== undefined ? layer.opacity : 100;
        if (dom.layerOpacityVal) dom.layerOpacityVal.textContent = (layer.opacity !== undefined ? layer.opacity : 100) + '%';

        // Adjustments
        updateAdjustmentInputs(layer);

        // Crop & Transform
        if (dom.cropPanXInput) dom.cropPanXInput.value = layer.cropPanX || 0;
        if (dom.cropPanYInput) dom.cropPanYInput.value = layer.cropPanY || 0;
        if (dom.cropZoomInput) dom.cropZoomInput.value = layer.cropZoom || 1.0;
        if (dom.cropZoomVal) dom.cropZoomVal.textContent = Math.round((layer.cropZoom || 1.0) * 100) + '%';
    }

    function updateLayersListUI() {
        if (!dom.layersList) return;
        dom.layersList.innerHTML = '';

        if (state.layers.length === 0) {
            if (dom.noLayersMsg) dom.noLayersMsg.classList.remove('hidden');
            return;
        }
        if (dom.noLayersMsg) dom.noLayersMsg.classList.add('hidden');

        // Show layers top-to-bottom (stack order reversed for display)
        [...state.layers].reverse().forEach(layer => {
            const isSelected = state.selectedIds.includes(layer.id);
            const isPrimary = layer.id === state.selectedId;

            const item = document.createElement('div');
            item.className = `flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                isSelected
                    ? 'bg-indigo-950/70 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/30'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
            }`;

            // Checkbox for "Select Some"
            const chkBox = document.createElement('input');
            chkBox.type = 'checkbox';
            chkBox.checked = isSelected;
            chkBox.className = 'mr-2 rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer h-3.5 w-3.5 flex-shrink-0';
            chkBox.onclick = (e) => {
                e.stopPropagation();
                selectLayer(layer.id, true); // Toggle multi-selection
            };

            // Thumbnail
            const thumb = document.createElement('div');
            thumb.className = 'w-10 h-7 rounded bg-slate-900 border border-slate-700 flex-shrink-0 overflow-hidden flex items-center justify-center';
            if (layer.img) {
                const imgEl = document.createElement('img');
                imgEl.src = layer.img.src;
                imgEl.className = 'w-full h-full object-cover';
                thumb.appendChild(imgEl);
            }

            // Name
            const nameEl = document.createElement('span');
            nameEl.className = 'truncate mx-2 flex-grow font-medium flex items-center space-x-1';
            nameEl.innerHTML = `<span>${layer.name || 'Image Layer'}</span>${isPrimary && state.selectedIds.length > 1 ? '<span class="text-[9px] bg-indigo-500/30 text-indigo-300 px-1 rounded">Active</span>' : ''}`;

            // Controls (Visibility & Delete)
            const actions = document.createElement('div');
            actions.className = 'flex items-center space-x-1 flex-shrink-0';

            const visBtn = document.createElement('button');
            visBtn.className = `p-1 rounded hover:bg-slate-700 ${layer.visible ? 'text-slate-400 hover:text-white' : 'text-slate-600'}`;
            visBtn.innerHTML = layer.visible
                ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>'
                : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
            visBtn.onclick = (e) => {
                e.stopPropagation();
                layer.visible = !layer.visible;
                updateLayersListUI();
                render();
            };

            actions.appendChild(visBtn);
            item.appendChild(chkBox);
            item.appendChild(thumb);
            item.appendChild(nameEl);
            item.appendChild(actions);

            item.onclick = (e) => {
                if (e.shiftKey || e.ctrlKey || e.metaKey) {
                    selectLayer(layer.id, true);
                } else {
                    selectLayer(layer.id, false);
                }
            };
            dom.layersList.appendChild(item);
        });
    }

    // --- Loading Photos ---
    function loadUserFiles(files) {
        let loadedCount = 0;
        files.forEach((file) => {
            if (!file.type.startsWith('image/')) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    addNewImageLayer(img, file.name.replace(/\.[^/.]+$/, ''));
                    loadedCount++;
                    if (loadedCount === files.length && files.length > 1) {
                        applyLayoutPreset('panoramic');
                    }
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    function addNewImageLayer(img, name) {
        const defaultWidth = Math.min(state.canvasWidth * 0.45, 1200);
        const aspect = img.width / img.height;
        const defaultHeight = defaultWidth / aspect;

        const layer = {
            id: 'layer_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            name: name || 'Photo ' + (state.layers.length + 1),
            img: img,
            visible: true,
            locked: false,
            x: state.canvasWidth / 2 + (state.layers.length % 5) * 40 - 80,
            y: state.canvasHeight / 2 + (state.layers.length % 5) * 30 - 60,
            width: defaultWidth,
            height: defaultHeight,
            rotation: 0,
            cropZoom: 1.0,
            cropPanX: 0,
            cropPanY: 0,
            flipH: false,
            flipV: false,
            maskType: 'none',
            maskFeather: 30,
            maskRadius: 16,
            maskInvert: false,
            brightness: 0,
            contrast: 0,
            saturation: 0,
            warmth: 0,
            hue: 0,
            blur: 0,
            vignette: 0,
            filterPreset: 'none',
            opacity: 100,
            blendMode: 'source-over',
            borderRadius: 0,
            borderWidth: 0,
            borderColor: '#ffffff',
            shadow: 'none'
        };

        state.layers.push(layer);
        selectLayer(layer.id, false);
        render();
        pushHistory('Add Photo Layer');
    }

    function loadDemoImages() {
        const demos = [
            createProceduralWallpaper(1600, 1000, 'mountains', 'Sunset Mountain Range'),
            createProceduralWallpaper(1600, 1000, 'cyberpunk', 'Neo Tokyo Cyberpunk'),
            createProceduralWallpaper(1600, 1000, 'nebula', 'Deep Space Nebula')
        ];

        state.layers = [];
        let loaded = 0;
        demos.forEach(d => {
            const img = new Image();
            img.onload = () => {
                addNewImageLayer(img, d.name);
                loaded++;
                if (loaded === demos.length) {
                    applyLayoutPreset('triptych');
                    showToast('3 sample wallpaper photos loaded & arranged!');
                }
            };
            img.src = d.dataUrl;
        });
    }

    function createProceduralWallpaper(w, h, theme, name) {
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d');

        if (theme === 'mountains') {
            const sky = ctx.createLinearGradient(0, 0, 0, h);
            sky.addColorStop(0, '#0f172a');
            sky.addColorStop(0.3, '#312e81');
            sky.addColorStop(0.6, '#9333ea');
            sky.addColorStop(0.85, '#f97316');
            sky.addColorStop(1, '#fde047');
            ctx.fillStyle = sky;
            ctx.fillRect(0, 0, w, h);

            ctx.beginPath();
            ctx.arc(w * 0.5, h * 0.65, 90, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#fde047';
            ctx.shadowBlur = 40;
            ctx.fill();
            ctx.shadowBlur = 0;

            const drawRidge = (baseY, peakH, col, pts) => {
                ctx.fillStyle = col;
                ctx.beginPath();
                ctx.moveTo(0, h);
                ctx.lineTo(0, baseY);
                for (let x = 0; x <= w; x += w / pts) {
                    const noise = Math.sin(x * 0.01) * Math.cos(x * 0.005) * peakH;
                    ctx.lineTo(x, baseY + noise);
                }
                ctx.lineTo(w, h);
                ctx.closePath();
                ctx.fill();
            };

            drawRidge(h * 0.65, 80, 'rgba(88, 28, 135, 0.7)', 40);
            drawRidge(h * 0.75, 60, '#3b0764', 30);
            drawRidge(h * 0.85, 40, '#18022b', 20);
        } else if (theme === 'cyberpunk') {
            const sky = ctx.createLinearGradient(0, 0, 0, h);
            sky.addColorStop(0, '#030712');
            sky.addColorStop(0.5, '#0c1222');
            sky.addColorStop(1, '#1e112a');
            ctx.fillStyle = sky;
            ctx.fillRect(0, 0, w, h);

            ctx.fillStyle = '#090d16';
            for (let x = 0; x < w; x += 35 + Math.random() * 40) {
                const bw = 30 + Math.random() * 35;
                const bh = h * (0.3 + Math.random() * 0.5);
                ctx.fillRect(x, h - bh, bw, bh);

                const neonColors = ['#06b6d4', '#ec4899', '#a855f7', '#3b82f6'];
                ctx.fillStyle = neonColors[Math.floor(Math.random() * neonColors.length)];
                for (let wx = x + 4; wx < x + bw - 4; wx += 8) {
                    for (let wy = h - bh + 10; wy < h - 10; wy += 12) {
                        if (Math.random() > 0.4) ctx.fillRect(wx, wy, 4, 6);
                    }
                }
                ctx.fillStyle = '#090d16';
            }

            ctx.strokeStyle = '#ec4899';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, h * 0.9);
            ctx.lineTo(w, h * 0.9);
            ctx.stroke();
        } else if (theme === 'nebula') {
            ctx.fillStyle = '#030712';
            ctx.fillRect(0, 0, w, h);

            const colors = ['rgba(147, 51, 234, 0.3)', 'rgba(59, 130, 246, 0.25)', 'rgba(236, 72, 153, 0.2)'];
            colors.forEach(col => {
                for (let i = 0; i < 6; i++) {
                    const cx = Math.random() * w;
                    const cy = Math.random() * h;
                    const r = 200 + Math.random() * 300;
                    const g = ctx.createRadialGradient(cx, cy, 10, cx, cy, r);
                    g.addColorStop(0, col);
                    g.addColorStop(1, 'rgba(0,0,0,0)');
                    ctx.fillStyle = g;
                    ctx.fillRect(0, 0, w, h);
                }
            });

            ctx.fillStyle = '#ffffff';
            for (let i = 0; i < 400; i++) {
                const sx = Math.random() * w;
                const sy = Math.random() * h;
                const sr = Math.random() * 1.8;
                ctx.fillRect(sx, sy, sr, sr);
            }
        }

        return { name, dataUrl: c.toDataURL('image/png') };
    }

    // --- Export Engine ---
    async function exportWallpaper() {
        if (state.layers.length === 0) {
            showToast('Add some photos to your wallpaper first!');
            return;
        }

        const format = dom.exportFormatSelect ? dom.exportFormatSelect.value : 'image/png';
        const ext = format === 'image/jpeg' ? 'jpg' : (format === 'image/webp' ? 'webp' : 'png');
        const scale = dom.exportScaleSelect ? parseFloat(dom.exportScaleSelect.value) : 1.0;

        showToast('Rendering high-res wallpaper export...');

        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = state.canvasWidth * scale;
        exportCanvas.height = state.canvasHeight * scale;
        const eCtx = exportCanvas.getContext('2d');

        if (scale !== 1.0) eCtx.scale(scale, scale);

        drawBackground(eCtx, state.canvasWidth, state.canvasHeight);
        state.layers.forEach(layer => {
            if (layer.visible) drawLayer(eCtx, layer);
        });

        const filename = `wallpaper-${state.canvasWidth * scale}x${state.canvasHeight * scale}.${ext}`;
        const dataUrl = exportCanvas.toDataURL(format, 0.95);

        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        showToast(`Wallpaper exported: ${filename}!`);
    }

    async function copyWallpaperToClipboard() {
        if (!navigator.clipboard || !window.ClipboardItem) {
            showToast('Clipboard API not supported in this browser.');
            return;
        }

        showToast('Rendering to clipboard...');

        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = state.canvasWidth;
        exportCanvas.height = state.canvasHeight;
        const eCtx = exportCanvas.getContext('2d');

        drawBackground(eCtx, state.canvasWidth, state.canvasHeight);
        state.layers.forEach(layer => {
            if (layer.visible) drawLayer(eCtx, layer);
        });

        exportCanvas.toBlob(async (blob) => {
            try {
                await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                showToast('Wallpaper copied to clipboard! Paste anywhere (Ctrl+V).');
            } catch (err) {
                console.error(err);
                showToast('Failed to copy to clipboard.');
            }
        }, 'image/png');
    }

    // --- History State Management ---
    function pushHistory(actionName) {
        state.history = state.history.slice(0, state.historyIndex + 1);

        const snapshot = {
            action: actionName,
            canvasWidth: state.canvasWidth,
            canvasHeight: state.canvasHeight,
            presetKey: state.presetKey,
            bgType: state.bgType,
            bgColor: state.bgColor,
            bgGradientKey: state.bgGradientKey,
            selectedId: state.selectedId,
            selectedIds: [...state.selectedIds],
            layers: state.layers.map(l => ({ ...l }))
        };

        state.history.push(snapshot);
        if (state.history.length > 30) state.history.shift();
        state.historyIndex = state.history.length - 1;
        updateUndoRedoUI();
    }

    function undo() {
        if (state.historyIndex > 0) {
            state.historyIndex--;
            restoreHistoryState(state.history[state.historyIndex]);
        }
    }

    function redo() {
        if (state.historyIndex < state.history.length - 1) {
            state.historyIndex++;
            restoreHistoryState(state.history[state.historyIndex]);
        }
    }

    function restoreHistoryState(snap) {
        if (!snap) return;
        state.canvasWidth = snap.canvasWidth;
        state.canvasHeight = snap.canvasHeight;
        state.presetKey = snap.presetKey;
        state.bgType = snap.bgType;
        state.bgColor = snap.bgColor;
        state.bgGradientKey = snap.bgGradientKey;
        state.selectedId = snap.selectedId;
        state.selectedIds = snap.selectedIds ? [...snap.selectedIds] : (snap.selectedId ? [snap.selectedId] : []);
        state.layers = snap.layers.map(l => ({ ...l }));

        dom.canvas.width = state.canvasWidth;
        dom.canvas.height = state.canvasHeight;
        updatePresetUI();
        updateLayersListUI();
        updateSelectedPropertiesUI();
        render();
        updateUndoRedoUI();
    }

    function updateUndoRedoUI() {
        if (dom.undoBtn) dom.undoBtn.disabled = state.historyIndex <= 0;
        if (dom.redoBtn) dom.redoBtn.disabled = state.historyIndex >= state.history.length - 1;
    }

    function loadHistoryState() {
        pushHistory('Initial Canvas');
    }

    // --- Keyboard Navigation ---
    function onKeyDown(e) {
        const studioEl = document.getElementById('wallpaper-editor-view');
        if (!studioEl || studioEl.classList.contains('hidden')) return;

        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;

        if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
            e.preventDefault();
            selectAllLayers();
        } else if (e.key === 'Escape') {
            if (state.isCropMode) toggleCropMode(false);
            else deselectAllLayers();
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
            deleteSelectedLayers();
        } else if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
            e.preventDefault();
            if (e.shiftKey) redo();
            else undo();
        } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
            e.preventDefault();
            redo();
        } else if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
            e.preventDefault();
            duplicateSelectedLayers();
        } else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
            const selected = getSelectedLayers();
            if (selected.length > 0) {
                e.preventDefault();
                const step = e.shiftKey ? 10 : 1;
                selected.forEach(layer => {
                    if (e.key === 'ArrowLeft') layer.x -= step;
                    if (e.key === 'ArrowRight') layer.x += step;
                    if (e.key === 'ArrowUp') layer.y -= step;
                    if (e.key === 'ArrowDown') layer.y += step;
                });
                render();
            }
        }
    }

    // --- Toast Notifications ---
    function showToast(msg) {
        let toast = document.getElementById('wp-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'wp-toast';
            toast.className = 'fixed bottom-6 right-6 bg-slate-900/95 border border-slate-700 text-white px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold z-50 flex items-center space-x-2 transition-all transform translate-y-2 opacity-0 pointer-events-none backdrop-blur-md';
            document.body.appendChild(toast);
        }
        toast.innerHTML = `<svg class="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg><span>${msg}</span>`;
        toast.classList.remove('translate-y-2', 'opacity-0');
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => {
            toast.classList.add('translate-y-2', 'opacity-0');
        }, 3200);
    }

    // Public API
    window.WallpaperStudio = {
        init: init,
        render: render,
        handleResize: handleResize,
        setCanvasDimensions: setCanvasDimensions,
        applyLayoutPreset: applyLayoutPreset,
        exportWallpaper: exportWallpaper,
        selectAll: selectAllLayers,
        deselectAll: deselectAllLayers,
        selectLayer: selectLayer
    };

})(window);
