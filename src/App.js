import "./styles.css";
import * as THREE from "three";
import gsap from "gsap";
import React, { useEffect } from "react";

const vertex = `
varying vec2 v_uv;

void main() {
    v_uv = uv;

    gl_Position = projectionMatrix * modelViewMatrix * 
		vec4(position, 1.0);
}
`;

const fragment = `
uniform vec2 u_mouse;
uniform vec2 u_res;

uniform sampler2D u_image;
uniform sampler2D u_imagehover;

uniform float u_time;

varying vec2 v_uv;

float circle(in vec2 _st, in float _radius, in float blurriness){
    vec2 dist = _st;
    return 1.-smoothstep(_radius-(_radius*blurriness), _radius+(_radius*blurriness), dot(dist,dist)*4.0);
}

vec3 mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 mod289(vec4 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x) {
     return mod289(((x*34.0)+1.0)*x);
}

vec4 taylorInvSqrt(vec4 r)
{
  return 1.79284291400159 - 0.85373472095314 * r;
}

float snoise3(vec3 v)
  {
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

// First corner
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 =   v - i + dot(i, C.xxx) ;

// Other corners
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );

  //   x0 = x0 - 0.0 + 0.0 * C.xxx;
  //   x1 = x0 - i1  + 1.0 * C.xxx;
  //   x2 = x0 - i2  + 2.0 * C.xxx;
  //   x3 = x0 - 1.0 + 3.0 * C.xxx;
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
  vec3 x3 = x0 - D.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y

// Permutations
  i = mod289(i);
  vec4 p = permute( permute( permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

// Gradients: 7x7 points over a square, mapped onto an octahedron.
// The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
  float n_ = 0.142857142857; // 1.0/7.0
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );

  //vec4 s0 = vec4(lessThan(b0,0.0))*2.0 - 1.0;
  //vec4 s1 = vec4(lessThan(b1,0.0))*2.0 - 1.0;
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

//Normalise gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

// Mix final noise value
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                dot(p2,x2), dot(p3,x3) ) );
  }

void main() {
	// We manage the device ratio by passing PR constant
	vec2 res = u_res * PR;
	vec2 st = gl_FragCoord.xy / res.xy - vec2(0.5);
	// tip: use the following formula to keep the good ratio of your coordinates
	st.y *= u_res.y / u_res.x;

	// We readjust the mouse coordinates
	vec2 mouse = u_mouse * -0.5;
	
	vec2 circlePos = st + mouse;
	float c = circle(circlePos, 0.5, 2.) * 2.1;

	float offx = v_uv.x + sin(v_uv.y + u_time * .1);
	float offy = v_uv.y - u_time * 0.1 - cos(u_time * .001) * .01;

	float n = snoise3(vec3(offx, offy, u_time * .1) * 8.) - 1.;

	float finalMask = smoothstep(0.4, 0.3, n + pow(c, 2.));

	vec4 image = texture2D(u_image, v_uv);
	vec4 hover = texture2D(u_imagehover, v_uv);

	vec4 finalImage = mix(image, hover, finalMask);

	gl_FragColor = finalImage;
}
`;

export default function App() {
  useEffect(() => {
    const stage = document.querySelector("#stage");
    let mesh, uniforms;

    let scene = new THREE.Scene();
    let renderer = new THREE.WebGLRenderer({
      canvas: stage,
      alpha: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    const ambientLight = new THREE.AmbientLight(0xffffff, 2);
    scene.add(ambientLight);

    const fov = (180 * (2 * Math.atan(window.innerHeight / 2 / 800))) / Math.PI;
    const camera = new THREE.PerspectiveCamera(
      fov,
      window.innerWidth / window.innerHeight,
      1,
      1000
    );
    camera.position.set(0, 0, 800);

    let imageDOM = document.querySelector(".tile__image");
    let loader = new THREE.TextureLoader();

    let sizes = new THREE.Vector2(0, 0);
    let offset = new THREE.Vector2(0, 0);
    let mouse = new THREE.Vector2(0, 0);

    let imageHover = loader.load("https://picsum.photos/200/300");
    let image = loader.load("https://picsum.photos/seed/picsum/200/300", () => {
      const { width, height, top, left } = imageDOM.getBoundingClientRect();
      // cover(image, window.innerWidth / window.innerHeight);
      sizes.set(width, height);
      offset.set(
        left - window.innerWidth / 2 + width / 2,
        -top + window.innerHeight / 2 - height / 2
      );
      uniforms = {
        u_image: { type: "t", value: image },
        u_imagehover: { type: "t", value: imageHover },
        u_mouse: { value: mouse },
        u_time: { value: 0 },
        u_res: {
          value: new THREE.Vector2(window.innerWidth, window.innerHeight),
        },
      };
      let geometry = new THREE.PlaneBufferGeometry(1, 1, 1, 1);
      let material = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: vertex,
        fragmentShader: fragment,
        defines: {
          PR: window.devicePixelRatio.toFixed(1),
        },
      });
      mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(offset.x, offset.y, 0);
      mesh.scale.set(sizes.x, sizes.y, 1);
      scene.add(mesh);
    });

    function onMouseMove(e) {
      gsap.to(mouse, 0.5, {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: -(e.clientY / window.innerHeight) * 2 + 1,
      });

      if (mesh !== undefined) {
        gsap.to(mesh.rotation, 0.5, {
          x: -mouse.y * 0.3,
          y: mouse.x * (Math.PI / 6),
        });
      }
    }
    window.addEventListener("mousemove", (e) => {
      onMouseMove(e);
    });

    function render() {
      if (renderer === undefined) return;
      requestAnimationFrame(render);
      if (uniforms !== undefined) {
        uniforms.u_time.value += 0.01;
      }

      renderer.render(scene, camera);
    }
    render();
  }, []);
  return (
    <>
      <section className="container" style={{ opacity: 0 }}>
        <article className="tile">
          <figure className="tile__figure">
            <img
              src="https://picsum.photos/200/300"
              data-hover="https://picsum.photos/200/300"
              className="tile__image"
              alt="My image"
              width="300"
            />
          </figure>
        </article>
      </section>

      <canvas id="stage" style={{ height: "50vh", width: "50vw" }}></canvas>
    </>
  );
}
