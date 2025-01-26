import { useState, useRef } from "react";
import "./App.css";
import { Canvas, useFrame, ThreeElements } from "@react-three/fiber";
import * as THREE from "three";
import { OrbitControls } from "@react-three/drei";
import { Line } from "@react-three/drei";

function PhysicsSystem({
  bodiesRef,
  G,
  paused,
  enableCollision,
  restitution,
  forceUpdate,
}: {
  bodiesRef: React.MutableRefObject<Body[]>;
  G: number;
  paused: boolean;
  enableCollision: boolean;
  restitution: number;
  forceUpdate: React.Dispatch<React.SetStateAction<number>>;
}) {
  const frame = useRef(0);
  useFrame((_, delta) => {
    if (paused) return;

    frame.current++;

    const newBodies = [...bodiesRef.current];

    //process all physics for all bodies in one place
    for (let i = 0; i < bodiesRef.current.length; i++) {
      const body = bodiesRef.current[i];
      const trail = [...body.trail];
      const pos = new THREE.Vector3(...body.position);
      const collidedVel = new THREE.Vector3(...body.velocity);
      const nonCollidedVel = collidedVel.clone();
      let collided = false;
      //check collisions with all other bodies
      for (let j = 0; j < bodiesRef.current.length; j++) {
        if (i === j) continue;
        const otherBody = bodiesRef.current[j];
        const otherPos = new THREE.Vector3(...otherBody.position);
        const directionFromOtherBody = otherPos.clone().sub(pos);
        const distanceBetweenBodies = directionFromOtherBody.length();
        const distanceToCollision = body.radius + otherBody.radius;

        if (enableCollision && distanceBetweenBodies < distanceToCollision) {
          collided = true;
          //normal Vec
          const normal = directionFromOtherBody.clone().normalize();

          //relative velocity
          const relativeVelocity = collidedVel
            .clone()
            .sub(new THREE.Vector3(...otherBody.velocity));

          const speed = relativeVelocity.dot(normal);

          if (speed < 0) continue; //bodies are moving away, don't do anything

          //impulse scalar
          const impulseMagnitude =
            (-(1 + restitution) * speed) / (1 / body.mass + 1 / otherBody.mass);

          //impulse vectors
          const impulse = normal.clone().multiplyScalar(impulseMagnitude);

          //update velocities
          collidedVel.add(impulse.clone().multiplyScalar(1 / body.mass));
          const newOtherVelocity = new THREE.Vector3(...otherBody.velocity).sub(
            impulse.clone().multiplyScalar(1 / otherBody.mass)
          );

          //update otherBody's velocity
          newBodies[j] = {
            ...otherBody,
            velocity: [
              newOtherVelocity.x,
              newOtherVelocity.y,
              newOtherVelocity.z,
            ],
          };
        } else if (!collided) {
          //when collision is disabled, we want to ignore the gravity inside most of the collision radius because it gets too strong
          if (
            !enableCollision &&
            distanceBetweenBodies < distanceToCollision * 0.6
          ) {
            continue;
          }
          const forceMagnitude =
            (G * (body.mass * otherBody.mass)) /
            (distanceBetweenBodies * distanceBetweenBodies);
          const force = directionFromOtherBody
            .normalize()
            .multiplyScalar(forceMagnitude);
          nonCollidedVel.add(force.multiplyScalar(delta / body.mass));
        }
      }
      if (!collided) {
        pos.add(nonCollidedVel.clone().multiplyScalar(delta));
      } else {
        pos.add(collidedVel.clone().multiplyScalar(delta));
      }
      if (frame.current % 10 === 0) {
        trail.push([pos.x, pos.y, pos.z]);
        if (trail.length > 500) {
          trail.shift();
        }
      }
      //update body and trail
      newBodies[i] = {
        ...body,
        position: [pos.x, pos.y, pos.z],
        velocity: collided
          ? [collidedVel.x, collidedVel.y, collidedVel.z]
          : [nonCollidedVel.x, nonCollidedVel.y, nonCollidedVel.z],
        trail,
      };
      forceUpdate((prev) => prev + 1);
    }

    bodiesRef.current = newBodies;
  });

  return null;
}

function Body(
  props: ThreeElements["mesh"] & {
    color: string;
    radius: number;
    trail: [number, number, number][];
  }
) {
  const meshRef = useRef<THREE.Mesh>(null);
  return (
    <>
      <mesh ref={meshRef} position={props.position} {...props}>
        <sphereGeometry args={[props.radius, 32, 32]} />
        <meshStandardMaterial color={props.color} />
      </mesh>
      {props.trail.length > 1 && (
        <Line
          points={props.trail}
          color={props.color}
          lineWidth={2}
          dashed={false}
        />
      )}
    </>
  );
}

