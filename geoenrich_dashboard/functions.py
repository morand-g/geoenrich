from geoenrich.enrichment import *
from pathlib import Path


def enrich_wrapper(ds_ref):

    # Run enrichment
    enrich(ds_ref, var_id, geo_buff, time_buff, depth_request)
    produce_stats(ds_ref, var_id, out_path=OUTPUT_DIR)