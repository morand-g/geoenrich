FROM tiangolo/uwsgi-nginx-flask:python3.10

RUN apt-get update
RUN apt-get install ffmpeg libsm6 libxext6 -y

RUN python3 -m pip install geoenrich

RUN rm /app/*
RUN curl https://raw.githubusercontent.com/morand-g/geoenrich/main/docker/initialize.py -o /home/initialize.py

RUN old_path="'./'" && new_path="'/app/data/'" && sed -i "s%$old_path%$new_path%g" /usr/local/lib/python3.10/site-packages/geoenrich/credentials_example.py
