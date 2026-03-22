FROM nginx:1.25-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html app.js style.css chart.min.js /usr/share/nginx/html/

EXPOSE 80
