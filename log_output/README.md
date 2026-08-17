# Random String Logger

A simple Node.js app that creates a random token on launch, stores it in RAM, and logs it every 5 seconds.

## Local Execution

1. Install dependencies: `npm install`
2. Run the application: `npm start`

## Docker Execution

1. Build image: `docker build -t random-string-logger:latest .`
2. Run container: `docker run --rm random-string-logger:latest`

## Kubernetes Deployment

Apply the manifest: `kubectl apply -f manifest/deployment.yaml`
