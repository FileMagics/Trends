FROM node:18
WORKDIR /app
COPY package.json ./
RUN npm install
# 🔥 IMPORTANT
RUN npx playwright install --with-deps
COPY . .
CMD ["node", "main.js"]
