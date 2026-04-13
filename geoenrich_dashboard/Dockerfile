FROM tiangolo/uwsgi-nginx-flask:python3.10

RUN apt-get update
RUN apt-get install nano ffmpeg libsm6 libxext6 redis-server -y

RUN pip install git+https://github.com/morand-g/geoenrich
RUN pip install flask-socketio redis celery

RUN echo "cache_path: /home/data/" > /usr/local/lib/python3.10/site-packages/geoenrich/data/config.yml
RUN echo "HTTP.NETRC=/root/.netrc" > /root/.dodsrc