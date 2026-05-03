FROM python:3.12-slim
WORKDIR /code
COPY ./requirements.txt /code/requirements.txt
RUN pip install --no-cache-dir -r /code/requirements.txt
COPY . /code
RUN chmod +x /code/entrypoint.sh
EXPOSE 8000
ENTRYPOINT ["/code/entrypoint.sh"]