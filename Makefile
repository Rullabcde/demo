.DEFAULT_GOAL := help

# Var
DC = docker compose
HEALTH_CHECK_URL = http://127.0.0.1
HEALTH_CHECK_TIMEOUT = 120

.PHONY: up down logs wait-for-health deploy clean help

up: ## Start containers
	$(DC) up -d

down: ## Stop containers
	$(DC) down

logs: ## Show logs
	$(DC) logs -f

wait-for-health:
	@echo "Waiting for $(SERVICE) on port $(PORT) to be healthy..."
	@timeout=$(HEALTH_CHECK_TIMEOUT); \
	while [ $$timeout -gt 0 ]; do \
		if curl -f -s $(HEALTH_CHECK_URL):$(PORT)/api/health >/dev/null 2>&1; then \
			echo "$(SERVICE) is healthy!"; \
			sleep 5; \
			break; \
		fi; \
		echo "$(SERVICE) not ready yet, waiting... ($$timeout seconds left)"; \
		sleep 3; \
		timeout=$$((timeout-3)); \
	done; \
	if [ $$timeout -le 0 ]; then \
		echo "$(SERVICE) failed to become healthy within $(HEALTH_CHECK_TIMEOUT) seconds"; \
		exit 1; \
	fi

deploy: ## Deploy with true zero downtime
	${DC} pull
	${DC} up -d database migrator

	@echo "Deploying app-1..."
	@docker compose --profile deploy up -d app-1-new
	@$(MAKE) wait-for-health SERVICE=app-1-new PORT=3002
	${DC} stop app-1 --timeout=30
	${DC} rm -f app-1
	@sleep 5
	@$(MAKE) up app-1
	@$(MAKE) wait-for-health SERVICE=app-1 PORT=3000
	${DC} --profile deploy stop app-1-new --timeout=10
	${DC} --profile deploy rm -f app-1-new


	@echo "Deploying app-2..."
	@docker compose --profile deploy up -d app-2-new
	@$(MAKE) wait-for-health SERVICE=app-2-new PORT=3003
	${DC} stop app-2 --timeout=30
	${DC} rm -f app-2
	@sleep 5
	@$(MAKE) up app-2
	@$(MAKE) wait-for-health SERVICE=app-2 PORT=3001
	${DC} --profile deploy stop app-2-new --timeout=10
	${DC} --profile deploy rm -f app-2-new

	@echo "Deployment complete"

clean: ## Remove all stopped containers, unused networks, images, and build cache
	docker system prune -a -f

help: ## Show available commands
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'