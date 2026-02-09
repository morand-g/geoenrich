import os
import pandas as pd
from flask import Flask, render_template, request, Response, send_from_directory, jsonify
from celery import Celery
from geoenrich.dataloader import *
from geoenrich.enrichment import *
from geoenrich.exports import *
from pathlib import Path

from geoenrich.satellite import get_var_catalog

app = Flask(__name__)

# enable debugging mode
app.config["DEBUG"] = False

# App variables
app.config['UPLOAD_FOLDER'] = 'static/uploads/'
app.config['UPLOAD_EXTENSIONS'] = ['.csv']
app.config['DS_REF'] = ''
app.config['CELERY_BROKER_URL'] = 'redis://localhost:6379/0'
app.config['CELERY_RESULT_BACKEND'] = 'redis://localhost:6379/0'

celery = Celery(app.name, broker=app.config['CELERY_BROKER_URL'])
celery.conf.update(app.config)

# Directory for enrichment outputs
OUTPUT_DIR = "data/useroutputs/"  

# Root URL
@app.route('/')
def index():
    return render_template('dashboard.html')

# Process uploaded file
@app.route("/uploadFile", methods=['POST'])
def uploadFiles():
    uploaded_file = request.files['file']
    if uploaded_file.filename != '':

        # Handle file
        csv_filepath = os.path.join(app.config['UPLOAD_FOLDER'], uploaded_file.filename)
        uploaded_file.save(csv_filepath)
        app.config['DS_REF'] = uploaded_file.filename.split('.')[0]


        # Create enrichment file if needed
        if not Path(biodiv_path / uploaded_file.filename).exists():

            # Guess column names
            lat_col, lon_col, date_col = 'latitude', 'longitude', 'date'
            colnames = pd.read_csv(csv_filepath, nrows=0).columns.tolist()
            for col in colnames:
                if col.lower() in ['latitude', 'y', 'lat', 'decimallatitude']:
                    lat_col = col
                elif col.lower() in ['longitude', 'x', 'lon', 'decimallongitude']:
                    lon_col = col
                elif col.lower() in ['date', 'eventdate']:
                    date_col = col

            # Try loading uploaded file as occurrences, and if it doesn't work, as areas
            try:
                df = import_occurrences_csv(
                    path=csv_filepath,
                    id_col='id', date_col=date_col, lat_col=lat_col, lon_col=lon_col
                )
            except:
                df = load_areas_file(csv_filepath)

            create_enrichment_file(df, app.config['DS_REF'])

    return '', 204


@app.route("/addVariables", methods=['POST'])
def add_variables():

    dataset_ref = app.config['DS_REF']

    variables = request.form['selectedVariablesList'].split(',')[1:]
    geo_buff = int(request.form['bufferInput'])
    depth_request = request.form['depthMode']

    for v in variables:

        _, enrichment_metadata = load_enrichment_file(dataset_ref)
        enrichments = enrichment_metadata['enrichments']
        enrichment_id = get_enrichment_id(enrichments, v, geo_buff, time_buff=(0,0), depth_request=depth_request, downsample={})

        if enrichment_id == -1:
            if len(enrichments):
                enrichment_id = max([en['id'] for en in enrichments]) + 1
            else:
                enrichment_id = 1
            
            save_enrichment_config(dataset_ref, enrichment_id, v, geo_buff, time_buff=(0,0), depth_request=depth_request, downsample={})
            push_status(enrichment_id, 'PENDING')

    return '', 204



@celery.task(bind=True)
def push_status(self, enrichment_id, status):

    self.update_state(task_id=str(enrichment_id), state=status)

@app.route("/enrich/<enrichment_id>", methods=['POST'])
def enrich_route():
        
        # var_id = request.form['var_id']
        # geo_buff = int(request.form['geo_buff'])
        # time_buff = [int(request.form['tbuff1']), int(request.form['tbuff2'])]

        # if request.form.get('checkbox'):
        #     depth_request = 'all'
        # else:
        #     depth_request = 'surface'


        # Run enrichment


        enrich(ds_ref, var_id, geo_buff, time_buff, depth_request)
        produce_stats(ds_ref, var_id, out_path=OUTPUT_DIR)


        # Build download link
        download_link = f"http://localhost:8080/download/{ds_ref}"


        return render_template('download.html', link=download_link)


# Dynamic download route
@app.route("/download/<ds_ref>")
def download(ds_ref):
    stats_filename = f"{ds_ref}_1_stats.csv"
    return send_from_directory(OUTPUT_DIR, stats_filename, as_attachment=True)


# Provide stats file
@app.route("/getStats")
def getStats():
    ds_ref = app.config['DS_REF']
    stats_filename = f"{ds_ref}_1_stats.csv"
    return send_from_directory(
        OUTPUT_DIR, 
        stats_filename, 
        as_attachment=True
    )

#get var list
@app.route("/get_var_catalog")
def get_var_catalog_api():
    catalog = get_var_catalog()
    return jsonify(list(catalog.keys()))

# Run app
if (__name__ == "__main__"):
    app.run(host='0.0.0.0', port=8080, debug=True)
