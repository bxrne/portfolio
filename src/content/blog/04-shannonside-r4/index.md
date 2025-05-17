---
title: Financial analysis and cloud platform for investment funds
date: 2025-05-09
description: Developing a cloud platform for investment funds and financial analysis tools.
---

This was my 4th residency as part of [Immersive Software Engineering](https://software-engineering.ie) and I worked with [BJF Research](https://shannonsidecapital.com) on a cloud platform for investment funds and financial analysis tools. The goal of the project set for my placement was to automate much of the processes in judging a company/opportunity for investment with LLMs and other tools.

## The Platform

Biggest thing first, since this was greenfield project and we had to build some infrastructure around our processes. Having heard good things about Terraform and Terragrunt we decided to use that for the IaaC. This was a great decision as it allowed us to build out the infrastructure in a modular way (we defined all resources as modules so we could have a shared library and prop drill variables down so we could scale SKUs and adjust names/tags neatly) and also allowed us to use the same code for different environments (dev, staging, prod); a great example is being able to scope the creation of a Postgres DB to the service it belongs to and scope the DBMS Server to the shared scope.

We dedicated a seperate stack (deployment folder) for each environment and used Terragrunt to manage the state files and dependencies between the stacks. This was a great way to manage the infrastructure and allowed us to easily spin up new environments as needed. Platform was given more isolation with its own directory, here we spun up a Container Registry (all app repos can push an image here), a Keyvault (for secrets management) and a Grafana instance (for monitoring) and an Alert Group. We kept our state for Terraform in a Storage account here.

## The apps

So every sub was the same `dev`, `test` and `prod` except the variables drilled would alter the SKU/Pricing tier of the resource depending on the sub, also names/tags would pull from the environment as would the landing page.

Keeping things simple with a landing page served by an App Gateway from raw html files using templating out of a storage account. This was a great way to get started and allowed us to add apps as small services pretty quickly (integration: +1 a href).

### Job or App?

Azure provides a lot of serverless and essentially spot instance offers on some of their compute. Functions, Container Apps, Container App Jobs, Linux Web Apps) and its not obvious which is for what exactly as they all appear to be a docker container or zip bound to a trigger.

For anything web server we used the Linux Web App as it came with a lot of auth setup that allowed you to keep auth outside of your application code and since we were using Docker containers and mapping environment variables and pulling reference values for the secrets needed this was a great fit and allowed a lot of copy paste deployments for any of the web apps (they all needed a db and some auth so this was a great way to do it).

We ran a few Postgres dbs and we kept the migrations of these dbs outside of the IaaC. As it could be the case that different subscriptions are on different migrations and in following the immutable artifacts pattern this shouldn't be an issue and would save a lot of PR back and forths. So we wrote Flyway images for all our pgSQL and pushed it to our ACR which a Container App Job was made for and set to run which would then run via a CI pipeline using the branch name to target a db (dev was main, we also had test and prod branches for ddls). This was a great way to keep the db migrations in sync and allowed us to easily roll back if needed.

## Data 

We were processing a lot of data, mostly on a schedule. There's two approaches here: cron and event driven. It proved to be faster and more maintainable t follow the dumber cron solution. The event driven was an Azure Eventgrid Topic which would trigger an event in queue similar to ROS's comms or RabbitMQ, and this could start a container job, this sometimes fell over due to id's changing or webhook endpoints not updating and required too much glue, the dumber solution to have a cron job run at the latest upload time from creation history and then run a filter on your input files based on a processing log table and skp those that suceeded was a lot easier to maintain and debug. ETLing was done in Python mainly due to time constraints and overall familiarity across the team and the ease of getting CI/CD tooling ready with it.

## Secrets

We used Azure Keyvault for secrets management and this was a great way to keep secrets out of the code. We used the Keyvault provider for Terraform to manage the secrets and this allowed us to easily rotate secrets and keep them out of the code. 

## Deployments

We almost finished the final adjustment which was a process change to make the IaaC deployments fully remote, current state was remote per environment, but we wanted to move this to a GitHub Action, which was delayed by some annoying Azure permissions issues, but once complete the workflow setup would run a plan on each PR to comment for each environment what the resource changes would be, we had Go tests to run some sanity tests like don't delete the db, linting and CodeQL, Copilot Review) this had to be approved by an admin and once merged would deploy to dev, a manual trigger with parameters for environment and branch would deploy the latest commit on the selected branch to the selected environment.

All apps were versioned with SemVer, we followed Conventional Commits and used a commitzen GitHub Action to enforce, bump version and update CHANGELOG.md.
This made iteration easy, as you could quickly flip between image tags for your apps and roll back if needed. We outsourced dependency patch management to dependabot, very good and quick gh pr bash script to merge all passing every morning.

## AI

We were doing various forms of analysis to get key indicators from raw unstructured data. Since RAG is no longer so necessary we used longer context window models to achieve the same end via Completion and Batching APIs. We were able to mix specific database content and external sources to get real insights on important indicators for valuing a company.


