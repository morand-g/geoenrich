FROM tiangolo/uwsgi-nginx-flask:python3.10

RUN apt-get update
RUN apt-get install ffmpeg libsm6 libxext6 -y

RUN pip install git+https://github.com/morand-g/geoenrich@develop
RUN python3 -m pip install python-dotenv

RUN echo "cache_path: /app/data/" > /usr/local/lib/python3.10/site-packages/geoenrich/data/config.yml
RUN echo "HTTP.NETRC=/root/.netrc" > /root/.dodsrc