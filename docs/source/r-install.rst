Installation instructions for R
===============================


1. Prerequisites
----------------

You must have installed R on your computer, as well as Python3 and pip. This is automatic in all recent Linux distributions. Otherwise instructions are available here: `Python <https://wiki.python.org/moin/BeginnersGuide/Download>`_ and `pip <https://pip.pypa.io/en/stable/installation/>`_.

If you want to use Copernicus data, you need to install Copernicus Marine API (`instructions <https://help.marine.copernicus.eu/en/articles/7970514-copernicus-marine-toolbox-installation>`_) and set it up with your Copernicus account (`instructions <https://help.marine.copernicus.eu/en/articles/8185007-copernicus-marine-toolbox-credentials-configuration>`_).


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

The first time you import the dataloader or enrichment module, it will display the location of the *credentials_example.py* configuration file. You will need to edit it and then remove *_example* from the file name so its name is just *credentials.py*. You can also get the location by typing ``dataloader$'__file__'`` in R.

In this file, you need to specify the *root_path* where all persistent data will be stored. You should pick a stable location with plenty of free space available (depending on your data download needs).

3.1.2. Credentials
""""""""""""""""""

If you want to use services that require authentification, you need to specify your credentials in the same file.
You will see 3 variables that need to be filled with GBIF credentials if you want to download occurrence data from GBIF. If you don't already have an account you can register on the `GBIF website <https://www.gbif.org/user/profile/>`_.

There is also a dictionary named *dap_creds* that is intended to store credentials to OpenDAP servers. The server domains are the keys, like the example provided for Copernicus. You can add as many credentials as you need into that dictionary.


.. warning::
  If there are reserved characters in your username or password, you need to replace them with the %XX code as you would in an URL (eg. replace '@' by '%40'). See the full list below.


===	===	===	===	===	===	===	===	===	===	===	===	===	===	===	===	===	===	===	===	===
␣	!	"	#	$	%	&	'	(	)	*	+	,	/	:	;	=	?	@	[	] 
%20	%21	%22	%23	%24	%25	%26	%27	%28	%29	%2A	%2B	%2C	%2F	%3A	%3B	%3D	%3F	%40	%5B	%5D
===	===	===	===	===	===	===	===	===	===	===	===	===	===	===	===	===	===	===	===	===



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