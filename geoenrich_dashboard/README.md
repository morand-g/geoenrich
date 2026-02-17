# Geoenrich Dashboard

The **Geoenrich Dashboard** web app may be useful to you if you want to download many variables on a large data set, as a way to track your progress.
This subfolder contains all needed files to run it in a web browser.

## Instructions

First open `docker-compose.yaml`, there are some adjustments to make:
- Indicate the path where you want to store data in the left part of lines 10 and 34.
- In that folder, you can put personal_catalog.csv ans .dodsrc files (see geoenrich documentation)

Then you can run `docker compose up --build` and access the app in your browser by typing `localhost:8081`.