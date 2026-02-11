# Geoenrich Dashboard

The **Geoenrich Dashboard** web app may be useful to you if you want to download many variables on a large data set, as a way to track your progress.
This subfolder contains all needed files to run it in a web browser.

## Instructions

First open `docker-compose.yaml`, there are some adjustments to make:
- To use your custom variables, enter the path to your local geoenrich installation in the left part of lines 9 and 33.
- Indicate the path where you want to store data in the left part of lines 10 and 34.

Then you can run `docker compose up --build` and access the app in your browser by typing `localhost:8081`.