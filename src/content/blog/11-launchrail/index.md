---
title: "launchrail: a 6DOF rocket simulator with a Black-Scholes turbulence plugin"
description: "OpenRocket files in, RK4 integration, ECS systems, and a quant-finance idea borrowed for atmospheric noise"
date: "May 14 2025"
demoURL: "#"
repoURL: "https://github.com/bxrne/launchrail"
---

> A high-powered rocket simulator written in Go. The unusual bit is the turbulence model, which treats wind as a Geometric Brownian Motion process lifted from option pricing.

## Why bother

I worked on payload and simulation for a high-powered rocketry team during my undergrad. The standard tool chain in that world is OpenRocket for design and a small set of point-tools for simulation, most of which are 1DOF or treat the rocket as a point mass with thrust and drag. That gets you altitude, but it does not get you orientation, angular response to fin sizing, off-rail dynamics, or any honest accounting of crosswind effects on a tall, slender body.

[launchrail](https://github.com/bxrne/launchrail) is the version of that tool I wanted. Six degrees of freedom, real motor curves pulled from the [ThrustCurve](https://www.thrustcurve.org/) database, an ISA atmosphere, OpenRocket `.ork` ingestion so existing designs Just Work, and an extension surface for swapping in alternative atmosphere or turbulence models. It hit v1.0.0 in May 2025 and is in maintenance mode now.

## What 6DOF actually means here

The simulation tracks six scalar degrees of freedom each tick: three translational (position in world frame) and three rotational (orientation as a unit quaternion). The central state is a `PhysicsState` struct in `pkg/states/physics.go` that carries position, velocity, acceleration, angular velocity, angular acceleration, orientation, mass, accumulated force and moment, and the body and inverse body inertia tensors, plus pointers to the rocket's components (motor, body tube, nosecone, finset, parachute).

Inertia is recomputed every tick as a solid-cylinder approximation:

| Axis | Formula |
| --- | --- |
| `Ixx` (roll) | `0.5 * m * r^2` |
| `Iyy` (pitch) | `(1/12) * m * (3 r^2 + L^2)` |
| `Izz` (yaw) | `Iyy` (axisymmetric rocket) |

The body-frame tensor is rotated into world frame each step so angular acceleration `alpha = I_world^-1 * M_world` is computed in the same frame as the integrator runs. Quaternion integration uses the small-angle axis-angle form, post-multiplied onto the current orientation and re-normalised to keep the magnitude clean over long runs.

## RK4

Translational state is integrated with classical RK4 in `pkg/simulation/simulation.go`. A closure `rkEvalLinearAccel` computes acceleration at any probe state given position, velocity, mass, current motor thrust and orientation, as `a = (F_gravity + F_thrust + F_drag) / m`.

Thrust is the instantaneous motor output rotated from the rocket's local +Y axis into world frame using the orientation quaternion. Drag is `0.5 * rho(alt) * v^2 * A_ref * Cd * (-v_hat)`, with `Cd = 0.75` as a fixed constant for v1 and `rho` from the atmosphere model. NaN/Inf guards wrap every assignment so a single bad tick cannot poison the rest of the run, and ground clamping prevents the rocket tunnelling below the launch site after touchdown.

The step size is constrained to `0 < dt <= 0.05` in two places (config validation and at the top of `Simulation.Run`). Anything coarser destabilises the angular dynamics on a 1.5 m airframe; anything much finer is wasted CPU.

## Atmosphere: a real ISA model, memoised

`pkg/atmosphere/isa.go` implements the [International Standard Atmosphere](https://en.wikipedia.org/wiki/International_Standard_Atmosphere) across five layers up to ~51 km, with the right behaviour in each: gradient layers use the temperature-lapse closed form `P = P_base * (T/T_base)^(-g0 / (L * R))`, isothermal layers use the exponential form `P = P_base * exp(-g0 * (h - h_base) / (R * T))`. Density and speed of sound fall out as `rho = P / (R T)` and `c = sqrt(gamma R T)`.

Per-altitude results are memoised in a `map[float64]AtmosphereData` keyed on `math.Round(altitude)`, behind an `sync.RWMutex`. The atmosphere call is on the hot path of every system that needs drag or Mach number, and most timesteps repeat the same metre of altitude many times over.

The model lives behind a tiny `Model` interface (two methods: `GetAtmosphere`, `GetSpeedOfSound`), which is the seam plugins use to swap in something else when the standard model is wrong for the launch site.

## OpenRocket ingestion

An `.ork` file is a ZIP wrapping an XML document. `pkg/openrocket/openrocket.go` opens the archive, finds the inner `.ork` file, and `xml.Unmarshal`s it into a tree of structs that mirrors the OpenRocket schema. Schema is split across files (`schema_airframe.go`, `schema_fins.go`, `schema_nosecone.go`, `schema_parachute.go`, `schema_motor.go`) so each component's parsing and mass/volume math live next to the type definition. `BodyTube.GetMass()` for example does the hollow-cylinder calc `V = pi * (R_outer^2 - R_inner^2) * L` so the simulator does not need to know how an `.ork` represented the tube.

One validation rule worth calling out: `Validate()` checks that the file's `Creator` attribute matches a configured OpenRocket version string. OpenRocket has changed its file format in subtle ways across major releases. Pinning to a known version is the difference between "the simulation is wrong because the inertia tensor is computed from a misparsed component" and "the simulation refuses to start".

## Real motor data, not curves on a napkin

`pkg/thrustcurves/thrustcurves.go` is a two-phase HTTP client against ThrustCurve's public API. First a `POST /api/v1/search.json` with the motor designation (`H128W`, etc.) returns a motor ID, then a `POST /api/v1/download.json` with that ID and `format: "RASP"` returns the time-thrust samples. The result lands in a `MotorData` struct holding the thrust curve, total impulse, burn time, average and peak thrust, total mass, and propellant mass. Units are converted at the boundary (the API returns grams, the simulator wants kilograms).

At simulation time the motor is an FSM (`pkg/components/motor_fsm.go`, using `looplab/fsm`) with states `idle`, `IGNITED`, `burning`, `coast`. Inside `burning`, thrust is linearly interpolated between adjacent sample points using elapsed burn time, and mass decreases linearly from `m0 + m_casing` toward `m_casing` over the burn. Three efficiency factors (`nozzleEff * combustionEff * frictionEff`) multiply the interpolated thrust; they default to 1.0 but exist so users can match their flight data.

## Why Black-Scholes turned up in a rocket simulator

Atmospheric turbulence is hard to model from first principles. The honest physical approach is to integrate Navier-Stokes against a CFD mesh, which is fine if you have a small server farm and a week, less fine if you want a launch decision before the window closes. The pragmatic alternative is to treat the wind as a stochastic process and ask which process matches observed behaviour.

Quantitative finance has a useful answer here. The Black-Scholes model treats the underlying asset price `S` as following Geometric Brownian Motion: `dS = mu * S * dt + sigma * S * dW`, where `dW` is a Wiener process increment, normally distributed with mean 0 and variance `dt`. The stochastic component contributes `sigma * S * sqrt(dt)` of standard deviation per step. Two properties make this model attractive: the noise scales with the current value (so a faster-moving rocket sees a stronger absolute perturbation, which physically corresponds to a longer pressure differential to absorb), and it is trivial to integrate inside an existing timestep without changing the dynamics elsewhere.

The `plugins/blackscholes/main.go` plugin implements exactly this against velocity:

```go
// AfterSimStep: called every tick with the post-integration state
speed  := math.Sqrt(vx*vx + vy*vy + vz*vz)
stdDev := sigma * speed * math.Sqrt(dt)
vx    += rng.NormFloat64() * stdDev
vy    += rng.NormFloat64() * stdDev
vz    += rng.NormFloat64() * stdDev
```

with `sigma = 0.05` (5% of airspeed per `sqrt(s)`) by default. The RNG is seeded from `time.Now().UnixNano()` for ad-hoc runs and pinned to seed `1` when no config is supplied, so unit tests are deterministic. Setting `sigma = 0` makes the plugin a no-op, which is the right way to A/B a turbulence model.

This is not a claim that real turbulence is GBM. It is a claim that GBM is a defensible noise envelope you can apply on top of the deterministic dynamics, with one tunable knob, that produces flight envelopes wide enough to catch the obviously fragile designs without making every Monte Carlo run look like a hurricane. A companion `plugins/windeffect` applies a sinusoidal lateral force in `BeforeSimStep` for cases where the user wants a known periodic disturbance instead.

## Plugin system: dlopen, but Go

Plugins implement a six-method interface:

```go
type SimulationPlugin interface {
    Initialize(log logf.Logger, cfg *config.Config) error
    Name()    string
    Version() string
    BeforeSimStep(state *states.PhysicsState) error
    AfterSimStep(state *states.PhysicsState) error
    Cleanup() error
}
```

`PhysicsState` is passed by pointer, so a plugin can mutate velocity, accumulated force, accumulated moment, or anything else in place. `BeforeSimStep` runs before the integrator; `AfterSimStep` runs after.

The compiler in `internal/plugin/compiler.go` walks `./plugins` at server startup and runs `go build -buildmode=plugin -o <subdir>/<name>.so .` in each plugin directory. The manager (`internal/plugin/manager.go`) then `plugin.Open`s each `.so`, looks up the exported `Plugin` symbol, casts it to `SimulationPlugin`, and calls `Initialize`. Both the GBM turbulence and sinusoidal wind ship as separate plugins to prove the interface is real and not just a placeholder.

## ECS for the simulation loop

The simulation is built on an ECS world with a slice of systems updated each tick: `PhysicsSystem` (gravity, force accumulation in a worker pool of four goroutines), `AerodynamicSystem` (drag and a simplified `Cm = -0.1 sin(2 alpha)` restoring moment from angle of attack), `LaunchRailSystem` (rail-constrained dynamics until the rocket exits the rail), `RulesSystem` (FSM that fires `Liftoff`, `Apogee`, `ParachuteDeploy`, `Landing` events), and three `StorageParasiteSystem` instances writing the motion, dynamics, and events CSVs.

The "parasite" systems are decoupled from the integrator via a buffered `chan *PhysicsState` (cap 100), so I/O cannot stall the simulation step. Reading state out for storage is a pointer copy and a channel send.

The Barrowman center-of-pressure calculator (`pkg/barrowman/calculator.go`) is the simplest area-weighted form: `CP = (CP_nose * A_nose + CP_body * A_body + CP_fins * A_fins) / sum(A)`, with the Von Karman ogive approximation `CP_nose = 0.466 * L_nose` for the nosecone contribution. Stable rockets need `CP` aft of `CG` by at least one caliber; the report calls this out explicitly.

## Web UI, deterministic record storage, reports

The server (`cmd/server/main.go`) is a stock Gin app with [a-h/templ](https://github.com/a-h/templ) for type-safe HTML templates. The interesting routes are `POST /api/v0/run` to launch a simulation, `GET /data` to list past records, `GET /explore/:hash` for an interactive Plotly view with selectable axes, and `GET /api/v0/explore/:hash/report` for a generated HTML/Markdown/JSON report.

Each run is named by `diff.CombinedHash(configJSON, orkFileBytes)`, which means the same config against the same `.ork` produces the same record directory. Re-running an identical configuration is idempotent on disk, and changing a single field bumps the hash. Records live under `~/.launchrail/records/<hash>/{MOTION,EVENTS,DYNAMICS}.csv`.

The reporting module (`internal/reporting/report.go`) loads those CSVs and computes peak altitude, max speed, rail exit velocity, burnout altitude, coast time to apogee, descent time, and landing speed. Motor metrics are recomputed from the live thrust curve: total impulse by trapezoidal integration, average thrust, specific impulse `Isp = J_total / (m_prop * g0)`, motor class via the NAR/TRA tables in `pkg/designation`. A weather block applies the latitude correction to local gravity and computes the launch site density and pressure. Plots are generated via `gonum/plot` and embedded as SVGs in the HTML report.

## Validation against real flight

`cmd/benchmark` compares simulator output against telemetry from real L1 flights flown at the EuRoC 2024 competition. The metric is per-channel deviation between simulated and recorded altitude, velocity, and orientation across the full flight envelope. v1.0.0 is calibrated against those flights to within the bounds I cared about; the gap that remains is largely down to the constant `Cd` assumption (real drag varies with Mach and angle of attack) and the absence of a real wind log on the day, which the GBM plugin is a poor substitute for.

## What is finished, what is not

v1.0.0 is the line where I called this finished for what I needed it for. Things that work and ship: 6DOF integration with RK4, the ISA atmosphere with memoisation, OpenRocket ingestion, ThrustCurve API integration, the FSM motor model, ECS systems, the launch rail constraint, the rules state machine, the plugin system with two reference plugins, the Gin + Templ UI, content-addressed record storage, HTML/Markdown/JSON reports with embedded plots, the benchmark harness against real flights, GHCR container image, CI with lint, vet, CodeQL, SonarCloud, coverage, and a benchmark workflow.

Things that are not v1.0.0 work and would be the obvious next features: a Mach- and alpha-dependent drag model in place of the constant `Cd`, multi-stage rockets (the `Sustainer`-only validation rule is intentional for now), a proper wind table loader for real launch sites, and a six-component aerodynamic model from CFD-derived coefficient tables.
