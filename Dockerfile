FROM andrewosh/binder-base

USER main

RUN git clone https://github.com/Anaconda-Server/nbpresent.git

WORKDIR nbpresent

# conda packages (preferred)
RUN conda install \
  -c javascript \
  -c nbcio \
  npm \
  bokeh \
  bqplot \
  nbbrowserpdf

RUN pip install qgrid

RUN npm install && npm run dist
RUN python setup.py develop
RUN jupyter nbextension install \
  --prefix="${CONDA_ENV_PATH}" \
  nbpresent/static/nbpresent
