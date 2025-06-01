---
title: "Launchrail"
description: "High powered rocketry simulator for competition launches"
date: "May 14 2025"
demoURL: "https://pkg.go.dev/github.com/bxrne/launchrail"
repoURL: "https://github.com/bxrne/launchrail"
---

Launchrail is a high-precision rocketry simulation engine designed specifically for competition rocketry. Written in Go, this CLI application provides accurate 6DOF (six degrees of freedom) simulations for high-power rocketry, with a focus on usability and extensibility for competition teams.

## Background & Motivation

Having competed in rocketry competitions, I found existing simulation tools lacking for high-power rocketry needs. While tools like RockSim (better suited for model rockets), OpenRocket (accurate up to ~Mach 1.5), and RocketPy (powerful but complex) exist, none provided the right balance of accuracy, performance, and usability for competition scenarios. Launchrail was born from the need for a purpose-built tool that could handle the demands of high-power rocketry while remaining accessible to student teams.

## Technical Approach

Launchrail implements a plugin architecture inspired by Neovim's Lua-based system, allowing for extensibility and experimentation. A key innovation in this project is the implementation of improved atmospheric modeling that goes beyond the standard ISA (International Standard Atmosphere) model. While many simulators treat atmospheric conditions as constant across kilometer-scale altitude blocks, Launchrail implements a more granular approach that better accounts for local variations in temperature, density, and pressure.

My research explored using option volatility modeling techniques to enhance atmospheric turbulence modeling, leading to more accurate predictions of rocket behavior, particularly in transonic and supersonic regimes where traditional models often fall short.

## Key Features

- **6DOF Simulation**: Full six degrees of freedom simulation for accurate flight dynamics

- **Plugin System**: Extensible architecture for custom simulations and experiments

- **Advanced Atmospheric Modeling**: Improved turbulence and weather modeling over traditional ISA models

- **Competition-Focused Tools**: Built-in support for competition requirements including:
  - Launch site-specific conditions
  - Design benchmarking and comparison
  - Simulation playback and analysis
  - Landing radius prediction
  - Automated reporting for design reviews

- **Integration with ThrustCurve**: Direct access to [thrustcurves database](https://thrustcurves.org) for motor data

- **Cross-Platform**: Runs anywhere Go is supported, with pre-built binaries for major platforms

## Technical Implementation

### Core Simulation

Launchrail implements a robust 6DOF simulation engine that models:

- Thrust curves (with automatic downloading and interpolation from ThrustCurve.org)
- Aerodynamic forces and moments
- Mass properties including propellant burn
- Parachute deployment and descent
- Wind and atmospheric effects

### Go Implementation

Built in Go, Launchrail leverages several powerful features:

- **Concurrency Model**: Utilizes goroutines and channels for efficient simulation
- **Performance**: Compiled language provides excellent performance for numerical computations
- **Cross-Platform**: Single binary deployment across platforms (with some platform-specific considerations for plugins)
- **Documentation**: Automatic API documentation via [pkg.go.dev](https://pkg.go.dev/github.com/bxrne/launchrail)
- **Dependency Management**: Go modules for clean dependency management

## Results & Impact

Launchrail has demonstrated significant improvements in simulation accuracy, particularly in transonic and supersonic flight regimes where traditional simulators often struggle. The plugin system has proven valuable for research and customization, allowing teams to adapt the simulator to their specific needs.

The project successfully addressed the original thesis question, showing that advanced modeling techniques from financial mathematics can indeed improve atmospheric turbulence modeling in rocketry simulations.

## Getting Started

```bash
go install github.com/bxrne/launchrail@latest
```

For detailed documentation, see the [GitHub repository](https://github.com/bxrne/launchrail).

## Future Work

While the core project is complete, potential future enhancements include:

- Improved GUI interface
- Expanded plugin ecosystem
- Additional atmospheric models
- Integration with common CAD tools
- Enhanced visualization capabilities
