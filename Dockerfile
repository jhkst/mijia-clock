FROM nginx:alpine

WORKDIR /usr/share/nginx/html

# run with docker run -d -p 8443:443 -v $(pwd):/usr/share/nginx/html bluetooth-web-server

RUN apk add --no-cache openssl \
    && mkdir -p /etc/nginx/certs \
    && openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/nginx/certs/self-signed.key \
        -out /etc/nginx/certs/self-signed.crt \
        -subj "/CN=localhost"

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/

EXPOSE 443

CMD ["nginx", "-g", "daemon off;"]
