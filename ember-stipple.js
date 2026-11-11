/**
 * ============================================================================
 * EMBER STIPPLE — GENERATIVE PARTICLE BACKGROUND
 * ============================================================================
 * High-performance, GPU-accelerated generative stipple particle artwork.
 * Thousands of crisp tiny dots form layered, feather-like diagonal streams
 * sweeping from lower-left to upper-right like a celestial wing of light.
 *
 * Designed exclusively for Harsh Singh's Portfolio.
 * ============================================================================
 */

/* ═══ TUNABLE CONFIGURATION CONSTANTS (All customizable in one place) ═══ */
const EMBER_CONFIG = {
  // Particle counts per device tier
  PARTICLES_DESKTOP: 85000,
  PARTICLES_TABLET: 48000,
  PARTICLES_MOBILE: 24000,

  // Animation & Flow Dynamics
  FLOW_SPEED_PX_PER_SEC: 22.0,      // Diagonal drift speed (15 - 30 px/sec)
  TURBULENCE_AMPLITUDE: 18.0,       // Curl-noise lateral wave amplitude (px)
  TURBULENCE_FREQ: 1.8,             // Spatial frequency of stream waves
  HOTSPOT_PULSE_PERIOD_SEC: 7.2,    // Breathing cycle (6 - 8s)
  HOTSPOT_PULSE_INTENSITY: 0.12,    // Breathing amplitude (+- 12%)
  TWINKLE_SPEED: 2.2,               // Twinkle shimmer frequency
  TWINKLE_MIN_OPACITY: 0.60,        // Shimmer opacity floor (0.6 - 1.0)

  // Interactive Mouse Dynamics
  MOUSE_PARALLAX_MAX_PX: 12.0,      // Max parallax displacement (<= 12px)
  MOUSE_REPEL_RADIUS_PX: 100.0,     // Soft repel radius from cursor
  MOUSE_REPEL_FORCE_PX: 26.0,       // Max repel deflection
  MOUSE_LERP_FACTOR: 0.055,         // Damping factor for buttery smooth motion

  // Color Palette (Normalized RGB: 0.0 - 1.0)
  COLORS: {
    BG_BASE: [0.000, 0.005, 0.012],            // Deep pure obsidian (#000000 - #05070C)
    CORE_SHADOW_NAVY: [0.043, 0.106, 0.227],   // Deep navy #0B1B3A
    CORE_SHADOW_INDIGO: [0.071, 0.188, 0.420], // Indigo #12306B
    MID_COBALT: [0.118, 0.357, 1.000],         // Cobalt #1E5BFF
    MID_ELECTRIC_BLUE: [0.176, 0.549, 1.000],  // Electric Blue #2D8CFF
    HIGHLIGHT_CYAN: [0.145, 0.780, 0.910],    // Cyan #25C7E8
    HIGHLIGHT_TEAL: [0.180, 0.902, 0.816],    // Teal #2EE6D0
    HOTSPOT_AMBER: [1.000, 0.702, 0.278],     // Amber #FFB347
    HOTSPOT_GOLD: [1.000, 0.541, 0.165],      // Gold #FF8A2A
    RIM_COPPER_PINK: [0.910, 0.565, 0.541],   // Rim-light Copper-Pink #E8908A
  },

  // Composition & Spatial Focal Centers
  HOTSPOT_CENTER_DESKTOP: { x: 0.63, y: 0.42 }, // Right-of-center focal mass
  HOTSPOT_CENTER_MOBILE: { x: 0.54, y: 0.45 },  // Re-composed for portrait mobile
  HOTSPOT_RADIUS_X: 0.28,
  HOTSPOT_RADIUS_Y: 0.22,
  LEFT_DARKEN_EDGE: 0.44,                        // Protects foreground typography contrast
  FILM_GRAIN_OPACITY: 0.022,                     // Subtle cinematic grain (<= 3%)

  // Point Sizes (at 1x DPR, crisp and unblurred)
  POINT_SIZE_FAR: 1.05,
  POINT_SIZE_MID: 1.35,
  POINT_SIZE_NEAR: 1.85,
};

/**
 * EmberStippleBackground Controller Class
 */
