.DEFAULT_GOAL := help

# Var
DOCKER_COMPOSE = docker compose

.PHONY: up down logs deploy clean restart help

up: ## Start containers
	$(DOCKER_COMPOSE) up -d

down: ## Stop containers and remove volumes
	$(DOCKER_COMPOSE) down -v

logs: ## Show logs
	$(DOCKER_COMPOSE) logs -f

deploy: ## Deploy with zero downtime
	@echo "Starting deployment..."
	${DOCKER_COMPOSE} pull
	${DOCKER_COMPOSE} up -d database migrator

	@echo "Deploying app-1..."
	${DOCKER_COMPOSE} stop app-1 && ${DOCKER_COMPOSE} rm -f app-1
	${DOCKER_COMPOSE} up -d app-1
	@sleep 30

	@echo "Deploying app-2..."
	${DOCKER_COMPOSE} stop app-2 && ${DOCKER_COMPOSE} rm -f app-2
	${DOCKER_COMPOSE} up -d app-2
	@sleep 30

	@echo "Deploying app-3..."
	${DOCKER_COMPOSE} stop app-3 && ${DOCKER_COMPOSE} rm -f app-3
	${DOCKER_COMPOSE} up -d app-3
	@sleep 30

	@echo "Deployment complete!"

clean: ## Remove all stopped containers, unused networks, images, and build cache
	docker system prune -f

restart: down up ## Restart containers

help: ## Show available commands
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'
