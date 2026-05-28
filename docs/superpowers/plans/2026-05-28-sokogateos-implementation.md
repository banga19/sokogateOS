# SokogateOS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the sokogateOS hybrid architecture as an AI operating system for African wholesalers/importers/exporters/procurement managers, featuring API-integrated data ingestion, event-driven core services, unified data & learning layer, role-based presentation layer, and orchestration & automation layer.

**Architecture:** The implementation follows a hybrid microservices architecture with five core layers: (1) API-Integrated Data Ingestion Layer for connecting to company systems and processing artifacts, (2) Event-Driven Core Services for AI intelligence, workflow automation, learning & adaptation, and storage management, (3) Unified Data & Learning Layer combining data lake, warehouse, and vector database for continuous learning, (4) Role-Based Presentation Layer with React/Tailwind interfaces for different user roles, and (5) Orchestration & Automation Layer using workflow engines to automate cross-functional processes.

**Tech Stack:** Node.js/Python microservices, Docker containers, Apache Kafka, MinIO/S3, Snowflake/BigQuery, Pinecone/Weaviate, PostgreSQL, Hugging Face transformers, scikit-learn, TensorFlow/PyTorch, React 18+, Tailwind CSS, Docker-compose/Kubernetes, Prometheus/Grafana, ELK stack, Jaeger.

---

### Phase 1: Foundation Setup

#### Task 1: Initialize Project Structure

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `README.md`
- Create: `docker-compose.yml`
- Create: `docs/superpowers/specs/2026-05-28-sokogateos-validated-design.md` (already exists)

- [ ] **Step 1: Initialize Node.js project**

```bash
npm init -y
```

- [ ] **Step 2: Install core dependencies**

```bash
npm install express mongoose redis kafka-node
```

- [ ] **Step 3: Install development dependencies**

```bash
npm install --save-dev jest nodemon eslint prettier
```

- [ ] **Step 4: Create basic project structure**

```bash
mkdir -p src/{ingestion,services,data,presentation,orchestration,config,utils,tests}
```

- [ ] **Step 5: Configure git and create initial commit**

```bash
git init
git add .
git commit -m "feat: initialize sokogateOS project structure"
```

#### Task 2: Setup Docker Infrastructure

**Files:**
- Create: `Dockerfile`
- Create: `docker-compose.yml`
- Modify: `package.json:1-50`

- [ ] **Step 1: Create Dockerfile for Node.js service**

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
USER node
CMD ["npm", "start"]
```

- [ ] **Step 2: Configure docker-compose.yml for development**

```yaml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env.development
    volumes:
      - ./src:/app/src
      - ./data:/app/data
    depends_on:
      - kafka
      - mongo
      - redis
  
  kafka:
    image: confluentinc/cp-kafka:latest
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
    depends_on:
      - zookeeper
  
  zookeeper:
    image: confluentinc/cp-zookeeper:latest
    ports:
      - "2181:2181"
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
  
  mongo:
    image: mongo:latest
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
  
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"

volumes:
  mongo_data:
```

- [ ] **Step 3: Add scripts to package.json**

```json
{
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "test": "jest",
    "docker:up": "docker-compose up -d",
    "docker:down": "docker-compose down"
  }
}
```

- [ ] **Step 4: Create .env.development template**

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Connections
MONGODB_URI=mongodb://mongo:27017/sokogate
REDIS_URL=redis://redis:6379

# Kafka Configuration
KAFKA_BROKERS=kafka:9092

# API Keys (to be filled in)
HUGGINGFACE_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
```

- [ ] **Step 5: Update .gitignore**

```gitignore
# Dependencies
node_modules/
npm-debug.log*

# Environment variables
.env
.env.*

# Docker
docker-compose.override.yml

# Logs
logs/
*.log

# IDE
.vscode/
.idea/
*.swp

# OS
.DS_Store
Thumbs.db
```

- [ ] **Step 6: Commit docker infrastructure**

```bash
git add Dockerfile docker-compose.yml package.json .env.development .gitignore
git commit -m "feat: setup docker development infrastructure"
```

#### Task 3: Create Basic API Entry Point

**Files:**
- Create: `src/index.js`
- Create: `src/config/database.js`
- Create: `src/config/kafka.js`
- Create: `src/utils/logger.js`
- Modify: `package.json:1-50`

- [ ] **Step 1: Create logger utility**

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

module.exports = logger;
```

- [ ] **Step 2: Create database configuration**

```javascript
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
```

- [ ] **Step 3: Create Kafka configuration**

```javascript
const kafka = require('kafka-node');
const logger = require('../utils/logger');

let producer;
let consumer;

// Initialize Kafka producer
const initKafkaProducer = () => {
  return new Promise((resolve, reject) => {
    producer = new kafka.Producer(new kafka.KafkaClient({ kafkaHost: process.env.KAFKA_BROKERS }));
    
    producer.on('ready', () => {
      logger.info('Kafka Producer connected');
      resolve(producer);
    });
    
    producer.on('error', (err) => {
      logger.error('Kafka Producer error:', err);
      reject(err);
    });
  });
};

// Initialize Kafka consumer
const initKafkaConsumer = (topics) => {
  return new Promise((resolve, reject) => {
    client = new kafka.KafkaClient({ kafkaHost: process.env.KAFKA_BROKERS });
    consumer = new kafka.Consumer(client, topics.map(topic => ({ topic, partition: 0 })), {
      autoCommit: false
    });
    
    consumer.on('message', (message) => {
      logger.info(`Received message from ${message.topic}: ${message.value}`);
      // Message handling will be implemented in service layers
    });
    
    consumer.on('error', (err) => {
      logger.error('Kafka Consumer error:', err);
      reject(err);
    });
    
    resolve(consumer);
  });
};

module.exports = { initKafkaProducer, initKafkaConsumer };
```

- [ ] **Step 4: Create basic Express server**

```javascript
const express = require('express');
const connectDB = require('./config/database');
const { initKafkaProducer, initKafkaConsumer } = require('./config/kafka');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Basic health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Initialize services
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Initialize Kafka
    await initKafkaProducer();
    await initKafkaConsumer([
      'product.updated',
      'order.created', 
      'inventory.changed',
      'supplier.risk.updated',
      'customer.feedback.received'
    ]);
    
    // Start server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
```

- [ ] **Step 5: Commit API entry point**

```bash
git add src/
git commit -m "feat: create basic API entry point with database and kafka configuration"
```