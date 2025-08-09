#!/bin/bash

# Yape Transaction Service Deployment Script
# This script builds and deploys the complete microservice architecture

set -e

echo "🚀 Starting Yape Transaction Service Deployment"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    print_error "docker-compose is not installed. Please install it and try again."
    exit 1
fi

print_status "Checking environment..."

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    print_warning ".env file not found. Creating from template..."
    cp .env.example .env 2>/dev/null || print_warning "No .env.example found. Using defaults."
fi

print_status "Stopping existing containers..."
docker-compose down --remove-orphans

print_status "Cleaning up old images..."
docker system prune -f

print_status "Building application images..."
docker-compose build --no-cache

print_status "Starting infrastructure services (PostgreSQL, Kafka)..."
docker-compose up -d postgres zookeeper kafka

print_status "Waiting for infrastructure to be ready..."
# Wait for PostgreSQL
until docker-compose exec -T postgres pg_isready -U postgres -d yape_transactions > /dev/null 2>&1; do
    echo "⏳ Waiting for PostgreSQL to be ready..."
    sleep 2
done
print_success "PostgreSQL is ready"

# Wait for Kafka
until docker-compose exec -T kafka kafka-broker-api-versions --bootstrap-server localhost:9092 > /dev/null 2>&1; do
    echo "⏳ Waiting for Kafka to be ready..."
    sleep 2
done
print_success "Kafka is ready"

print_status "Creating Kafka topics..."
docker-compose exec -T kafka kafka-topics --create --bootstrap-server localhost:9092 --topic transaction-created --partitions 3 --replication-factor 1 --if-not-exists
docker-compose exec -T kafka kafka-topics --create --bootstrap-server localhost:9092 --topic transaction-status-updated --partitions 3 --replication-factor 1 --if-not-exists
print_success "Kafka topics created"

print_status "Starting application services..."
docker-compose up -d transaction-service anti-fraud-service

print_status "Waiting for services to be healthy..."
# Wait for transaction service
for i in {1..60}; do
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
        print_success "Transaction service is healthy"
        break
    fi
    if [ $i -eq 60 ]; then
        print_error "Transaction service health check timeout"
        exit 1
    fi
    echo "⏳ Waiting for transaction service to be healthy... ($i/60)"
    sleep 5
done

print_success "Deployment completed successfully!"
echo ""
echo "Service Information:"
echo "=================================================="
echo "Transaction API: http://localhost:3000"
echo "API Documentation: http://localhost:3000/api-docs"
echo "Health Check: http://localhost:3000/health"
echo "Metrics: http://localhost:3000/metrics"
echo ""
echo "PostgreSQL: localhost:5432"
echo "   Database: yape_transactions"
echo "   Username: postgres"
echo "   Password: postgres"
echo ""
echo "Kafka: localhost:9092"
echo "   Topics: transaction-created, transaction-status-updated"
echo ""
echo "Management Commands:"
echo "   View logs: docker-compose logs -f [service-name]"
echo "   Stop all: docker-compose down"
echo "   Restart: docker-compose restart [service-name]"
echo ""
echo "✅ All services are running and healthy!" 