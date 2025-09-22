from email.mime.multipart import MIMEMultipart
import os
from datetime import datetime
import pandas as pd
import smtplib
from email.mime.text import MIMEText
from flask import Flask, render_template, request, Response, send_from_directory
from geoenrich.dataloader import import_occurrences_csv, load_areas_file
from geoenrich.enrichment import create_enrichment_file, enrich
from geoenrich.exports import produce_stats
from dotenv import load_dotenv
from pathlib import Path


latdict = {'latitude': 'latitude', 'decimallatitude': 'latitude', 'lat': 'latitude'}
londict = {'longitude': 'longitude', 'decimallongitude': 'longitude', 'lon': 'longitude'}

app = Flask(__name__)

# enable debugging mode
app.config["DEBUG"] = False

# App variables
app.config['UPLOAD_FOLDER'] = 'static/uploads/'
app.config['UPLOAD_EXTENSIONS'] = ['.csv']
app.config['MAX_CONTENT_LENGTH'] = 20 * 1024 * 1024  # Maximum filesize of 20MB
app.config['DS_REF'] = ''

# Directory for enrichment outputs
OUTPUT_DIR = "data/useroutputs/"  
SMTP_HOST = os.getenv("SMTP_HOST")  # default fallback
print(SMTP_HOST)
#Mail connection
def send_email(to_email, message):
    sender = "no-reply@umontpellier.fr"
    msg = MIMEMultipart()
    msg["Subject"] = "GeoEnrich - Notification"
    msg["From"] = sender
    msg["To"] = to_email
    msg.attach(MIMEText(message, "plain"))
    SMTP_HOST = os.getenv("SMTP_HOST")  # default fallback
    SMTP_PORT = int(os.getenv("SMTP_PORT", 25))
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.sendmail(sender, [to_email], msg.as_string())

# Root URL
@app.route('/')
def index():
    return render_template('home.html')

# Process uploaded file
@app.route("/", methods=['POST'])
def uploadFiles():
    uploaded_file = request.files['file']
    if uploaded_file.filename != '':
        csv_filepath = os.path.join(app.config['UPLOAD_FOLDER'], uploaded_file.filename)
        uploaded_file.save(csv_filepath)
        var_id = request.form['var_id']
        geo_buff = int(request.form['geo_buff'])
        time_buff = [int(request.form['tbuff1']), int(request.form['tbuff2'])]

        if request.form.get('checkbox'):
            depth_request = 'all'
        else:
            depth_request = 'surface'

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

        # Unique dataset reference
        ds_ref = datetime.now().__str__().replace(' ', '_').replace(':', '-')

        # Run enrichment
        app.config['DS_REF'] = ds_ref
        create_enrichment_file(df, ds_ref)
        enrich(ds_ref, var_id, geo_buff, time_buff, depth_request, maxpoints=2000000)
        produce_stats(ds_ref, var_id, out_path=OUTPUT_DIR)

        # Remove uploaded file
        os.remove(csv_filepath)

        # Build download link
        download_link = f"http://localhost:8080/download/{ds_ref}"

        # Retrieve email from form
        user_email = request.form.get("user_email")
        
        # Send email notification if user_email is provided
        if user_email:
            send_email(user_email, f"✅ Your enrichment {ds_ref} is complete!\nDownload: {download_link}")

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

# Run app
if (__name__ == "__main__"):
    app.run(host='0.0.0.0', port=8080, debug=True)
