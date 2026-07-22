FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
# Menggunakan npm install --omit=dev untuk mengabaikan dependensi testing/dev
RUN npm install --omit=dev
COPY . .
EXPOSE 3001
CMD ["node", "server.js"]
