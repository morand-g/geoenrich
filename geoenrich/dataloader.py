"""
This module provides functions to load input data before enrichment.
The package supports two types of input: occurrences or areas.
Occurrences can be loaded straight from GBIF, from a local DarwinCore archive, or from a custom csv file.
Areas have to be loaded from a csv file. See :func:`geoenrich.dataloader.load_areas_file`.
"""

from pathlib import Path
import pandas as pd
import geopandas as gpd

from dwca.read import DwCAReader

import geoenrich

import yaml

pd.options.mode.chained_assignment = None


############################# Loading paths ###########################

def load_paths():

    """
    Loads paths for caching biodiversity and satellite data. If the config.yml file does not exist, it creates it and sets the cache path to a geoenrich_cache folder in the user's home directory.

    Args:
        None
    Returns:
        tuple: (biodiv_path, sat_path)
    """

    conf_path = Path(geoenrich.__file__).parent / 'data' / 'config.yml'

    if not conf_path.exists():
        with open(conf_path, 'w') as f:
            yaml.dump({}, f)
        
        cache_path = Path.home() / 'geoenrich_cache'

    else:

        with open(Path(geoenrich.__file__).parent / 'data' / 'config.yml', 'r') as f:
            conf = yaml.load(f, Loader=yaml.SafeLoader)

        if 'cache_path' in conf:
            cache_path = Path(conf['cache_path'])
        else:
            cache_path = Path.home() / 'geoenrich_cache'


    with open(Path(geoenrich.__file__).parent / 'data' / 'config.yml', 'w') as f:
        conf = {'cache_path': str(cache_path)}
        yaml.dump(conf, f)



    biodiv_path = cache_path / 'biodiv'
    sat_path = cache_path / 'sat'

    if not biodiv_path.exists():
        biodiv_path.mkdir()

    if not sat_path.exists():
        sat_path.mkdir()

    return(biodiv_path, sat_path)


############# Load paths at import to avoid having to load them multiple times in different functions #############
biodiv_path, sat_path = load_paths()


############################ Loading input files ###########################


def open_dwca(path = None, taxonKey = None, max_number = 10000):


    """
    Load data from DarwinCoreArchive located at given path.
    If no path is given, try to open a previously downloaded gbif archive for the given taxonomic key.
    Remove rows with a missing event date. Return a geodataframe with all occurrences if fewer than max_number.
    Otherwise, return a random sample of max_number occurrences.
    
    Args:
        path (str): Path to the DarwinCoreArchive (.zip) to open.
        taxonKey (int): Taxonomic key of a previously downloaded archive from GBIF.
        max_number (int): Maximum number of rows to import. A random sample is selected.
    Returns:
        GeoDataFrame: occurrences data (only relevant columns are included)
    """

    # Load file

    if path is None:
        path = biodiv_path / 'gbif' / (str(taxonKey) + '.zip')

    dsA = DwCAReader(path)

    columns = ['id', 'eventDate', 'decimalLatitude', 'decimalLongitude', 'depth', 'basisOfRecord']
    rawdf = dsA.pd_read(dsA.descriptor.core.file_location, parse_dates=True, usecols = columns)

    rawdf = rawdf.dropna(subset = ['decimalLatitude', 'decimalLongitude'])

    # Pre-sample 2*max_number to reduce processing time.
    if len(rawdf) > 2*max_number:
        rawdf = rawdf.sample(2*max_number)

    
    # Remove rows that do not correspond with in-situ observations
    idf = rawdf[rawdf['basisOfRecord'].isin(['HUMAN_OBSERVATION', 'MACHINE_OBSERVATION', 'OCCURRENCE'])]

    # Convert Lat/Long to GEOS POINT
    idf['geometry'] = gpd.points_from_xy(idf['decimalLongitude'], idf['decimalLatitude'], idf['depth'],crs="EPSG:4326")

    # Remove rows with no event date
    idf['eventDate'] = pd.to_datetime(idf['eventDate'], errors = 'coerce')
    df = idf.dropna(subset = ['eventDate'])

    if len(df) > max_number:
        df = df.sample(max_number)
        print('Selected {} random occurrences from the dataset'.format(max_number))

    # Convert to GeoDataFrame & standardize Date
    geodf = gpd.GeoDataFrame(df[['id', 'geometry', 'eventDate']])
    geodf.set_index(pd.Index(geodf['id'].astype(str), name='id'), inplace = True)
    geodf.drop(['id'], axis='columns', inplace = True)

    print('{} occurrences were loaded.'.format(len(geodf)))
    
    return(geodf)




