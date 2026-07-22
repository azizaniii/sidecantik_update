# Stage 1: Build
FROM node:22-alpine as builder
WORKDIR /app
COPY package*.json ./
# Menggunakan npm install agar tidak error jika lockfile tidak sinkron
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine
RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
