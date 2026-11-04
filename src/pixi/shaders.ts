import type { ShaderKind } from "frontend/settings/game-settings";
import type { Application } from "pixi.js";
import { Filter } from "pixi.js";

/**
 * The scene is first drawn at one texel per sprite pixel (see applyShader), so these
 * shaders work on the real pixels of the sprites and scale them up themselves.
 * uScale is how many pixels of the screen one sprite pixel covers.
 */
const common = `
precision highp float;

varying vec2 vTextureCoord;
uniform sampler2D uSampler;
uniform vec4 inputPixel;
uniform vec4 inputClamp;
uniform float uScale;

vec4 texel(vec2 position) {
  vec2 uv = (floor(position) + 0.5) * inputPixel.zw;
  return texture2D(uSampler, clamp(uv, inputClamp.xy, inputClamp.zw));
}

float colorDistance(vec4 a, vec4 b) {
  vec4 difference = abs(a - b);
  return dot(difference.rgb, vec3(0.299, 0.587, 0.114)) + difference.a;
}

bool isDifferent(vec4 a, vec4 b) {
  return colorDistance(a, b) > 0.04;
}
`;

const bilinear = (sharpness: string) => `${common}
void main() {
  vec2 position = vTextureCoord * inputPixel.xy - 0.5;
  vec2 origin = floor(position);
  vec2 blend = clamp((position - origin - 0.5) * ${sharpness} + 0.5, 0.0, 1.0);

  gl_FragColor = mix(
    mix(texel(origin), texel(origin + vec2(1.0, 0.0)), blend.x),
    mix(texel(origin + vec2(0.0, 1.0)), texel(origin + vec2(1.0, 1.0)), blend.x),
    blend.y
  );
}
`;

// Looks at the corner of the sprite pixel this fragment is in: all the shaders below
// are written for the bottom right corner, "towards" mirrors the others onto it.
const corner = `
  vec2 position = vTextureCoord * inputPixel.xy;
  vec2 fromCenter = fract(position) - 0.5;
  vec2 towards = vec2(fromCenter.x < 0.0 ? -1.0 : 1.0, fromCenter.y < 0.0 ? -1.0 : 1.0);

  #define AT(x, y) texel(position + vec2(x, y) * towards)

  vec4 E = AT(0.0, 0.0);
  vec4 F = AT(1.0, 0.0);
  vec4 H = AT(0.0, 1.0);
  vec4 D = AT(-1.0, 0.0);
  vec4 B = AT(0.0, -1.0);
`;

const scale2x = `${common}
void main() {
  ${corner}
  bool isCorner = !isDifferent(F, H) && isDifferent(B, H) && isDifferent(D, F);
  gl_FragColor = isCorner ? F : E;
}
`;

// Our own implementation of the xBR algorithm by Hyllian, level 2: edges are found by
// comparing color differences along both diagonals, and can be 45° or shallower.
const xbr = `${common}
void main() {
  ${corner}
  vec4 I = AT(1.0, 1.0);
  vec4 C = AT(1.0, -1.0);
  vec4 G = AT(-1.0, 1.0);
  vec4 F4 = AT(2.0, 0.0);
  vec4 H5 = AT(0.0, 2.0);
  vec4 I4 = AT(2.0, 1.0);
  vec4 I5 = AT(1.0, 2.0);

  float acrossEdge = colorDistance(E, C) + colorDistance(E, G) + colorDistance(I, F4)
    + colorDistance(I, H5) + 4.0 * colorDistance(H, F);
  float alongEdge = colorDistance(H, D) + colorDistance(H, I5) + colorDistance(F, I4)
    + colorDistance(F, B) + 4.0 * colorDistance(E, I);

  bool hasEdge = acrossEdge < alongEdge && isDifferent(E, F) && isDifferent(E, H);
  float FG = colorDistance(F, G);
  float HC = colorDistance(H, C);

  vec2 inCorner = abs(fromCenter) + 0.5;
  float softness = 1.0 / uScale;
  float amount = 0.0;

  if (hasEdge) {
    amount = smoothstep(-softness, softness, inCorner.x + inCorner.y - 1.5);

    if (FG * 2.0 <= HC && isDifferent(E, G) && isDifferent(D, G)) {
      amount = max(amount, smoothstep(-softness, softness, inCorner.y + 0.5 * inCorner.x - 1.0));
    }

    if (HC * 2.0 <= FG && isDifferent(E, C) && isDifferent(B, C)) {
      amount = max(amount, smoothstep(-softness, softness, inCorner.y + 2.0 * inCorner.x - 2.0));
    }
  }

  vec4 closest = colorDistance(E, F) <= colorDistance(E, H) ? F : H;
  gl_FragColor = mix(E, closest, amount);
}
`;

const crt = `${common}
void main() {
  vec2 position = vTextureCoord * inputPixel.xy;
  vec4 color = texel(position);

  float scanline = 0.68 + 0.32 * sin(fract(position.y) * 3.14159);
  float triad = mod(gl_FragCoord.x, 3.0);
  vec3 mask = vec3(
    triad < 1.0 ? 1.0 : 0.82,
    triad >= 1.0 && triad < 2.0 ? 1.0 : 0.82,
    triad >= 2.0 ? 1.0 : 0.82
  );

  gl_FragColor = vec4(color.rgb * scanline * mask * 1.25, color.a);
}
`;

const fragments: Record<Exclude<ShaderKind, "pixel">, string> = {
  sharp: bilinear("uScale * 0.5"),
  soft: bilinear("1.0"),
  scale2x,
  xbr,
  crt,
};

class ShaderFilter extends Filter {
  constructor(
    public kind: ShaderKind,
    fragment: string,
  ) {
    super(undefined, fragment, { uScale: 1 });
    this.padding = 0;
  }
}

/** Applies the shader to everything on the stage. To be called again when the scale changes. */
export const applyShader = (app: Application, kind: ShaderKind) => {
  if (kind === "pixel") {
    app.stage.filters = null;
    return;
  }

  const current = app.stage.filters?.[0];
  const filter =
    current instanceof ShaderFilter && current.kind === kind
      ? current
      : new ShaderFilter(kind, fragments[kind]);

  const stageScale = app.stage.scale.x;

  // One texel per sprite pixel. The whole screen is the filter area,
  // otherwise the texels would shift along with the bounds of the scene.
  filter.resolution = 1 / stageScale;
  filter.uniforms.uScale = stageScale * app.renderer.resolution;
  app.stage.filterArea = app.screen;
  app.stage.filters = [filter];
};
