Installation instructions for R
===============================


1. Prerequisites
----------------

You must have installed R on your computer, as well as Python3 and pip. This is automatic in all recent Linux distributions. Otherwise instructions are available here: `Python <https://wiki.python.org/moin/BeginnersGuide/Download>`_ and `pip <https://pip.pypa.io/en/stable/installation/>`_.

.. note::
  If you use Mac OS, you'll need to install the Xcode Command Line Tools: run ``xcode-select --install`` in a terminal.


2. Installation
---------------

The reticulate library is used to load the python package into R::

	install.packages("reticulate")

Then the package needs to be installed. This can be done directly in R. If you do not have conda on your computer, you will be asked to install Miniconda. You should say yes and R will take care of everything. This will isolate this python environment from your system environment::

	library(reticulate)

	py_install("geoenrich", pip = TRUE)

Finally, you can check that geoenrich submodules can be imported properly::

	dataloader <- import("geoenrich.dataloader")


3. Configuration
----------------

3.1. First configuration
^^^^^^^^^^^^^^^^^^^^^^^^

3.1.1. Root folder for geoenrich
""""""""""""""""""""""""""""""""

Geoenrich data is cached locally to avoid downloading the same data multiple times. By default, the cache is stored in your home path, in a geoenrich_cache subfolder. If you want ot change that, you can edit the config.yml file that is located in the same folder as the geoenrich package (you can find the location of that folder by running ``dataloader$'__file__'`` in R.).


3.1.2. Credentials
""""""""""""""""""

Some data sources require authentification. Please follow the instructions in the `available variables page <https://geoenrich.readthedocs.io/en/latest/variables.html>`_ to set up your credentials properly.


3.2. Adding other data sources
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

At the same location (``print(dataloader$'__file__')``), there is a *catalog.csv* file that already contains a list of available variables.

If you need additional variables, you can add a *personal_catalog.csv* file to the same folder (template on `GitHub <https://github.com/morand-g/geoenrich/blob/main/geoenrich/data/personal_catalog.csv>`_). Three columns are compulsory:

- *variable*: A unique name for that variable (user defined). It needs to be different from the variable names already in the built-in catalog.
- *url*: OpenDAP URL.
- *varname*: Name of the variable in the remote dataset.

If the required variable is from a Copernicus data set, the fields are slightly different:

- *variable*: A unique name for that variable (user defined). It needs to be different from the variable names already in the built-in catalog.
- *source*: Must be set to "Copernicus"
- *url*: Copernicus Dataset ID
- *varname*: Name of the variable in the remote dataset.

4. Using the package
--------------------

Congrats, you can now use the `tutorial <https://geoenrich.readthedocs.io/en/latest/r-tutorial.html>`_ and start doing science!