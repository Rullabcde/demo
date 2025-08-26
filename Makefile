.DEFAULT_GOAL := help

# Var
DOCKER_COMPOSE = docker compose

.PHONY: up down logs build pull restart help

up: ## Start containers
	$(DOCKER_COMPOSE) up -d

down: ## Stop containers and remove volumes
	$(DOCKER_COMPOSE) down -v

logs: ## Show logs
	$(DOCKER_COMPOSE) logs -f

build: ## Rebuild images without cache
	$(DOCKER_COMPOSE) build --no-cache

pull: ## Pull latest images
	$(DOCKER_COMPOSE) pull

clean: ## Remove all stopped containers, unused networks, images, and build cache
	$(DOCKER_COMPOSE) system prune -f

restart: down up ## Restart containers

help: ## Show available commands
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'
