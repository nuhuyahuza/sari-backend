FROM node:22-alpine
# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN yarn install --production=false

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
# RUN yarn build

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 3000

# Start the application
CMD ["yarn", "dev"] 