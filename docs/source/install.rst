Installation instructions for Python
====================================


1. Work environment
-------------------

This package was tested on Ubuntu 20.04 with Python 3.8 and on Ubuntu 22.04 with Python 3.10.
It should work on other operating systems and with other versions of Python 3, but this wasn't tested yet.

2. Prerequisites
----------------

Assuming you have Python3 and pip installed. This is automatic in all recent Linux distributions. Otherwise instructions are available here: `Python <https://wiki.python.org/moin/BeginnersGuide/Download>`_ and `pip <https://pip.pypa.io/en/stable/installation/>`_.

3. Installation
---------------

Installation of geoenrich is done in the classic way::

	python3 -m pip install geoenrich


4. Configuration
----------------

4.1. First configuration
^^^^^^^^^^^^^^^^^^^^^^^^

4.1.1. Root folder for geoenrich
""""""""""""""""""""""""""""""""

Geoenrich data is cached locally to avoid downloading the same data multiple times. By default, the cache is stored in your home path, in a geoenrich_cache subfolder. If you want ot change that, you can edit the config.yml file that is located in the same folder as the geoenrich package (you can find the location of that folder by running ``print(geoenrich.__file__)`` in Python).

4.1.2. Credentials
""""""""""""""""""

Some data sources require authentification. Please follow the instructions in the `available variables page <https://geoenrich.readthedocs.io/en/latest/variables.html>`_ to set up your credentials properly.


4.2. Adding other data sources
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

At the same location (``print(geoenrich.__file__)``), there is a *catalog.csv* file that already contains a list of available variables. 

If you need additional variables, you can add a *personal_catalog.csv* file to the same folder (template on `GitHub <https://github.com/morand-g/geoenrich/blob/main/geoenrich/data/personal_catalog.csv>`_). Three columns are compulsory:

- *variable*: A unique name for that variable (user defined). It needs to be different from the variable names already in the built-in catalog.
- *url*: OpenDAP URL.
- *varname*: Name of the variable in the remote dataset.

If the required variable is from a Copernicus data set, the fields are slightly different:

- *variable*: A unique name for that variable (user defined). It needs to be different from the variable names already in the built-in catalog.
- *source*: Must be set to "Copernicus"
- *url*: Copernicus Dataset ID
- *varname*: Name of the variable in the remote dataset.

6. Using the package
--------------------

Congrats, you can now use the `tutorial <https://geoenrich.readthedocs.io/en/latest/tutorial.html>`_ and start doing science!