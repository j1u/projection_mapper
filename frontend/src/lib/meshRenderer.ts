/** Minimal WebGL renderer: one textured, tessellated grid per surface. */

export const TESS = 48;

const VS = `attribute vec2 p; attribute vec2 t; varying vec2 v;
void main(){ v = t; gl_Position = vec4(p, 0.0, 1.0); }`;

const FS = `precision mediump float; varying vec2 v; uniform sampler2D tex; uniform vec2 sc; uniform vec2 fl;
void main(){
  vec2 uv = mix(v, 1.0 - v, fl);
  uv = (uv - 0.5) * sc + 0.5;
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
  gl_FragColor = vec4(texture2D(tex, uv).rgb, 1.0);
}`;

let UVS: Float32Array | null = null;
let IDX: Uint16Array | null = null;

function tessArrays() {
  if (UVS && IDX) return { UVS, IDX };
  const n = TESS + 1;
  UVS = new Float32Array(n * n * 2);
  IDX = new Uint16Array(TESS * TESS * 6);
  for (let j = 0, k = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      UVS[k++] = i / TESS;
      UVS[k++] = j / TESS;
    }
  for (let j = 0, k = 0; j < TESS; j++)
    for (let i = 0; i < TESS; i++) {
      const a = j * n + i, b = a + 1, c = a + n, d = c + 1;
      IDX.set([a, b, c, b, d, c], k);
      k += 6;
    }
  return { UVS, IDX };
}

export class MeshRenderer {
  private constructor(
    private gl: WebGLRenderingContext,
    private posBuf: WebGLBuffer,
    private tex: WebGLTexture,
    private uSc: WebGLUniformLocation,
    private uFl: WebGLUniformLocation,
    private count: number,
  ) {}

  static create(canvas: HTMLCanvasElement): MeshRenderer | null {
    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: true });
    if (!gl || gl.isContextLost()) return null;
    const { UVS, IDX } = tessArrays();
    const shader = (type: number, src: string) => {
      const o = gl.createShader(type)!;
      gl.shaderSource(o, src);
      gl.compileShader(o);
      return o;
    };
    const pr = gl.createProgram()!;
    gl.attachShader(pr, shader(gl.VERTEX_SHADER, VS));
    gl.attachShader(pr, shader(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
    gl.useProgram(pr);

    const uvBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
    gl.bufferData(gl.ARRAY_BUFFER, UVS, gl.STATIC_DRAW);
    const lt = gl.getAttribLocation(pr, 't');
    gl.enableVertexAttribArray(lt);
    gl.vertexAttribPointer(lt, 2, gl.FLOAT, false, 0, 0);

    const posBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, UVS.length * 4, gl.DYNAMIC_DRAW);
    const lp = gl.getAttribLocation(pr, 'p');
    gl.enableVertexAttribArray(lp);
    gl.vertexAttribPointer(lp, 2, gl.FLOAT, false, 0, 0);

    const ib = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, IDX, gl.STATIC_DRAW);

    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));

    return new MeshRenderer(gl, posBuf, tex, gl.getUniformLocation(pr, 'sc')!, gl.getUniformLocation(pr, 'fl')!, IDX.length);
  }

  setPositions(a: Float32Array) {
    const { gl } = this;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, a, gl.DYNAMIC_DRAW);
  }

  /** Returns false if the browser refuses (cross-origin media without CORS). */
  upload(el: TexImageSource): boolean {
    const { gl } = this;
    try {
      gl.bindTexture(gl.TEXTURE_2D, this.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, el);
      return true;
    } catch {
      return false;
    }
  }

  draw(w: number, h: number, scale: [number, number], flip: [number, number]) {
    const { gl } = this;
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(this.uSc, scale[0], scale[1]);
    gl.uniform2f(this.uFl, flip[0], flip[1]);
    gl.drawElements(gl.TRIANGLES, this.count, gl.UNSIGNED_SHORT, 0);
  }

  /** Free GPU resources. The context itself is released when the canvas is unmounted. */
  dispose() {
    this.gl.deleteTexture(this.tex);
    this.gl.deleteBuffer(this.posBuf);
  }
}
