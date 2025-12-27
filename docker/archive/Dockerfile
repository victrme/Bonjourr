FROM denoland/deno:2.6.3

COPY . .

RUN apt-get update && apt-get install -y zip && rm -rf /var/lib/apt/lists/*

RUN deno install --frozen

RUN chmod +x ./docker/archive/script.sh

CMD ["docker/archive/script.sh"]
