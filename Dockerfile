# AutFlow — landing estática servida con nginx
FROM nginx:1.27-alpine

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY landing-autflow.html /usr/share/nginx/html/index.html
COPY assets /usr/share/nginx/html/assets
COPY css    /usr/share/nginx/html/css
COPY js     /usr/share/nginx/html/js

EXPOSE 80