def import_occurrences_csv(path, id_col, date_col, lat_col, lon_col, depth_col = None, date_format = None,
                     crs="EPSG:4326", *args, **kwargs):


    """
    Load data from a custom csv file. Additional arguments are passed down to *pandas.read_csv*.
    Remove rows with a missing event date or missing coordinates.
    Return a geodataframe with all occurrences if fewer than max_number.
    Otherwise, return a random sample of max_number occurrences.
    
    Args:
        path (str): Path to the csv file to open.
        id_col (int or str): Name or index of the column containing unique occurrence ids (must be numeric).
        date_col (int or str): Name or index of the column containing occurrence dates.
        lat_col (int or str): Name or index of the column containing occurrence latitudes (decimal degrees).
        lon_col (int or str): Name or index of the column containing occurrence longitudes (decimal degrees).
        depth_col (int or str): Name or index of the column containing occurrence longitudes (meters from the surface).
        date_format (str): To avoid date parsing mistakes, specify your date format (according to strftime syntax).
        crs (str): Crs of the provided coordinates.
    Returns:
        geopandas.GeoDataFrame: occurrences data (only relevant columns are included)
    """

    # Load file
    if depth_col is None:
        columns = [id_col, date_col, lat_col, lon_col]
    else:
        columns = [id_col, date_col, lat_col, lon_col, depth_col]

    rawdf = pd.read_csv(path, usecols = columns, index_col = id_col, *args, **kwargs)
    idf = rawdf.dropna(subset = [lat_col, lon_col])

    # Remove rows with missing coordinate
    if len(rawdf) != len(idf):
        print('Dropped {} rows with missing coordinates'.format(len(rawdf) - len(idf)))
    
    # Convert Lat/Long to GEOS POINT
    if depth_col is None:
        idf['geometry'] = gpd.points_from_xy(idf[lon_col], idf[lat_col], crs=crs)
    else:
        idf['geometry'] = gpd.points_from_xy(idf[lon_col], idf[lat_col], idf[depth_col].abs(), crs=crs)

    # Remove rows with no event date
    idf['eventDate'] = pd.to_datetime(idf[date_col], errors = 'coerce', format = date_format)
    df = idf.dropna(subset = ['eventDate'])

    if len(idf) != len(df):
        print('Dropped {} rows with missing or badly formated dates'.format(len(idf) - len(df)))

    # Convert to GeoDataFrame
    geodf = gpd.GeoDataFrame(df[['geometry', 'eventDate']])
    geodf.index.names = ['id']

    print('{} occurrences were loaded.'.format(len(geodf)))
    
    return(geodf)



def load_areas_file(path, date_format = None, crs = "EPSG:4326", *args, **kwargs):


    """
    Load data to download a variable for specific areas.
    An "id" column must be present and contain a unique numeric identifier.
    Bound columns must be named *{dim}_min* and *{dim}_max*, with {dim} in latitude, longitude, date.
    Additional arguments are passed down to *pandas.read_csv*.

    Args:
        path (str): Path to the csv file to open.
        date_format (str): To avoid date parsing mistakes, specify your date format (according to strftime syntax).
        crs (str): Crs of the provided coordinates.

    Returns:
        geopandas.GeoDataFrame: areas bounds (only relevant columns are included)
    """

    rawdf = pd.read_csv(path, index_col = 'id', parse_dates = ['date_min', 'date_max'],
                infer_datetime_format = True, *args, **kwargs)
    rawdf.index.rename('id', inplace=True)
    idf = pd.DataFrame()

    if 'date_min' in rawdf.columns:
        idf['mint'] = pd.to_datetime(rawdf['date_min'], errors = 'coerce', format = date_format)
        idf['maxt'] = pd.to_datetime(rawdf['date_max'], errors = 'coerce', format = date_format)

    idf['minx'], idf['maxx'] = rawdf['longitude_min'], rawdf['longitude_max']
    idf['miny'], idf['maxy'] = rawdf['latitude_min'], rawdf['latitude_max']

    df = idf.dropna()
    if len(idf) != len(df):
        print('Dropped {} rows with missing or badly formated coordinates'.format(len(idf) - len(df)))
    
    print('{} areas were loaded.'.format(len(df)))

    return(df)
