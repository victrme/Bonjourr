FROM denoland/deno:2.6.3

COPY . .

RUN deno install --frozen

RUN chmod +x ./docker/archive/script.sh

CMD ["docker/archive/script.sh"]