type Body = {
  position: [number, number, number];
  velocity: [number, number, number];
  color: string;
  mass: number;
  radius: number;
  trail: [number, number, number][];
};

function App() {
  const bodiesRef = useRef<Body[]>([
    {
      position: [(Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10],
      velocity: [(Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2],
      mass: 1,
      radius: 0.5,
      color: "hotpink",
      trail: [],
    },
    {
      position: [(Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10],
      velocity: [(Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2],
      mass: 1,
      radius: 0.5,
      color: "green",
      trail: [],
    },
    {
      position: [(Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10],
      velocity: [(Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2],
      mass: 1,
      radius: 0.5,
      color: "blue",
      trail: [],
    },
  ]);
  const [paused, setPaused] = useState(false);
  const [G, setG] = useState(10);
  const [enableCollision, setEnableCollision] = useState(true);
  const [restitution, setRestitution] = useState(1);
  const colorOptions = [
    "hotpink",
    "green",
    "blue",
    "red",
    "yellow",
    "purple",
    "orange",
    "brown",
    "gray",
    "white",
  ];
  const [_, forceUpdate] = useState(0); //only trigger re-renders when necessary

  return (
    <>
      <div className="flex flex-col justify-center items-center h-screen w-screen">
        <div className="flex h-15 p-3 bg-gray-800 flex-row justify-center gap-3 items-center w-full">
          <button
            className="bg-blue-500 text-white p-2 rounded-md"
            onClick={() => {
              //adds a single body with random position and velocity
              bodiesRef.current.push({
                position: [
                  (Math.random() - 0.5) * 10,
                  (Math.random() - 0.5) * 10,
                  (Math.random() - 0.5) * 10,
                ],
                velocity: [
                  (Math.random() - 0.5) * 2,
                  (Math.random() - 0.5) * 2,
                  (Math.random() - 0.5) * 2,
                ],
                mass: 1 + Math.random() * 2,
                radius: 0.3 + Math.random() * 0.7,
                color:
                  colorOptions[
                    Math.floor(Math.random() * colorOptions.length)
                  ],
                trail: [],
              });
              forceUpdate((prev) => prev + 1);
            }}
          >
            Add Body
          </button>
          <button
            className="bg-blue-500 text-white p-2 rounded-md"
            onClick={() => {
              setPaused(!paused);
            }}
          >
            {paused ? "Resume" : "Pause"}
          </button>
          <button
            className="bg-blue-500 text-white p-2 rounded-md"
            onClick={() => {
              bodiesRef.current = [];
              forceUpdate((prev) => prev + 1);
            }}
          >
            Clear
          </button>
          <button
            className="bg-blue-500 text-white p-2 rounded-md"
            onClick={() => {
              setEnableCollision(!enableCollision);
            }}
          >
            {enableCollision ? "Disable Collision" : "Enable Collision"}
          </button>
          <div className="flex flex-col justify-center items-center text-white">
            <div>
              <label>
                G: {G.toFixed(2)}
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={G}
                  onChange={(e) => setG(Number(e.target.value))}
                />
              </label>
            </div>
          </div>
          <div className="flex flex-col justify-center items-center text-white">
            <div>
              <label>
                Restitution (bounce factor): {restitution.toFixed(2)}
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={restitution}
                  onChange={(e) => setRestitution(Number(e.target.value))}
                />
              </label>
            </div>
          </div>
        </div>
        <div className="w-full h-full">
          <Canvas camera={{ position: [0, 0, 20] }}>
            <axesHelper args={[10]} />
            <OrbitControls
              makeDefault
              minDistance={5}
              maxDistance={100}
            />
            <ambientLight intensity={Math.PI / 2} />
            <spotLight
              position={[10, 10, 10]}
              angle={0.15}
              penumbra={1}
              decay={0}
              intensity={Math.PI}
            />
            <pointLight
              position={[-10, -10, -10]}
              decay={0}
              intensity={Math.PI}
            />

            <PhysicsSystem
              bodiesRef={bodiesRef}
              G={G}
              paused={paused}
              enableCollision={enableCollision}
              restitution={restitution}
              forceUpdate={forceUpdate}
            />
            {bodiesRef.current.map((body, index) => (
              <Body
                key={index}
                radius={body.radius}
                color={body.color}
                position={body.position}
                trail={body.trail}
              />
            ))}
          </Canvas>
        </div>
      </div>
    </>
  );
}

export default App;
