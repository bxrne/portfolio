---
title: "Launchrail (WIP)"
description: "High powered rocketry simulator for competition launches"
date: "Dec 20 2024"
demoURL: "https://pkg.go.dev/github.com/bxrne/launchrail"
repoURL: "https://github.com/bxrne/launchrail"
---

> Not even MVP yet, numbers in and numbers out 

This is a work in progess, as part of my Final Year Project (BSc component of my course). I opted to work on a passion project, and decided to build a high powered rocketry simulator for competition launches. The project is written in Go, and is a CLI application. The project is still in its early stages, but I have a lot of ideas for it. I will be updating this page as I make progress on the project.

The motivation behind it is due to my experience with other simulators when preparing for competitions. I have used RockSim (which is really for model rockets), OpenRocket (mainly a design tool and reasonably accurate up to Mach 1.5) and RocketPy which is a huge library and very extensive but hard to use and not very user friendly. I wanted to build something that was easy to use, and could be used for competition launches.

Part of my motivation has been neovim and its lua based plugin system, adding a feature like this could make a simulator much more useful and allow for experiments or optional features in a richer manner. My thesis question is looking to find out if one can use option volatility modelling to improve atmospheric turbulence modelling as many simulators use the ISA model which considers blocks of km's of altitude as having the same temperature, density and pressure which in turn affects the speed of sound and the drag coefficient (roughly speaking).

I am leveraging the work Sanko Niskaenen did in building OpenRocket for his master's thesis, it is the status quo design tool for these competitions and provides really good simulations. I want to add things like locality of the launch, the atmospheric modelling experiment and allow for benchmarking designs against each other along with simulation playback with some bells and whistles like landing radius which would go a long way into taking effort out of the design review and reporting process for competitions (usually 2/3 reviews of structures/manufacturing process and integrity as well as simulations to verify overall flight envelope and safety).

The engine will simulate the rocket under 6DOF (degrees-of-freedom) and utilises the [thrustcurves database](https://thrustcurve.org) which allows you just to give the *designation* which follows the format `TotalImpulse-Class-AverageThrust-DelayTime-Variant` (e.g. "269H110-14A" is a valid designation) - The H is the class, J is 2x, K is 2x J etc. The thrust curve is a CSV file that is downloaded. The engine will interpolate the thrust curve to get the thrust at any given time.  The engine will also simulate the rocket under the influence of the atmosphere, and will take into account the rocket's mass, drag, and the thrust of the motor. The engine will also simulate the rocket's parachute deployment and descent.

I am building the engine in Go. Why?

- I know this language well, and I am comfortable with it. (not the best reason but I am on a deadline here)
- I like the concurrency model, channels let me do some cool things (my parasite system in the ECS for example)
- Cross platform support is a big plus, I can run this on my Mac and Linux machines without any issues (this turned out not to be true - plugins are a pain to build on Windows)
- I can install my engine on a machine with the Go toolchain as [pkg.go.dev](https://pkg.go.dev/github.com/bxrne/launchrail) indexes repos and provides documentation for them 
- Godoc will document my code - saves me a lot of work
