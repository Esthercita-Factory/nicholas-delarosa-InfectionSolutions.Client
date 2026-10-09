# Portal de clientes (Angular) servido por Nginx.
#   docker build -t infectionsolutions-client .
#   docker run -p 8082:8080 -e API_UPSTREAM=http://host.docker.internal:5120 infectionsolutions-client
#
# Nginx sirve el build y reenvia /api a la API (API_UPSTREAM): el navegador ve un solo
# origen, asi que no hace falta CORS y el build de produccion usa apiUrl = '/api'.

FROM node:22-alpine AS build
WORKDIR /app

# Primero las dependencias: quedan en cache mientras package-lock.json no cambie.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

# Imagen sin root (escucha en 8080). Las plantillas de /etc/nginx/templates se procesan
# con envsubst al arrancar: asi API_UPSTREAM se puede cambiar sin reconstruir la imagen.
FROM nginxinc/nginx-unprivileged:alpine AS final
ENV API_UPSTREAM=http://api:8080
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist/infectionsolutions-client/browser /usr/share/nginx/html
EXPOSE 8080