class EmberStippleBackground {
  constructor(canvasId = 'ember-stipple-canvas', customConfig = {}) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.id = canvasId;
      this.canvas.className = 'ember-stipple-canvas';
      this.canvas.setAttribute('aria-hidden', 'true');
      document.body.prepend(this.canvas);
    }

    this.cfg = Object.assign({}, EMBER_CONFIG, customConfig);
    this.gl = null;
    this.isReducedMotion = false;
    this.isRunning = false;
    this.animationFrameId = null;
    this.startTime = performance.now();
    this.lastTime = this.startTime;

    // Viewport & DPR
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Mouse / Pointer State
    this.targetMouseX = this.width * 0.5;
    this.targetMouseY = this.height * 0.5;
    this.currentMouseX = this.targetMouseX;
    this.currentMouseY = this.targetMouseY;
    this.parallaxX = 0;
    this.parallaxY = 0;
    this.hasPointerMoved = false;

    // Bound listeners for clean unmount
    this._onResize = this.handleResize.bind(this);
    this._onPointerMove = this.handlePointerMove.bind(this);
    this._onVisibilityChange = this.handleVisibilityChange.bind(this);

    this.init();
  }

  init() {
    // Check reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.isReducedMotion = mediaQuery.matches;
    mediaQuery.addEventListener('change', (e) => {
      this.isReducedMotion = e.matches;
      if (this.isReducedMotion && !this.isRunning) {
        this.renderFrame(performance.now());
      }
    });

    // Check if 2D canvas mode is forced via config or query parameter
    const urlParams = (typeof window !== 'undefined' && window.location && window.location.search)
      ? new URLSearchParams(window.location.search)
      : null;
    const force2D = !!(this.cfg.FORCE_2D || (urlParams && urlParams.get('render') === '2d'));

    // Try WebGL initialization (unless force2D is requested)
    let success = false;
    if (!force2D) {
      success = this.initWebGL();
    }
    if (!success) {
      console.warn('[EmberStipple] ' + (force2D ? '2D mode requested' : 'WebGL unavailable, falling back to 2D Canvas'));
      this.initCanvas2DFallback();
    }

    // Attach interaction & lifecycle listeners
    window.addEventListener('resize', this._onResize, { passive: true });
    window.addEventListener('pointermove', this._onPointerMove, { passive: true });
    document.addEventListener('visibilitychange', this._onVisibilityChange);

    // Start render loop
    this.start();
  }

  getParticleCount() {
    if (this.width < 600) return this.cfg.PARTICLES_MOBILE;
    if (this.width < 1024) return this.cfg.PARTICLES_TABLET;
    return this.cfg.PARTICLES_DESKTOP;
  }

  initWebGL() {
    const glOpts = {
      alpha: false,
      depth: false,
      stencil: false,
      antialias: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    };

    let gl = this.canvas.getContext('webgl2', glOpts);
    this.isWebGL2 = !!gl;
    if (!gl) {
      gl = this.canvas.getContext('webgl', glOpts) || this.canvas.getContext('experimental-webgl', glOpts);
    }
    if (!gl) return false;

    this.gl = gl;
    this.updateCanvasSize();

    // Compile Shaders
    const vsSource = `
      precision highp float;

      // Attributes
      attribute vec4 a_streamCoord; // x: u0 (0..1 progress), y: v0 (lateral barb offset), z: vaneId, w: layer (0,1,2)
      attribute vec4 a_barbData;    // x: freqOffset, y: phaseOffset, z: isDust, w: speedFactor
      attribute vec4 a_color;       // r, g, b, baseAlpha
      attribute vec2 a_edgeFlags;   // x: rimLightWeight, y: hotspotWeight

      // Uniforms
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform float u_dpr;
      uniform vec2 u_mouseRepel;
      uniform float u_repelForce;
      uniform float u_repelRadius;
      uniform vec2 u_parallax;
      uniform vec2 u_hotspotCenter;
      uniform float u_hotspotPulse;
      uniform float u_isMobile;
      uniform float u_flowSpeed;

      // Varyings to Fragment Shader
      varying vec4 v_color;
      varying float v_twinkle;
      varying float v_layer;

      // Pseudo-random & simple 2D curl noise approximations
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      void main() {
        float u0 = a_streamCoord.x;
        float v0 = a_streamCoord.y;
        float vaneId = a_streamCoord.z;
        float layer = a_streamCoord.w;

        float freqOffset = a_barbData.x;
        float phase = a_barbData.y;
        float isDust = a_barbData.z;
        float speedMult = a_barbData.w;

        // 1. Advance streamline progress u over time with seamless wrap
        // Near layer travels fastest, far layer slowest
        float layerSpeedFactor = (layer == 2.0) ? 1.0 : (layer == 1.0 ? 0.72 : 0.45);
        float streamProgress = fract(u0 + (u_time * u_flowSpeed * speedMult * layerSpeedFactor) / 1600.0);

        // 2. Compute Primary Diagonal Sweep Curve (Lower-Left to Upper-Right)
        // Normalized base coordinates [0, 1]
        // Sweeps diagonally: X goes from ~0.05 to ~1.15; Y goes from ~1.10 to ~-0.10
        float t = streamProgress;

        // Base diagonal path
        float baseX = -0.05 + t * 1.25;
        float baseY = 1.15 - t * 1.25;

        // Arch curvature: gentle convex arch toward the upper right
        float arch = sin(t * 3.14159) * 0.14;
        baseX += arch * 0.45;
        baseY -= arch * 0.85;

        // Feather Vane Fan spreading
        float vaneNorm = (vaneId - 4.5) / 5.0; // -1.0 to +1.0
        float vaneSpreadX = vaneNorm * (0.08 + t * 0.22);
        float vaneSpreadY = vaneNorm * (0.06 + t * 0.16);

        // Fine Barb Striations (high frequency feather barbs)
        float barbStriation = cos(t * 180.0 + freqOffset) * 0.008;

        // Curl-like organic wave turbulence
        float waveTime = u_time * 0.85 + vaneId * 0.6;
        float wave1 = sin(t * 4.5 + waveTime) * 0.018;
        float wave2 = cos(t * 7.2 - waveTime * 0.7) * 0.012;

        float normX = baseX + vaneSpreadX + v0 + barbStriation + wave1;
        float normY = baseY + vaneSpreadY + v0 * 0.8 + barbStriation + wave2;

        // Mobile recomposition: center mass gracefully on portrait screens
        if (u_isMobile > 0.5) {
          normX = (normX - 0.5) * 1.12 + 0.50;
          normY = (normY - 0.5) * 0.95 + 0.50;
        }

        // Screen space coordinates in pixels
        vec2 screenPos = vec2(normX * u_resolution.x, normY * u_resolution.y);

        // 3. Mouse Parallax (near layer moves most, far layer least)
        float parallaxFactor = (layer == 2.0) ? 1.0 : (layer == 1.0 ? 0.60 : 0.30);
        screenPos += u_parallax * parallaxFactor;

        // 4. Soft Mouse Repel
        vec2 mouseDistVec = screenPos - u_mouseRepel;
        float mouseDist = length(mouseDistVec);
        if (mouseDist < u_repelRadius && mouseDist > 0.1) {
          float repelFalloff = (1.0 - mouseDist / u_repelRadius);
          repelFalloff = repelFalloff * repelFalloff; // Smooth ease-out quad
          screenPos += (mouseDistVec / mouseDist) * (u_repelForce * repelFalloff * parallaxFactor);
        }

        // Convert pixel pos to Clip Space (-1.0 to +1.0, Y flipped for GL)
        vec2 clipPos = (screenPos / u_resolution.x) * 2.0 - 1.0;
        clipPos.y = 1.0 - (screenPos.y / u_resolution.y) * 2.0;
        // Fix aspect ratio distortion in clipPos
        clipPos.x = (screenPos.x / u_resolution.x) * 2.0 - 1.0;

        gl_Position = vec4(clipPos, 0.0, 1.0);

        // 5. Point Size calculation (crisp, DPR-scaled)
        float basePtSize = (layer == 2.0) ? 2.4 : (layer == 1.0 ? 1.8 : 1.3);
        if (isDust > 0.5) basePtSize *= 0.85;
        gl_PointSize = max(1.5, basePtSize * u_dpr);

        // 6. Color & Lighting Calculations
        vec3 col = a_color.rgb;

        // Warm Focal Hot Spot pulse
        float hotspotDist = length((vec2(normX, normY) - u_hotspotCenter) * vec2(1.0, 1.3));
        float hotspotFactor = smoothstep(0.32, 0.02, hotspotDist) * a_edgeFlags.y;
        if (hotspotFactor > 0.01) {
          vec3 warmColor = mix(vec3(1.0, 0.702, 0.278), vec3(1.0, 0.541, 0.165), hotspotFactor);
          col = mix(col, warmColor, hotspotFactor * 0.85 * u_hotspotPulse);
        }

        // Rim-light on leading edge
        if (a_edgeFlags.x > 0.1) {
          col = mix(col, vec3(0.910, 0.565, 0.541), a_edgeFlags.x * 0.70);
        }

        // Left-side darkening gradient (guarantees text contrast on left content)
        float leftSafeX = screenPos.x / u_resolution.x;
        float leftDimFactor = smoothstep(0.04, 0.40, leftSafeX);

        // Vignette dimming near edges
        vec2 normCenterDist = (screenPos / u_resolution.xy) - vec2(0.62, 0.48);
        float edgeVignette = 1.0 - smoothstep(0.55, 1.15, length(normCenterDist * vec2(0.85, 1.05)));

        // Twinkle factor (smooth individual phase oscillation)
        float twinkle = 0.65 + 0.35 * (0.5 + 0.5 * sin(u_time * 2.2 + phase));

        float finalAlpha = a_color.a * leftDimFactor * edgeVignette * twinkle;

        v_color = vec4(col, finalAlpha);
        v_twinkle = twinkle;
        v_layer = layer;
      }
    `;

    const fsSource = `
      precision highp float;

      varying vec4 v_color;
      varying float v_twinkle;
      varying float v_layer;

      void main() {
        // Render crisp stipple dots
        vec2 coord = gl_PointCoord - vec2(0.5);
        float dist = length(coord);

        if (dist > 0.5) {
          discard;
        }

        float smoothEdge = smoothstep(0.5, 0.25, dist);
        float alpha = v_color.a * smoothEdge;

        gl_FragColor = vec4(v_color.rgb * 1.85, alpha);
      }
    `;

    this.program = this.createProgram(gl, vsSource, fsSource);
    if (!this.program) return false;

    // Compile Fullscreen Quad Shader for Film Grain & Deep Contrast
    this.initQuadPass(gl);

    // Build Particle Geometry Buffer
    this.initParticleBuffers(gl);

    return true;
  }

  createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('[EmberStipple] Shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  createProgram(gl, vsSource, fsSource) {
    const vs = this.createShader(gl, gl.VERTEX_SHADER, vsSource);
    const fs = this.createShader(gl, gl.FRAGMENT_SHADER, fsSource);
    if (!vs || !fs) return null;

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('[EmberStipple] Program link error:', gl.getProgramInfoLog(program));
      return null;
    }
    return program;
  }

  initQuadPass(gl) {
    const vsQuad = `
      precision highp float;
      attribute vec2 a_quadPos;
      varying vec2 v_uv;
      void main() {
        v_uv = a_quadPos * 0.5 + 0.5;
        gl_Position = vec4(a_quadPos, 0.0, 1.0);
      }
    `;

    const fsQuad = `
      precision highp float;
      varying vec2 v_uv;
      uniform float u_time;
      uniform float u_grainOpacity;
      uniform vec2 u_resolution;

      // High-frequency pseudo-random noise for analog film grain
      float hash(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * 0.1031);
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
      }

      void main() {
        // Procedural analog film grain (subtle, cinematic)
        vec2 grainCoord = v_uv * u_resolution * 0.85 + fract(u_time * 12.0) * 100.0;
        float grain = hash(grainCoord) * 2.0 - 1.0;
        float grainAlpha = u_grainOpacity * abs(grain);

        // Analog film grain overlay
        gl_FragColor = vec4(vec3(grain * 0.5 + 0.5), grainAlpha);
      }
    `;

    this.quadProgram = this.createProgram(gl, vsQuad, fsQuad);
    if (!this.quadProgram) return;

    // Fullscreen quad vertices (-1 to 1)
    const quadVertices = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ]);

    this.quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);
  }

  initParticleBuffers(gl) {
    const numParticles = this.getParticleCount();
    this.totalParticles = numParticles;

    // Attributes layout:
    // a_streamCoord: 4 floats (u0, v0, vaneId, layer)
    // a_barbData:    4 floats (freqOffset, phase, isDust, speedMult)
    // a_color:       4 floats (r, g, b, alpha)
    // a_edgeFlags:   2 floats (rimLightWeight, hotspotWeight)
    // Total: 14 floats per particle

    const stride = 14;
    const vertexData = new Float32Array(numParticles * stride);

    const NUM_VANES = 9;
    const colors = this.cfg.COLORS;

    for (let i = 0; i < numParticles; i++) {
      const idx = i * stride;

      // Layer distribution: 35% far (0), 40% mid (1), 25% near (2)
      const randLayer = Math.random();
      const layer = randLayer < 0.35 ? 0.0 : (randLayer < 0.75 ? 1.0 : 2.0);

      // Vane assignment
      const vaneId = i % NUM_VANES;

      // Stream progress u0 (0.0 to 1.0) with non-linear density toward central mass
      let u0 = Math.random();
      // Bias slightly toward middle-upper streams (0.3 - 0.75) where wing is densest
      if (Math.random() < 0.65) {
        u0 = 0.25 + (Math.random() + Math.random()) * 0.30;
      }

      // Lateral barb offset v0
      const isDust = Math.random() < 0.18 ? 1.0 : 0.0;
      let v0 = 0.0;
      if (isDust > 0.5) {
        // Dust scattered in a broad gaussian around the wing
        v0 = (Math.random() - 0.5) * 0.16 * (1.0 + Math.random());
      } else {
        // Clustered tightly inside the feather streams with fine lateral barb spread
        const barbSign = Math.random() < 0.5 ? -1.0 : 1.0;
        v0 = barbSign * Math.pow(Math.random(), 1.7) * 0.048;
      }

      // Barb frequency and speed variation
      const freqOffset = Math.random() * Math.PI * 2;
      const phase = Math.random() * Math.PI * 2;
      const speedMult = 0.85 + Math.random() * 0.30;

      // Color classification based on position and stream depth
      let r, g, b, alpha;
      let rimLightWeight = 0.0;
      let hotspotWeight = 0.0;

      // Stream density role
      const vaneDistFromCenter = Math.abs((vaneId - 4.5) / 4.5);

      // Check if particle is near focal hot spot
      if (u0 > 0.38 && u0 < 0.68 && Math.abs(v0) < 0.045 && vaneDistFromCenter < 0.45) {
        hotspotWeight = 1.0 - Math.hypot((u0 - 0.52) * 2.5, v0 * 20.0);
        hotspotWeight = Math.max(0.0, Math.min(1.0, hotspotWeight));
      }

      // Check if particle is along the outer leading edge for Copper-Pink rim light
      if (vaneId <= 2 && v0 < -0.015 && u0 > 0.40 && u0 < 0.85) {
        rimLightWeight = 1.0 - Math.abs(v0 + 0.025) * 25.0;
        rimLightWeight = Math.max(0.0, Math.min(1.0, rimLightWeight));
      }

      // Base stream palette grading:
      // Deep Core Navy -> Cobalt/Electric Blue -> Stream Highlights Cyan/Teal
      const streamGradientT = Math.min(1.0, Math.max(0.0, (u0 - 0.15) / 0.70));
      if (vaneDistFromCenter < 0.35 && isDust === 0.0) {
        // Core shadow body: Deep Navy #0B1B3A -> Indigo #12306B
        const tCore = Math.random();
        r = colors.CORE_SHADOW_NAVY[0] * (1.0 - tCore) + colors.CORE_SHADOW_INDIGO[0] * tCore;
        g = colors.CORE_SHADOW_NAVY[1] * (1.0 - tCore) + colors.CORE_SHADOW_INDIGO[1] * tCore;
        b = colors.CORE_SHADOW_NAVY[2] * (1.0 - tCore) + colors.CORE_SHADOW_INDIGO[2] * tCore;
      } else if (vaneDistFromCenter < 0.70) {
        // Mid-tones: Cobalt #1E5BFF -> Electric Blue #2D8CFF
        const tMid = Math.random();
        r = colors.MID_COBALT[0] * (1.0 - tMid) + colors.MID_ELECTRIC_BLUE[0] * tMid;
        g = colors.MID_COBALT[1] * (1.0 - tMid) + colors.MID_ELECTRIC_BLUE[1] * tMid;
        b = colors.MID_COBALT[2] * (1.0 - tMid) + colors.MID_ELECTRIC_BLUE[2] * tMid;
      } else {
        // Highlights on streams & edges: Cyan #25C7E8 -> Teal #2EE6D0
        const tHigh = Math.random();
        r = colors.HIGHLIGHT_CYAN[0] * (1.0 - tHigh) + colors.HIGHLIGHT_TEAL[0] * tHigh;
        g = colors.HIGHLIGHT_CYAN[1] * (1.0 - tHigh) + colors.HIGHLIGHT_TEAL[1] * tHigh;
        b = colors.HIGHLIGHT_CYAN[2] * (1.0 - tHigh) + colors.HIGHLIGHT_TEAL[2] * tHigh;
      }

      // Base alpha by layer depth
      if (layer === 2.0) {
        alpha = isDust > 0.5 ? 0.85 : 1.0;
      } else if (layer === 1.0) {
        alpha = isDust > 0.5 ? 0.65 : 0.90;
      } else {
        alpha = isDust > 0.5 ? 0.40 : 0.65;
      }

      // Fill Float32Array
      // a_streamCoord
      vertexData[idx + 0] = u0;
      vertexData[idx + 1] = v0;
      vertexData[idx + 2] = vaneId;
      vertexData[idx + 3] = layer;

      // a_barbData
      vertexData[idx + 4] = freqOffset;
      vertexData[idx + 5] = phase;
      vertexData[idx + 6] = isDust;
      vertexData[idx + 7] = speedMult;

      // a_color
      vertexData[idx + 8] = r;
      vertexData[idx + 9] = g;
      vertexData[idx + 10] = b;
      vertexData[idx + 11] = alpha;

      // a_edgeFlags
      vertexData[idx + 12] = rimLightWeight;
      vertexData[idx + 13] = hotspotWeight;
    }

    if (this.particleBuffer) {
      gl.deleteBuffer(this.particleBuffer);
    }
    this.particleBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.particleBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

    // Cache attribute locations
    const p = this.program;
    this.attribs = {
      streamCoord: gl.getAttribLocation(p, 'a_streamCoord'),
      barbData: gl.getAttribLocation(p, 'a_barbData'),
      color: gl.getAttribLocation(p, 'a_color'),
      edgeFlags: gl.getAttribLocation(p, 'a_edgeFlags'),
    };

    // Cache uniform locations
    this.uniforms = {
      time: gl.getUniformLocation(p, 'u_time'),
      resolution: gl.getUniformLocation(p, 'u_resolution'),
      dpr: gl.getUniformLocation(p, 'u_dpr'),
      mouseRepel: gl.getUniformLocation(p, 'u_mouseRepel'),
      repelForce: gl.getUniformLocation(p, 'u_repelForce'),
      repelRadius: gl.getUniformLocation(p, 'u_repelRadius'),
      parallax: gl.getUniformLocation(p, 'u_parallax'),
      hotspotCenter: gl.getUniformLocation(p, 'u_hotspotCenter'),
      hotspotPulse: gl.getUniformLocation(p, 'u_hotspotPulse'),
      isMobile: gl.getUniformLocation(p, 'u_isMobile'),
      flowSpeed: gl.getUniformLocation(p, 'u_flowSpeed'),
    };

    // Quad uniform locations
    const qp = this.quadProgram;
    if (qp) {
      this.quadUniforms = {
        time: gl.getUniformLocation(qp, 'u_time'),
        grainOpacity: gl.getUniformLocation(qp, 'u_grainOpacity'),
        resolution: gl.getUniformLocation(qp, 'u_resolution'),
      };
      this.quadAttribPos = gl.getAttribLocation(qp, 'a_quadPos');
    }
  }

  updateCanvasSize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    const targetW = Math.floor(this.width * this.dpr);
    const targetH = Math.floor(this.height * this.dpr);

    if (this.canvas.width !== targetW || this.canvas.height !== targetH) {
      this.canvas.width = targetW;
      this.canvas.height = targetH;
      this.canvas.style.width = this.width + 'px';
      this.canvas.style.height = this.height + 'px';
    }

    if (this.gl) {
      this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    } else if (this.ctx) {
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }
  }

  handleResize() {
    const prevWidth = this.width;
    this.updateCanvasSize();

    // Rebuild particle count if device tier changed
    if (this.gl && Math.abs(window.innerWidth - prevWidth) > 120) {
      this.initParticleBuffers(this.gl);
    }

    if (this.isReducedMotion) {
      this.renderFrame(performance.now());
    }
  }

  handlePointerMove(e) {
    this.hasPointerMoved = true;
    this.targetMouseX = e.clientX;
    this.targetMouseY = e.clientY;
  }

  handleVisibilityChange() {
    if (document.visibilityState === 'hidden') {
      this.stop();
    } else {
      this.start();
    }
  }

  renderWebGL(timeSeconds) {
    const gl = this.gl;
    if (!gl) return;

    // Smooth lerp mouse parallax and cursor coordinates
    this.currentMouseX += (this.targetMouseX - this.currentMouseX) * this.cfg.MOUSE_LERP_FACTOR;
    this.currentMouseY += (this.targetMouseY - this.currentMouseY) * this.cfg.MOUSE_LERP_FACTOR;

    // Normalized mouse offset from center [-1 to 1]
    const normOffsetX = (this.currentMouseX / this.width - 0.5) * 2.0;
    const normOffsetY = (this.currentMouseY / this.height - 0.5) * 2.0;

    this.parallaxX = -normOffsetX * this.cfg.MOUSE_PARALLAX_MAX_PX;
    this.parallaxY = -normOffsetY * this.cfg.MOUSE_PARALLAX_MAX_PX;

    // Hotspot breathing calculation (6 - 8s cycle, +- 10-12%)
    const pulsePhase = (timeSeconds * 2.0 * Math.PI) / this.cfg.HOTSPOT_PULSE_PERIOD_SEC;
    const hotspotPulse = 1.0 + Math.sin(pulsePhase) * this.cfg.HOTSPOT_PULSE_INTENSITY;

    const isMobile = this.width < 768 ? 1.0 : 0.0;
    const hotspotCenter = isMobile
      ? [this.cfg.HOTSPOT_CENTER_MOBILE.x, this.cfg.HOTSPOT_CENTER_MOBILE.y]
      : [this.cfg.HOTSPOT_CENTER_DESKTOP.x, this.cfg.HOTSPOT_CENTER_DESKTOP.y];

    // Clear Base: Pure Near-Black (#000000 to #05070C)
    gl.clearColor(this.cfg.COLORS.BG_BASE[0], this.cfg.COLORS.BG_BASE[1], this.cfg.COLORS.BG_BASE[2], 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // ==========================================
    // PASS 1: GENERATIVE PARTICLES (Additive Blend)
    // ==========================================
    gl.useProgram(this.program);

    // Additive blending for luminous celestial glow
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    // Bind Particle Vertex Attributes
    gl.bindBuffer(gl.ARRAY_BUFFER, this.particleBuffer);
    const stride = 14 * 4; // 14 floats, 4 bytes each

    gl.enableVertexAttribArray(this.attribs.streamCoord);
    gl.vertexAttribPointer(this.attribs.streamCoord, 4, gl.FLOAT, false, stride, 0);

    gl.enableVertexAttribArray(this.attribs.barbData);
    gl.vertexAttribPointer(this.attribs.barbData, 4, gl.FLOAT, false, stride, 4 * 4);

    gl.enableVertexAttribArray(this.attribs.color);
    gl.vertexAttribPointer(this.attribs.color, 4, gl.FLOAT, false, stride, 8 * 4);

    gl.enableVertexAttribArray(this.attribs.edgeFlags);
    gl.vertexAttribPointer(this.attribs.edgeFlags, 2, gl.FLOAT, false, stride, 12 * 4);

    // Upload Uniforms
    gl.uniform1f(this.uniforms.time, this.isReducedMotion ? 1.5 : timeSeconds);
    gl.uniform2f(this.uniforms.resolution, this.width, this.height);
    gl.uniform1f(this.uniforms.dpr, this.dpr);
    gl.uniform2f(this.uniforms.mouseRepel, this.currentMouseX, this.currentMouseY);
    gl.uniform1f(this.uniforms.repelForce, this.hasPointerMoved ? this.cfg.MOUSE_REPEL_FORCE_PX : 0.0);
    gl.uniform1f(this.uniforms.repelRadius, this.cfg.MOUSE_REPEL_RADIUS_PX);
    gl.uniform2f(this.uniforms.parallax, this.parallaxX, this.parallaxY);
    gl.uniform2f(this.uniforms.hotspotCenter, hotspotCenter[0], hotspotCenter[1]);
    gl.uniform1f(this.uniforms.hotspotPulse, hotspotPulse);
    gl.uniform1f(this.uniforms.isMobile, isMobile);
    gl.uniform1f(this.uniforms.flowSpeed, this.cfg.FLOW_SPEED_PX_PER_SEC);

    // Draw Particles
    gl.drawArrays(gl.POINTS, 0, this.totalParticles);

    // ==========================================
    // PASS 2: FULLSCREEN QUAD (Vignette + Film Grain)
    // ==========================================
    if (this.quadProgram && this.quadBuffer) {
      gl.useProgram(this.quadProgram);

      // Alpha blend for film grain & subtle darkening overlay
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
      gl.enableVertexAttribArray(this.quadAttribPos);
      gl.vertexAttribPointer(this.quadAttribPos, 2, gl.FLOAT, false, 0, 0);

      gl.uniform1f(this.quadUniforms.time, timeSeconds);
      gl.uniform1f(this.quadUniforms.grainOpacity, this.cfg.FILM_GRAIN_OPACITY);
      gl.uniform2f(this.quadUniforms.resolution, this.width, this.height);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
  }

  // High-performance HTML5 2D Canvas Renderer (Full visual parity fallback)
  initCanvas2DFallback() {
    this.updateCanvasSize();
    this.ctx = this.canvas.getContext('2d', { alpha: false });
    if (!this.ctx) return;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    const count = this.width < 600 ? 2500 : (this.width < 1024 ? 4200 : 6800);
    this.particles2D = [];
    const NUM_VANES = 9;

    for (let i = 0; i < count; i++) {
      const vaneId = i % NUM_VANES;
      const randLayer = Math.random();
      const layer = randLayer < 0.35 ? 0 : (randLayer < 0.75 ? 1 : 2);

      let u0 = Math.random();
      if (Math.random() < 0.65) {
        u0 = 0.25 + (Math.random() + Math.random()) * 0.30;
      }

      const isDust = Math.random() < 0.18;
      let v0 = 0;
      if (isDust) {
        v0 = (Math.random() - 0.5) * 0.16 * (1.0 + Math.random());
      } else {
        const barbSign = Math.random() < 0.5 ? -1.0 : 1.0;
        v0 = barbSign * Math.pow(Math.random(), 1.7) * 0.048;
      }

      const freqOffset = Math.random() * Math.PI * 2;
      const phase = Math.random() * Math.PI * 2;
      const speedMult = 0.85 + Math.random() * 0.30;

      // Color tier assignment
      const vaneDist = Math.abs((vaneId - 4.5) / 4.5);
      let colorType = 3; // 0: hotspot, 1: rim, 2: highlight, 3: mid, 4: core

      if (u0 > 0.38 && u0 < 0.68 && Math.abs(v0) < 0.045 && vaneDist < 0.45) {
        colorType = 0; // hotspot
      } else if (vaneId <= 2 && v0 < -0.015 && u0 > 0.40 && u0 < 0.85) {
        colorType = 1; // rim
      } else if (vaneDist >= 0.70 || isDust) {
        colorType = 2; // highlight
      } else if (vaneDist < 0.35) {
        colorType = 4; // core
      }

      const dotSize = layer === 2 ? 2 : 1;

      this.particles2D.push({
        u0,
        v0,
        vaneId,
        layer,
        freqOffset,
        speedMult,
        colorType,
        dotSize,
      });
    }

    // Sort by colorType for instant sequential batching
    this.particles2D.sort((a, b) => a.colorType - b.colorType);
  }

  renderCanvas2D(timeSeconds) {
    const ctx = this.ctx;
    if (!ctx) return;

    const w = this.width;
    const h = this.height;

    // 1. Clear with base near-black
    ctx.fillStyle = '#01050c';
    ctx.fillRect(0, 0, w, h);

    // 2. Additive blending for luminous particle streams
    ctx.globalCompositeOperation = 'lighter';

    // Hotspot pulse factor
    const pulsePhase = (timeSeconds * 2.0 * Math.PI) / this.cfg.HOTSPOT_PULSE_PERIOD_SEC;
    const hotspotPulse = 1.0 + Math.sin(pulsePhase) * this.cfg.HOTSPOT_PULSE_INTENSITY;
    const flowSpeed = this.cfg.FLOW_SPEED_PX_PER_SEC;
    const isMobile = w < 768;

    // Pre-allocated color palette
    const colors = [
      `rgba(255, 179, 71, ${0.90 * hotspotPulse})`, // 0: hotspot
      'rgba(232, 144, 138, 0.75)',                  // 1: rim
      'rgba(37, 199, 232, 0.85)',                   // 2: highlight
      'rgba(45, 140, 255, 0.85)',                   // 3: mid
      'rgba(18, 48, 107, 0.65)'                     // 4: core
    ];

    let currentColorType = -1;
    const len = this.particles2D.length;

    for (let i = 0; i < len; i++) {
      const p = this.particles2D[i];
      const layerSpeedFactor = p.layer === 2 ? 1.0 : (p.layer === 1 ? 0.72 : 0.45);
      const streamProgress = (p.u0 + (timeSeconds * flowSpeed * p.speedMult * layerSpeedFactor) / 1600.0) % 1.0;
      const t = streamProgress;

      let baseX = -0.05 + t * 1.25;
      let baseY = 1.15 - t * 1.25;

      const arch = Math.sin(t * Math.PI) * 0.14;
      baseX += arch * 0.45;
      baseY -= arch * 0.85;

      const vaneNorm = (p.vaneId - 4.5) / 5.0;
      const vaneSpreadX = vaneNorm * (0.08 + t * 0.22);
      const vaneSpreadY = vaneNorm * (0.06 + t * 0.16);

      const barbStriation = Math.cos(t * 180.0 + p.freqOffset) * 0.008;
      const waveTime = timeSeconds * 0.85 + p.vaneId * 0.6;
      const wave1 = Math.sin(t * 4.5 + waveTime) * 0.018;

      let normX = baseX + vaneSpreadX + p.v0 + barbStriation + wave1;
      let normY = baseY + vaneSpreadY + p.v0 * 0.8 + barbStriation;

      if (isMobile) {
        normX = (normX - 0.5) * 1.12 + 0.50;
        normY = (normY - 0.5) * 0.95 + 0.50;
      }

      // Parallax
      const parallaxFactor = p.layer === 2 ? 1.0 : (p.layer === 1 ? 0.60 : 0.30);
      const screenX = normX * w + this.parallaxX * parallaxFactor;
      const screenY = normY * h + this.parallaxY * parallaxFactor;

      if (screenX < 0 || screenX > w || screenY < 0 || screenY > h) continue;

      // Left-side darkening for text readability
      const leftDim = (normX - 0.04) / 0.36;
      if (leftDim <= 0.02) continue;

      // Batch fillStyle updates
      if (p.colorType !== currentColorType) {
        currentColorType = p.colorType;
        ctx.fillStyle = colors[currentColorType];
      }

      // Fast integer rect stipple dots
      ctx.fillRect(Math.floor(screenX), Math.floor(screenY), p.dotSize, p.dotSize);
    }

    ctx.globalCompositeOperation = 'source-over';
  }

  renderFrame(currentTime) {
    const timeSeconds = (currentTime - this.startTime) * 0.001;

    if (this.gl) {
      this.renderWebGL(timeSeconds);
    } else if (this.ctx) {
      this.renderCanvas2D(timeSeconds);
    }
  }

  loop(currentTime) {
    if (!this.isRunning) return;

    this.renderFrame(currentTime);

    if (!this.isReducedMotion) {
      this.animationFrameId = requestAnimationFrame(this.loop.bind(this));
    }
  }

  start() {
    if (!this.isRunning) {
      this.isRunning = true;
      // Immediately render frame 0 synchronously so canvas is painted on initial paint
      this.renderFrame(performance.now());
      if (!this.isReducedMotion) {
        this.animationFrameId = requestAnimationFrame(this.loop.bind(this));
      }
    }
  }

  stop() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  destroy() {
    this.stop();
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('pointermove', this._onPointerMove);
    document.removeEventListener('visibilitychange', this._onVisibilityChange);

    if (this.gl) {
      if (this.particleBuffer) this.gl.deleteBuffer(this.particleBuffer);
      if (this.quadBuffer) this.gl.deleteBuffer(this.quadBuffer);
      if (this.program) this.gl.deleteProgram(this.program);
      if (this.quadProgram) this.gl.deleteProgram(this.quadProgram);
    }
  }
}

// Auto-initialize when loaded as a standalone script
if (typeof window !== 'undefined') {
  window.EmberStippleBackground = EmberStippleBackground;
  window.EMBER_CONFIG = EMBER_CONFIG;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.emberStippleInstance = new EmberStippleBackground();
    });
  } else {
    window.emberStippleInstance = new EmberStippleBackground();
  }
}
