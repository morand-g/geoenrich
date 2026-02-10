from geoenrich.enrichment import *
from pathlib import Path
from tdqm.auto import tqdm
import time

class TqdmWithCallback(tqdm):
    def __init__(self, *args, progress_callback=None, **kwargs):
        self.progress_callback = progress_callback
        self._last_emit = 0
        super().__init__(*args, **kwargs)

    def update(self, n=1):
        super().update(n)

        if not self.progress_callback or not self.total:
            return

        # throttle: 5–10 Hz
        now = time.time()
        if now - self._last_emit < 0.2:
            return

        self._last_emit = now
        self.progress_callback(self.n, self.total)


# @celery.task(bind=True)
# def enrich_wrapper(ds_ref, enrichment_params):

#     # Run enrichment
#     enrich(ds_ref, var_id, geo_buff, time_buff, depth_request)
#     produce_stats(ds_ref, var_id, out_path=OUTPUT_DIR)