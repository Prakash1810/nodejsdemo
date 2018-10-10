FROM node:8.12.0-alpine

MAINTAINER mohammed.niyas@beldex.org

# Create a working directory 
RUN mkdir -p /usr/src/app


# Switch to working directory
WORKDIR /usr/src/app

# Copy package.json file
COPY package.json .

# Copy contents of local folder to `WORKDIR`
# You can pick individual files based on your need
COPY . .

# Install nodemon globally
RUN npm install -g nodemon

# Install dependencies (if any) in package.json
RUN npm install --quiet

# Expose port from container so host can access 3000
EXPOSE 3000
 
# Start the Node.js app on load
CMD [ "npm", "start" ]